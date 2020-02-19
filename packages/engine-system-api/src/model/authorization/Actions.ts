import { Authorizator } from '@contember/authorization'

namespace Actions {
	export enum Resources {
		project = 'project',
	}

	export const PROJECT_RELEASE_ANY = Authorizator.createAction(Resources.project, 'releaseAny')
	export const PROJECT_REBASE_ALL = Authorizator.createAction(Resources.project, 'rebaseAll')
}

export default Actions
