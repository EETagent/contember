import { ErrorAccessor, FieldAccessor } from '../../accessors'
import { FieldMarker } from '../../markers'
import { FieldName, FieldValue } from '../../treeParameters'
import { EntityState } from './EntityState'
import { StateType } from './StateType'

export interface FieldState {
	type: StateType.Field

	errors: ErrorAccessor | undefined
	eventListeners: {
		[Type in FieldAccessor.FieldEventType]: Set<FieldAccessor.FieldEventListenerMap[Type]> | undefined
	}
	fieldMarker: FieldMarker
	getAccessor: () => FieldAccessor
	hasPendingUpdate: boolean
	hasStaleAccessor: boolean
	hasUnpersistedChanges: boolean
	parent: EntityState
	persistedValue: FieldValue | undefined // Undefined means that the parent entity doesn't exist on server
	placeholderName: FieldName
	touchLog: Map<string, boolean> | undefined
	value: FieldValue

	addError: FieldAccessor.AddError
	addEventListener: FieldAccessor.AddFieldEventListener
	isTouchedBy: FieldAccessor.IsTouchedBy
	updateValue: FieldAccessor.UpdateValue
}
