import { MigrationBuilder } from '@contember/database-migrations'
import { Model, Schema } from '@contember/schema'
import { ContentEvent } from '@contember/engine-common'
import {
	SchemaUpdater,
	updateAcl,
	updateAclEntities,
	updateAclEveryRole,
	updateEntity,
	updateEveryEntity,
	updateEveryField,
	updateModel,
	updateSchema,
} from '../utils/schemaUpdateUtils'
import { ModificationHandler, ModificationHandlerStatic } from '../ModificationHandler'
import { isIt } from '../../utils/isIt'
import { VERSION_ACL_PATCH, VERSION_UPDATE_CONSTRAINT_NAME } from '../ModificationVersions'
import { NamingHelper } from '@contember/schema-utils'
import { UpdateEntityTableNameModification } from './UpdateEntityTableNameModification'
import { NoopModification } from '../NoopModification'
import { renameConstraintSchemaUpdater, renameConstraintsSqlBuilder } from '../utils/renameConstraintsHelper'
import { changeValue } from '../utils/valueUtils'

export const UpdateEntityNameModification: ModificationHandlerStatic<UpdateEntityNameModificationData> = class {
	static id = 'updateEntityName'
	private subModification: ModificationHandler<any>

	constructor(
		private readonly data: UpdateEntityNameModificationData,
		private readonly schema: Schema,
		private readonly formatVersion: number,
	) {
		this.subModification = data.tableName
			? new UpdateEntityTableNameModification(
					{ entityName: data.entityName, tableName: data.tableName },
					schema,
					this.formatVersion,
			  )
			: new NoopModification()
	}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.schema.model.entities[this.data.entityName]
		if (!entity.view && this.formatVersion >= VERSION_UPDATE_CONSTRAINT_NAME) {
			renameConstraintsSqlBuilder(builder, entity, this.getNewConstraintName.bind(this))
		}
		this.subModification.createSql(builder)
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateSchema(
			this.subModification.getSchemaUpdater(),
			updateModel(
				updateEveryEntity(
					updateEveryField(({ field }) => {
						if (isIt<Model.AnyRelation>(field, 'target') && field.target === this.data.entityName) {
							return { ...field, target: this.data.newEntityName }
						}
						return field
					}),
				),
				this.formatVersion >= VERSION_UPDATE_CONSTRAINT_NAME
					? updateEntity(this.data.entityName, renameConstraintSchemaUpdater(this.getNewConstraintName.bind(this)))
					: undefined,
				({ model }) => {
					const { [this.data.entityName]: renamed, ...entities } = model.entities
					const newEntities = {
						...entities,
						[this.data.newEntityName]: {
							...renamed,
							name: this.data.newEntityName,
						},
					}
					return {
						...model,
						entities: newEntities,
					}
				},
			),
			this.formatVersion >= VERSION_ACL_PATCH
				? updateAcl(
						updateAclEveryRole(
							({ role }) => ({
								...role,
								variables: Object.fromEntries(
									Object.entries(role.variables).map(([key, variable]) => [
										key,
										{
											...variable,
											entityName: changeValue(this.data.entityName, this.data.newEntityName)(variable.entityName),
										},
									]),
								),
							}),
							updateAclEntities(({ entities }) => {
								if (!entities[this.data.entityName]) {
									return entities
								}
								const { [this.data.entityName]: renamed, ...other } = entities
								return {
									[this.data.newEntityName]: renamed,
									...other,
								}
							}),
						),
				  )
				: undefined,
		)
	}

	public async transformEvents(events: ContentEvent[]): Promise<ContentEvent[]> {
		events = await this.subModification.transformEvents(events)
		return events
	}

	private getNewConstraintName(constraint: Model.UniqueConstraint): string | null {
		const generatedName = NamingHelper.createUniqueConstraintName(this.data.entityName, constraint.fields)
		const isGenerated = constraint.name === generatedName
		if (!isGenerated) {
			null
		}
		return NamingHelper.createUniqueConstraintName(this.data.newEntityName, constraint.fields)
	}

	describe() {
		return { message: `Change entity name from ${this.data.entityName} to ${this.data.newEntityName}` }
	}

	static createModification(data: UpdateEntityNameModificationData) {
		return { modification: this.id, ...data }
	}
}

export interface UpdateEntityNameModificationData {
	entityName: string
	newEntityName: string
	tableName?: string
}
