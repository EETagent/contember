import { Identity } from '@contember/engine-common'
import { PermissionContext } from '../model/authorization'

export interface ResolverContext {
	readonly apiKeyId: string
	readonly permissionContext: PermissionContext
	readonly identity: Identity
	readonly isAllowed: PermissionContext['isAllowed']
	readonly requireAccess: PermissionContext['requireAccess']
}
