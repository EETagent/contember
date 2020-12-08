import { CrudQueryBuilder, GraphQlBuilder } from '@contember/client'
import { ClientGeneratedUuid, ServerGeneratedUuid } from '../accessorTree'
import { BindingError } from '../BindingError'
import { PRIMARY_KEY_NAME, TYPENAME_KEY_NAME } from '../bindingTypes'
import {
	FieldMarker,
	HasManyRelationMarker,
	HasOneRelationMarker,
	SubTreeMarker,
	SubTreeMarkerParameters,
} from '../markers'
import { assertNever, isEmptyObject } from '../utils'
import { AliasTransformer } from './AliasTransformer'
import { EntityListState, EntityState, EntityStateStub, FieldState, RootStateNode, StateType } from './state'
import { TreeStore } from './TreeStore'

type QueryBuilder = Omit<CrudQueryBuilder.CrudQueryBuilder, CrudQueryBuilder.Queries>

type ProcessedEntities = Set<EntityState | EntityStateStub>

// TODO enforce correct expected mutations in dev mode.
export class MutationGenerator {
	public constructor(private readonly treeStore: TreeStore) {}

	public getPersistMutation(): string | undefined {
		try {
			let builder: QueryBuilder = new CrudQueryBuilder.CrudQueryBuilder()
			const processedEntities: ProcessedEntities = new Set()

			for (const [placeholderName, subTreeMarker] of this.treeStore.markerTree.subTrees) {
				builder = this.addSubMutation(
					processedEntities,
					this.treeStore.subTreeStates.get(placeholderName)!,
					placeholderName,
					subTreeMarker.parameters,
					builder,
				)
			}
			return builder.getGql()
		} catch (e) {
			return undefined
		}
	}

	private addSubMutation(
		processedEntities: ProcessedEntities,
		rootState: RootStateNode | EntityStateStub,
		alias: string,
		parameters: SubTreeMarkerParameters,
		queryBuilder: QueryBuilder,
	): QueryBuilder {
		if (rootState.type === StateType.Entity) {
			if (rootState.isScheduledForDeletion) {
				queryBuilder = this.addDeleteMutation(processedEntities, rootState, alias, parameters, queryBuilder)
			} else if (!rootState.id.existsOnServer) {
				queryBuilder = this.addCreateMutation(processedEntities, rootState, alias, parameters, queryBuilder)
			} else {
				queryBuilder = this.addUpdateMutation(processedEntities, rootState, alias, parameters, queryBuilder)
			}
		} else if (rootState.type === StateType.EntityList) {
			for (const [, childState] of rootState.children) {
				queryBuilder = this.addSubMutation(
					processedEntities,
					childState,
					AliasTransformer.joinAliasSections(alias, AliasTransformer.entityToAlias(childState.id)),
					parameters,
					queryBuilder,
				)
			}
			if (rootState.plannedRemovals) {
				for (const [removedEntity, removalType] of rootState.plannedRemovals) {
					if (removalType === 'delete') {
						queryBuilder = this.addDeleteMutation(
							processedEntities,
							removedEntity,
							AliasTransformer.joinAliasSections(alias, AliasTransformer.entityToAlias(removedEntity.id)),
							parameters,
							queryBuilder,
						)
					} else if (removalType === 'disconnect') {
						throw new BindingError(`EntityList: cannot disconnect top-level entities.`)
					}
				}
			}
		} else if (rootState.type === StateType.EntityStub) {
			// Do nothing. For now.
			// TODO there can be a forceCreate somewhere in there that we're hereby ignoring.
		} else {
			assertNever(rootState)
		}

		return queryBuilder
	}

