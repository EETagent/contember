import { EditorPlaceholder } from '@contember/ui'
import * as React from 'react'
import { Node as SlateNode } from 'slate'
import { RenderElementProps } from 'slate-react'
import { ContemberFieldElement } from '../elements'
import { NormalizedFieldBackedElement } from '../FieldBackedElement'

export interface ContemberFieldElementRendererProps extends RenderElementProps {
	element: ContemberFieldElement
	fieldBackedElement: NormalizedFieldBackedElement
}

export const ContemberFieldElementRenderer = React.memo((props: ContemberFieldElementRendererProps) => {
	const fieldString = SlateNode.string(props.element)
	const shouldDisplayPlaceholder = fieldString === ''
	return (
		<div {...props.attributes}>
			{props.fieldBackedElement.render({
				isEmpty: shouldDisplayPlaceholder,
				children: (
					<>
						{shouldDisplayPlaceholder && <EditorPlaceholder>{props.fieldBackedElement.placeholder}</EditorPlaceholder>}
						{props.children}
					</>
				),
			})}
		</div>
	)
})
ContemberFieldElementRenderer.displayName = 'ContemberFieldElementRenderer'
