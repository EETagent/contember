import { ControlledDataGridProps, DataGridProps } from '../grid'
import { useDataGridState } from './useDataGridState'

export const useDataGrid = <T extends {}>(props: DataGridProps<T>): ControlledDataGridProps<T> => {
	const [state, stateMethods] = useDataGridState(props)
	return { ...props, state, stateMethods }
}
