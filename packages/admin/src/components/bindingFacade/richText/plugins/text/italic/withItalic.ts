import isHotkey from 'is-hotkey'
import * as React from 'react'
import { BaseEditor } from '../../../baseEditor'
import { boldMark } from '../bold'

export const italicMark = 'isItalic'

export const withItalic = <E extends BaseEditor>(editor: E): E => {
	const { onKeyDown, renderLeafChildren, processAttributesPaste, processInlinePaste } = editor

	const isItalicHotkey = isHotkey('mod+i')

	editor.renderLeafChildren = props => {
		const children = renderLeafChildren(props)

		if (props.leaf[italicMark] === true) {
			return React.createElement('i', undefined, children)
		}
		return children
	}

	editor.onKeyDown = event => {
		// TODO use onDOMBeforeInput for this
		if (isItalicHotkey(event.nativeEvent)) {
			editor.toggleMarks({ [italicMark]: true })
			event.preventDefault()
		}
		onKeyDown(event)
	}

	editor.processAttributesPaste = (element, cta) => {
		if (element.style.fontWeight) {
			const isItalic = ['italic', 'oblique'].includes(element.style.fontWeight)
			cta[italicMark] = isItalic
		}
		return processAttributesPaste(element, cta)
	}

	editor.processInlinePaste = (element, next, cumulativeTextAttrs) => {
		if (element.nodeName === 'EM' || element.nodeName === 'I') {
			return next(element.childNodes, { ...cumulativeTextAttrs, [italicMark]: true })
		}
		return processInlinePaste(element, next, cumulativeTextAttrs)
	}

	return editor
}
