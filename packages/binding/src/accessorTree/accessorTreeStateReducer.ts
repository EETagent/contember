import { AccessorTreeState, AccessorTreeStateName } from './AccessorTreeState'
import { AccessorTreeStateAction } from './AccessorTreeStateAction'
import { AccessorTreeStateActionType } from './AccessorTreeStateActionType'

export const accessorTreeStateReducer = (
	previousState: AccessorTreeState,
	action: AccessorTreeStateAction,
): AccessorTreeState => {
	switch (action.type) {
		case AccessorTreeStateActionType.SetData:
			const { type, ...actionData } = action
			if (previousState.name === AccessorTreeStateName.Interactive) {
				return {
					...previousState,
					...actionData,
				}
			}
			if (
				previousState.name === AccessorTreeStateName.Uninitialized ||
				previousState.name === AccessorTreeStateName.Querying
			) {
				return {
					...actionData,
					name: AccessorTreeStateName.Interactive,
				}
			}
			if (previousState.name === AccessorTreeStateName.Mutating) {
				return {
					...actionData,
					name: AccessorTreeStateName.Interactive,
				}
			}
			return previousState // Ignore input in other states
		case AccessorTreeStateActionType.InitializeQuery:
			return {
				name: AccessorTreeStateName.Querying,
			}
		case AccessorTreeStateActionType.InitializeMutation:
			if (previousState.name === AccessorTreeStateName.Interactive) {
				return {
					...previousState,
					name: AccessorTreeStateName.Mutating,
				}
			}
			return previousState
		case AccessorTreeStateActionType.ResolveRequestWithError:
			return {
				name: AccessorTreeStateName.RequestError,
				error: action.error,
			}
		case AccessorTreeStateActionType.Uninitialize:
			return {
				name: AccessorTreeStateName.Uninitialized,
			}
	}
}