	private addDeleteMutation(
		processedEntities: ProcessedEntities,
		entityState: EntityState | EntityStateStub,
		alias: string,
		parameters: SubTreeMarkerParameters,
		queryBuilder: QueryBuilder = new CrudQueryBuilder.CrudQueryBuilder(),
	): QueryBuilder {
		if (processedEntities.has(entityState)) {
			return queryBuilder
		}
		processedEntities.add(entityState)

		return queryBuilder.delete(
			parameters.value.entityName,
			builder => {
				let where = {}
				if (parameters && parameters.type === 'qualifiedSingleEntity') {
					where = parameters.value.where
				}

				return builder
					.ok()
					.node(builder => builder.column(PRIMARY_KEY_NAME))
					.by({ ...where, [PRIMARY_KEY_NAME]: entityState.id.value })
					.errors()
					.errorMessage()
			},
			alias,
		)
	}

	private addUpdateMutation(
		processedEntities: ProcessedEntities,
		entityState: EntityState,
		alias: string,
		parameters: SubTreeMarkerParameters,
		queryBuilder: QueryBuilder = new CrudQueryBuilder.CrudQueryBuilder(),
	): QueryBuilder {
		if (processedEntities.has(entityState)) {
			return queryBuilder
		}
		// Deliberately not adding the entity to processedEntities - it will be done by registerUpdateMutationPart.

		const runtimeId = entityState.id

		if (!runtimeId.existsOnServer) {
			return queryBuilder
		}

		return queryBuilder.update(
			parameters.value.entityName,
			builder => {
				let where = {}
				if (parameters && parameters.type === 'qualifiedSingleEntity') {
					where = parameters.value.where
				}

				return builder
					.data(builder => this.registerUpdateMutationPart(processedEntities, entityState, builder))
					.by({ ...where, [PRIMARY_KEY_NAME]: runtimeId.value })
					.node(builder => builder.column(PRIMARY_KEY_NAME))
					.ok()
					.validation()
					.errors()
					.errorMessage()
			},
			alias,
		)
	}

	private addCreateMutation(
		processedEntities: ProcessedEntities,
		entityState: EntityState,
		alias: string,
		parameters: SubTreeMarkerParameters,
		queryBuilder: QueryBuilder = new CrudQueryBuilder.CrudQueryBuilder(),
	): QueryBuilder {
		if (processedEntities.has(entityState)) {
			return queryBuilder
		}
		// Deliberately not adding the entity to processedEntities - it will be done by registerCreateMutationPart.

		return queryBuilder.create(
			parameters.value.entityName,
			builder => {
				let writeBuilder = this.registerCreateMutationPart(
					processedEntities,
					entityState,
					new CrudQueryBuilder.WriteDataBuilder(),
				)
				if (
					parameters &&
					parameters.type === 'qualifiedSingleEntity' &&
					writeBuilder.data !== undefined &&
					!isEmptyObject(writeBuilder.data)
				) {
					// Shallow cloning the parameters like this IS too naïve but it will likely last surprisingly long before we
					// run into issues.
					writeBuilder = new CrudQueryBuilder.WriteDataBuilder({ ...writeBuilder.data, ...parameters.value.where })
				}

				return builder
					.data(writeBuilder)
					.node(builder => builder.column(PRIMARY_KEY_NAME))
					.ok()
					.validation()
					.errors()
					.errorMessage()
			},
			alias,
		)
	}

