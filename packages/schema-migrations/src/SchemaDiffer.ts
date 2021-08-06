import { Schema } from '@contember/schema'
import { deepCompare, SchemaValidator, ValidationError } from '@contember/schema-utils'
import { SchemaMigrator } from './SchemaMigrator'
import { Migration } from './Migration'
import deepEqual from 'fast-deep-equal'
import { ImplementationException } from './exceptions'
import { VERSION_LATEST } from './modifications/ModificationVersions'
import { CreateUniqueConstraintModification, RemoveUniqueConstraintModification } from './modifications/constraints'
import { RemoveFieldModification } from './modifications/fields'
import {
	CreateEntityModification,
	RemoveEntityModification,
	UpdateEntityTableNameModification,
	UpdateViewModification,
} from './modifications/entities'
import { CreateEnumModification, RemoveEnumModification, UpdateEnumModification } from './modifications/enums'
import {
	CreateColumnModification,
	UpdateColumnDefinitionModification,
	UpdateColumnNameModification,
} from './modifications/columns'
import {
	CreateRelationInverseSideModification,
	CreateRelationModification,
	DisableOrphanRemovalModification,
	EnableOrphanRemovalModification,
	MakeRelationNotNullModification,
	MakeRelationNullableModification,
	UpdateRelationOnDeleteModification,
	UpdateRelationOrderByModification,
} from './modifications/relations'
import { PatchAclSchemaModification, UpdateAclSchemaModification } from './modifications/acl'
import { PatchValidationSchemaModification, UpdateValidationSchemaModification } from './modifications/validation'
import { CreateDiff } from './modifications/ModificationHandler'
import { isDefined } from './utils/isDefined'
import { ChangeViewNonViewDiffer, RemoveChangedFieldDiffer } from './modifications/differs'

export class SchemaDiffer {
	constructor(private readonly schemaMigrator: SchemaMigrator) {}

	diffSchemas(originalSchema: Schema, updatedSchema: Schema, checkRecreate: boolean = true): Migration.Modification[] {
		const originalErrors = SchemaValidator.validate(originalSchema)
		if (originalErrors.length > 0) {
			throw new InvalidSchemaException('original schema is not valid', originalErrors)
		}
		const updatedErrors = SchemaValidator.validate(updatedSchema)
		if (updatedErrors.length > 0) {
			throw new InvalidSchemaException('updated schema is not valid', updatedErrors)
		}

		const differs: CreateDiff[] = [
			RemoveUniqueConstraintModification.createDiff,
			RemoveEntityModification.createDiff,
			RemoveFieldModification.createDiff,
			CreateEnumModification.createDiff,

			UpdateViewModification.createDiff,
			UpdateEntityTableNameModification.createDiff,
			UpdateColumnDefinitionModification.createDiff,
			UpdateColumnNameModification.createDiff,
			UpdateRelationOnDeleteModification.createDiff,
			MakeRelationNotNullModification.createDiff,
			MakeRelationNullableModification.createDiff,
			EnableOrphanRemovalModification.createDiff,
			DisableOrphanRemovalModification.createDiff,
			UpdateRelationOrderByModification.createDiff,
			UpdateEnumModification.createDiff,

			new RemoveChangedFieldDiffer().createDiff,
			new ChangeViewNonViewDiffer().createDiff,
			CreateEntityModification.createDiff,
			CreateColumnModification.createDiff,
			CreateRelationModification.createDiff,
			CreateRelationInverseSideModification.createDiff,

			CreateUniqueConstraintModification.createDiff,

			RemoveEnumModification.createDiff,

			UpdateAclSchemaModification.createDiff,
			PatchAclSchemaModification.createDiff,

			UpdateValidationSchemaModification.createDiff,
			PatchValidationSchemaModification.createDiff,
		].filter(isDefined)

		const diffs: Migration.Modification[] = []
		let appliedDiffsSchema = originalSchema
		for (const differ of differs) {
			const differDiffs = differ(appliedDiffsSchema, updatedSchema)
			appliedDiffsSchema = this.schemaMigrator.applyModifications(appliedDiffsSchema, differDiffs, VERSION_LATEST)
			diffs.push(...differDiffs)
		}

		if (checkRecreate && !deepEqual(updatedSchema, appliedDiffsSchema)) {
			const errors = deepCompare(updatedSchema, appliedDiffsSchema, [])
			let message = 'Updated schema cannot be recreated by the generated diff:'
			for (const err of errors) {
				message += '\n\t' + err.path.join('.') + ': ' + err.message
			}
			message += '\n\nPlease fill a bug report'
			throw new ImplementationException(message)
		}

		return diffs
	}
}

export class InvalidSchemaException extends Error {
	constructor(message: string, public readonly validationErrors: ValidationError[]) {
		super(message)
	}
}
