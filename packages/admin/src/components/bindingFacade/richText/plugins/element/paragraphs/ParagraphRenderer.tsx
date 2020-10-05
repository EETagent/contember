import { EditorParagraph } from '@contember/ui'
import * as React from 'react'
import { RenderElementProps } from 'slate-react'
import { ParagraphElement } from './ParagraphElement'

export interface ParagraphRendererProps extends Omit<RenderElementProps, 'element'> {
	element: ParagraphElement
}

export function ParagraphRenderer({ attributes, children, element }: ParagraphRendererProps) {
	return (
		// TODO use BlockElement
		<EditorParagraph attributes={attributes} isNumbered={element.isNumbered}>
			{children}
		</EditorParagraph>
	)
}
