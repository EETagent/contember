import { debounce } from 'debounce'
import * as React from 'react'
import { Range as SlateRange } from 'slate'
import { ReactEditor, useEditor } from 'slate-react'
import { EditorSelectionActionType } from './EditorSelectionActionType'
import { defaultEditorSelectionState, editorSelectionReducer } from './editorSelectionReducer'
import { EditorSelectionState, EditorSelectionStateName } from './EditorSelectionState'

export const useEditorSelection = (maxInterval: number = 100): EditorSelectionState => {
	const editor = useEditor()
	const [selectionState, dispatch] = React.useReducer(editorSelectionReducer, defaultEditorSelectionState)
	const selectionStateRef = React.useRef<EditorSelectionState>(selectionState)

	selectionStateRef.current = selectionState

	const onDOMSelectionChange = React.useCallback(
		debounce(() => {
			const selection = getSelection()
			const isRelevant = selection && selection.anchorNode && ReactEditor.hasDOMNode(editor, selection.anchorNode)

			if (isRelevant) {
				if (
					selectionStateRef.current.name !== EditorSelectionStateName.Unfocused &&
					selectionStateRef.current.selection &&
					SlateRange.equals(
						ReactEditor.toSlateRange(editor, selectionStateRef.current.selection),
						ReactEditor.toSlateRange(editor, selection!),
					)
				) {
					// We've likely just changed a mark or something. To the DOM, this *is* a selection change but as far as we're
					// concerned they are the same.
					//return
				}
				dispatch({
					type: EditorSelectionActionType.SetSelection,
					selection: selection!,
				})
			} else {
				dispatch({
					type: EditorSelectionActionType.Blur,
				})
			}
		}, maxInterval),
		[],
	)
	const onMouseDown = React.useCallback(
		(e: MouseEvent) => {
			e.target &&
				e.target instanceof Node &&
				ReactEditor.hasDOMNode(editor, e.target) &&
				dispatch({
					type: EditorSelectionActionType.SetMousePointerSelectionStart,
					event: e,
				})
		},
		[editor],
	)
	const onMouseUp = React.useCallback(
		(e: MouseEvent) => {
			const relevantTarget = !!e.target && e.target instanceof Node && ReactEditor.hasDOMNode(editor, e.target)
			dispatch({
				type: EditorSelectionActionType.SetMousePointerSelectionFinish,
				event: relevantTarget ? e : undefined,
			})
		},
		[editor],
	)

	React.useEffect(() => {
		document.addEventListener('selectionchange', onDOMSelectionChange)
		document.addEventListener('mousedown', onMouseDown)
		document.addEventListener('mouseup', onMouseUp)

		return () => {
			document.removeEventListener('selectionchange', onDOMSelectionChange)
			document.removeEventListener('mousedown', onMouseDown)
			document.removeEventListener('mouseup', onMouseUp)
		}
	}, [onDOMSelectionChange, onMouseDown, onMouseUp])

	return selectionState
}