	private registerCreateMutationPart(
		processedEntities: ProcessedEntities,
		currentState: EntityState | EntityStateStub,
		builder: CrudQueryBuilder.WriteDataBuilder<
			CrudQueryBuilder.WriteOperation.Create
		> = new CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Create>(),
	): CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Create> {
		if (processedEntities.has(currentState)) {
			return builder
		}
		processedEntities.add(currentState)

		if (currentState.type === StateType.EntityStub) {
			// TODO If there's a forceCreate, this is wrong.
			return builder
		}

		// It shouldn't
		const nonbearingFields: Array<
			| { type: 'field'; marker: FieldMarker; fieldState: FieldState }
			| { type: 'hasOne'; marker: HasOneRelationMarker; fieldState: EntityState }
			| { type: 'hasMany'; marker: HasManyRelationMarker; fieldState: EntityListState }
		> = []

		for (const [placeholderName, marker] of currentState.combinedMarkersContainer.markers) {
			if (
				placeholderName === TYPENAME_KEY_NAME ||
				(placeholderName === PRIMARY_KEY_NAME && !(currentState.id instanceof ClientGeneratedUuid))
			) {
				continue
			}
			const fieldState = currentState.children.get(placeholderName)

			if (fieldState === undefined) {
				continue
			}

			if (marker instanceof FieldMarker) {
				if (fieldState.type !== StateType.Field) {
					continue
				}
				if (marker.isNonbearing) {
					nonbearingFields.push({
						type: 'field',
						marker,
						fieldState,
					})
					continue
				}
				builder = this.registerCreateFieldPart(fieldState, marker, builder)
			} else if (marker instanceof HasOneRelationMarker) {
				if (fieldState.type !== StateType.Entity) {
					continue
				}
				if (marker.relation.isNonbearing) {
					nonbearingFields.push({
						type: 'hasOne',
						marker,
						fieldState,
					})
					continue
				}
				builder = this.registerCreateEntityPart(processedEntities, fieldState, marker, builder)
			} else if (marker instanceof HasManyRelationMarker) {
				if (fieldState.type !== StateType.EntityList) {
					continue
				}
				if (marker.relation.isNonbearing) {
					nonbearingFields.push({
						type: 'hasMany',
						marker,
						fieldState,
					})
					continue
				}
				builder = this.registerCreateEntityListPart(processedEntities, fieldState, marker, builder)
			} else if (marker instanceof SubTreeMarker) {
				// All sub trees have been hoisted and are handled elsewhere.
			} else {
				assertNever(marker)
			}
		}

		if (
			currentState.combinedCreationParameters.forceCreation &&
			(builder.data === undefined || isEmptyObject(builder.data))
		) {
			builder = builder.set('_dummy_field_', true)
		}

		if (
			(builder.data !== undefined && !isEmptyObject(builder.data)) ||
			!currentState.combinedMarkersContainer.hasAtLeastOneBearingField
		) {
			for (const field of nonbearingFields) {
				switch (field.type) {
					case 'field': {
						builder = this.registerCreateFieldPart(field.fieldState, field.marker, builder)
						break
					}
					case 'hasOne': {
						builder = this.registerCreateEntityPart(processedEntities, field.fieldState, field.marker, builder)
						break
					}
					case 'hasMany': {
						builder = this.registerCreateEntityListPart(processedEntities, field.fieldState, field.marker, builder)
						break
					}
					default:
						assertNever(field)
				}
			}
		}

		const setOnCreate = currentState.combinedCreationParameters.setOnCreate
		if (setOnCreate && builder.data !== undefined && !isEmptyObject(builder.data)) {
			for (const key in setOnCreate) {
				const field = setOnCreate[key]

				if (
					typeof field === 'string' ||
					typeof field === 'number' ||
					field === null ||
					field instanceof GraphQlBuilder.Literal
				) {
					builder = builder.set(key, field)
				} else {
					builder = builder.one(key, builder => builder.connect(field))
				}
			}
		}

		return builder
	}

	private registerCreateFieldPart(
		fieldState: FieldState,
		marker: FieldMarker,
		builder: CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Create>,
	) {
		const resolvedValue = fieldState.getAccessor().resolvedValue

		if (resolvedValue !== undefined && resolvedValue !== null) {
			return builder.set(marker.fieldName, resolvedValue)
		}
		return builder
	}

	private registerCreateEntityPart(
		processedEntities: ProcessedEntities,
		fieldState: EntityState,
		marker: HasOneRelationMarker,
		builder: CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Create>,
	) {
		const reducedBy = marker.relation.reducedBy

		if (reducedBy === undefined) {
			return builder.one(marker.relation.field, builder => {
				if (fieldState.id.existsOnServer) {
					// TODO also potentially update
					return builder.connect({ [PRIMARY_KEY_NAME]: fieldState.id.value })
				}
				return builder.create(this.registerCreateMutationPart(processedEntities, fieldState))
			})
		}
		return builder.many(marker.relation.field, builder => {
			const alias = AliasTransformer.entityToAlias(fieldState.id)
			if (fieldState.id.existsOnServer) {
				// TODO also potentially update
				return builder.connect({ [PRIMARY_KEY_NAME]: fieldState.id.value }, alias)
			}
			return builder.create(this.registerCreateMutationPart(processedEntities, fieldState), alias)
		})
	}

