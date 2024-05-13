import { EventHandler, KeyboardEvent, KeyboardEventHandler, MouseEvent, useCallback, useRef } from 'react'
import { Path, Transforms } from 'slate'
import { Editable, useSlate } from 'slate-react'
import { EditorWithBlocks } from '@contember/react-legacy-editor'

type EditableProps = typeof Editable extends (p: infer P) => any ? P : never

export interface EditableCanvasProps extends EditableProps {

}

export const EditableCanvas = ({ className, ...editableProps }: EditableCanvasProps) => {
	const editor = useSlate() as EditorWithBlocks
	const pathRef = useRef<Path | undefined>(undefined)

	const handleSlateNodeChange: EventHandler<MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>> = useCallback(event => {
		pathRef.current = editor.selection?.anchor.path
	}, [editor])

	const handleCapturedMouseDown: EventHandler<MouseEvent<HTMLDivElement>> = useCallback(event => {
		if (event.target instanceof HTMLElement) {
			const slateNode = event.target.dataset.slateNode

			if (slateNode === 'value' && pathRef.current) {
				Transforms.deselect(editor)
				event.stopPropagation()
				event.preventDefault()
			}
		}
	}, [editor])

	const handleCapturedKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(event => {
		if (event.key === 'Escape') {
			Transforms.deselect(editor)
			event.stopPropagation()
			event.preventDefault()
		}
	}, [editor])

	return (
		<div
			onKeyDownCapture={handleCapturedKeyDown}
			onKeyUp={handleSlateNodeChange}
			onMouseDownCapture={handleCapturedMouseDown}
			onMouseUp={handleSlateNodeChange}
		>
			<Editable {...editableProps} />
		</div>
	)
}
