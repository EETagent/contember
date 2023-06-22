import {
	DisableApiKeyErrorCode,
	DisableApiKeyResponse,
	MutationDisableApiKeyArgs,
	MutationResolvers,
} from '../../../schema'
import { GraphQLResolveInfo } from 'graphql'
import { TenantResolverContext } from '../../TenantResolverContext'
import { PermissionActions, ApiKeyManager } from '../../../model'
import { createErrorResponse } from '../../errorUtils'

export class DisableApiKeyMutationResolver implements MutationResolvers {
	constructor(private readonly apiKeyManager: ApiKeyManager) {}

	async disableApiKey(
		parent: any,
		{ id }: MutationDisableApiKeyArgs,
		context: TenantResolverContext,
		info: GraphQLResolveInfo,
	): Promise<DisableApiKeyResponse> {
		await context.requireAccess({
			action: PermissionActions.API_KEY_DISABLE,
			message: 'You are not allowed to disable api key',
		})

		const result = await this.apiKeyManager.disableApiKey(context.db, id)

		if (!result) {
			return createErrorResponse('KEY_NOT_FOUND', 'API key not found')
		}

		return {
			ok: true,
			errors: [],
		}
	}
}