	private registerCreateEntityListPart(
		processedEntities: ProcessedEntities,
		fieldState: EntityListState,
		marker: HasManyRelationMarker,
		builder: CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Create>,
	) {
		return builder.many(marker.relation.field, builder => {
			for (const [, entityState] of fieldState.children) {
				const alias = AliasTransformer.entityToAlias(entityState.id)
				if (entityState.id.existsOnServer) {
					// TODO also potentially update
					builder = builder.connect({ [PRIMARY_KEY_NAME]: entityState.id.value }, alias)
				} else {
					builder = builder.create(this.registerCreateMutationPart(processedEntities, entityState), alias)
				}
			}
			return builder
		})
	}

	private registerUpdateMutationPart(
		processedEntities: ProcessedEntities,
		currentState: EntityState,
		builder: CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Update>,
	): CrudQueryBuilder.WriteDataBuilder<CrudQueryBuilder.WriteOperation.Update> {
		if (processedEntities.has(currentState)) {
			return builder
		}
		processedEntities.add(currentState)

		for (const [placeholderName, marker] of currentState.combinedMarkersContainer.markers) {
			if (placeholderName === PRIMARY_KEY_NAME || placeholderName === TYPENAME_KEY_NAME) {
				continue
			}
			const fieldState = currentState.children.get(placeholderName)

			if (fieldState === undefined) {
				continue
			}

			if (marker instanceof FieldMarker) {
				if (fieldState.type !== StateType.Field) {
					continue
				}
				if (fieldState.persistedValue !== undefined) {
					const resolvedValue = fieldState.getAccessor().resolvedValue
					if (fieldState.persistedValue !== resolvedValue) {
						builder = builder.set(placeholderName, resolvedValue)
					}
				}
			} else if (marker instanceof HasOneRelationMarker) {
				if (fieldState.type !== StateType.Entity) {
					continue
				}

				const reducedBy = marker.relation.reducedBy
				if (reducedBy === undefined) {
					const subBuilder = ((
						builder: CrudQueryBuilder.WriteOneRelationBuilder<CrudQueryBuilder.WriteOperation.Update>,
					) => {
						const persistedValue = currentState.persistedData?.get?.(placeholderName)

						if (persistedValue instanceof ServerGeneratedUuid) {
							if (persistedValue.value === fieldState.id.value) {
								// The persisted and currently referenced ids match, and so this is an update.
								return builder.update(builder =>
									this.registerUpdateMutationPart(processedEntities, fieldState, builder),
								)
							}
							// There was a referenced entity but currently, there is a different one. Let's investigate:

							const plannedDeletion = currentState.plannedHasOneDeletions?.get(placeholderName)
							if (plannedDeletion !== undefined) {
								// It's planned for deletion.
								// TODO also potentially do something about the current entity
								return builder.delete()
							}
							if (fieldState.id.existsOnServer) {
								// This isn't the persisted entity but it does exist on the server. Thus this is a connect.
								// TODO also potentially update
								return builder.connect({
									[PRIMARY_KEY_NAME]: fieldState.id.value,
								})
							}
							// The currently present entity doesn't exist on the server. Try if creating yields anything…
							const subBuilder = builder.create(this.registerCreateMutationPart(processedEntities, fieldState))
							if (isEmptyObject(subBuilder.data)) {
								// …and if it doesn't, we just disconnect.
								return builder.disconnect()
							}
							// …but if it does, we return the create, disconnecting implicitly.
							return subBuilder
						} else if (fieldState.id.existsOnServer) {
							// There isn't a linked entity on the server but we're seeing one that exists there.
							// Thus this is a connect.
							// TODO also potentially update
							return builder.connect({
								[PRIMARY_KEY_NAME]: fieldState.id.value,
							})
						} else {
							return builder.create(this.registerCreateMutationPart(processedEntities, fieldState))
						}
					})(CrudQueryBuilder.WriteOneRelationBuilder.instantiate<CrudQueryBuilder.WriteOperation.Update>())

					if (subBuilder.data) {
						builder = builder.one(marker.relation.field, subBuilder)
					}
				} else {
					// This is a reduced has many relation.
					builder = builder.many(marker.relation.field, builder => {
						const persistedValue = currentState.persistedData?.get?.(placeholderName)
						const alias = AliasTransformer.entityToAlias(fieldState.id)

						if (persistedValue instanceof ServerGeneratedUuid) {
							if (persistedValue.value === fieldState.id.value) {
								return builder.update(
									reducedBy,
									builder => this.registerUpdateMutationPart(processedEntities, fieldState, builder),
									alias,
								)
							}
							const plannedDeletion = currentState.plannedHasOneDeletions?.get(placeholderName)
							if (plannedDeletion !== undefined) {
								// TODO also potentially do something about the current entity
								return builder.delete(reducedBy, alias)
							}
							if (fieldState.id.existsOnServer) {
								// TODO will re-using the alias like this work?
								// TODO also potentially update
								return builder.disconnect(reducedBy, alias).connect({ [PRIMARY_KEY_NAME]: fieldState.id.value }, alias)
							}
							const subBuilder = builder.create(this.registerCreateMutationPart(processedEntities, fieldState))
							if (isEmptyObject(subBuilder.data)) {
								return builder.disconnect(reducedBy, alias)
							}
							return subBuilder
						} else if (fieldState.id.existsOnServer) {
							return builder.connect({ [PRIMARY_KEY_NAME]: fieldState.id.value }, alias)
						} else {
							return builder.create(this.registerCreateMutationPart(processedEntities, fieldState))
						}
					})
				}
			} else if (marker instanceof HasManyRelationMarker) {
				if (fieldState.type !== StateType.EntityList) {
					continue
				}
				builder = builder.many(marker.relation.field, builder => {
					for (const [, childEntityState] of fieldState.children) {
						const alias = AliasTransformer.entityToAlias(childEntityState.id)

						if (childEntityState.id.existsOnServer) {
							if (fieldState.persistedEntityIds.has(childEntityState.id.value)) {
								if (childEntityState.type !== StateType.EntityStub) {
									// A stub cannot have any pending changes.
									builder = builder.update(
										{ [PRIMARY_KEY_NAME]: childEntityState.id.value },
										builder => this.registerUpdateMutationPart(processedEntities, childEntityState, builder),
										alias,
									)
								}
							} else {
								// TODO also potentially update
								builder = builder.connect({ [PRIMARY_KEY_NAME]: childEntityState.id.value }, alias)
							}
						} else {
							builder = builder.create(this.registerCreateMutationPart(processedEntities, childEntityState), alias)
						}
					}
					if (fieldState.plannedRemovals) {
						for (const [entityToRemove, removalType] of fieldState.plannedRemovals) {
							const alias = AliasTransformer.entityToAlias(entityToRemove.id)
							if (removalType === 'delete') {
								builder = builder.delete({ [PRIMARY_KEY_NAME]: entityToRemove.id.value }, alias)
							} else if (removalType === 'disconnect') {
								// TODO also potentially update
								builder = builder.disconnect({ [PRIMARY_KEY_NAME]: entityToRemove.id.value }, alias)
							} else {
								assertNever(removalType)
							}
						}
					}
					return builder
				})
			} else if (marker instanceof SubTreeMarker) {
				// Do nothing: all sub trees have been hoisted and are handled elsewhere.
			} else {
				assertNever(marker)
			}
		}

		return builder
	}
}
