import DependencyBuilder from './DependencyBuilder'
import { DiffErrorCode } from '../../schema'
import { Stage } from '../dtos/Stage'
import { AnyEvent } from '@contember/engine-common'
import { QueryHandler } from '@contember/queryable'
import { DiffCountQuery, DiffQuery } from '../queries'
import { DatabaseQueryable } from '@contember/database'
import { EventsPermissionsVerifier } from './EventsPermissionsVerifier'
import { assertEveryIsContentEvent } from './eventUtils'
import { SchemaVersionBuilder } from '../../SchemaVersionBuilder'

class DiffBuilder {
	constructor(
		private readonly dependencyBuilder: DependencyBuilder,
		private readonly queryHandler: QueryHandler<DatabaseQueryable>,
		private readonly permissionsVerifier: EventsPermissionsVerifier,
		private readonly schemaVersionBuilder: SchemaVersionBuilder,
	) {}

	public async build(
		permissionContext: EventsPermissionsVerifier.Context,
		baseStage: Stage,
		headStage: Stage,
	): Promise<DiffBuilder.Response> {
		const count = await this.queryHandler.fetch(new DiffCountQuery(baseStage.event_id, headStage.event_id))

		if (count.ok === false) {
			return count
		}

		if (count.diff === 0) {
			return {
				ok: true,
				events: [],
			}
		}

		const events = await this.queryHandler.fetch(new DiffQuery(baseStage.event_id, headStage.event_id))
		assertEveryIsContentEvent(events)
		const schema = await this.schemaVersionBuilder.buildSchema()
		const dependencies = await this.dependencyBuilder.build(schema, events)
		const permissions = await this.permissionsVerifier.verify(permissionContext, headStage, baseStage, events)

		return {
			ok: true,
			events: events.map(event => ({
				...event,
				permission: permissions[event.id],
				dependencies: dependencies[event.id] || [],
			})),
		}
	}
}

namespace DiffBuilder {
	export type Response = OkResponse | ErrorResponse

	export class ErrorResponse {
		public readonly ok: false = false

		constructor(public readonly errors: DiffErrorCode[]) {}
	}

	export class OkResponse {
		public readonly ok: true = true

		constructor(
			public readonly events: (AnyEvent & {
				dependencies: string[]
				permission: EventsPermissionsVerifier.EventPermission
			})[],
		) {}
	}
}

export default DiffBuilder
