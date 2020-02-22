import { BindingError, EntityAccessor, FieldAccessor, FieldValue, RelativeSingleField } from '@contember/binding'
import * as React from 'react'
import { Element as SlateElement } from 'slate'
import { NormalizedBlock } from '../../blocks'
import { createEditor } from './editor'
import {
	ContemberBlockElement,
	contemberBlockElementType,
	ContemberContentPlaceholder,
	contemberContentPlaceholderType,
	ContemberFieldElement,
	ContemberFieldElementPosition,
	contemberFieldElementType,
} from './elements'
import { NormalizedFieldBackedElement } from './FieldBackedElement'

export interface UseSlateNodesOptions {
	editor: ReturnType<typeof createEditor>
	blocks: NormalizedBlock[]
	discriminationField: RelativeSingleField
	contemberFieldElementCache: WeakMap<FieldAccessor, SlateElement>
	textElementCache: WeakMap<EntityAccessor, SlateElement>
	contemberBlockElementCache: Map<string, SlateElement>
	textBlockField: RelativeSingleField
	textBlockDiscriminant: FieldValue
	entities: EntityAccessor[]
	leadingFieldBackedElements: NormalizedFieldBackedElement[]
	trailingFieldBackedElements: NormalizedFieldBackedElement[]
	placeholder: React.ReactNode
}

export const useSlateNodes = ({
	editor,
	blocks,
	discriminationField,
	textElementCache,
	contemberFieldElementCache,
	contemberBlockElementCache,
	textBlockField,
	textBlockDiscriminant,
	entities,
	leadingFieldBackedElements,
	trailingFieldBackedElements,
	placeholder,
}: UseSlateNodesOptions): SlateElement[] => {
	const adjacentAccessorsToElements = (
		elements: NormalizedFieldBackedElement[],
		position: ContemberFieldElementPosition,
	): SlateElement[] =>
		elements.map((normalizedElement, index) => {
			if (contemberFieldElementCache.has(normalizedElement.accessor)) {
				return contemberFieldElementCache.get(normalizedElement.accessor)!
			}
			let element: SlateElement
			const fieldValue = normalizedElement.accessor.currentValue
			if (typeof fieldValue !== 'string' && fieldValue !== null) {
				throw new BindingError(
					`BlockEditor: The ${position} field backed element at index '${index}' does not contain a string value.`,
				)
			}
			if (fieldValue === null || fieldValue === '' || normalizedElement.format === 'plainText') {
				const fieldElement: ContemberFieldElement = {
					type: contemberFieldElementType,
					children: [{ text: fieldValue || '' }],
					position,
					index,
				}
				element = fieldElement
			} else {
				try {
					element = JSON.parse(fieldValue)
				} catch (_) {
					throw new BindingError(
						`BlockEditor: The ${position} field backed element at index '${index}' contains invalid JSON.`,
					)
				}
			}
			contemberFieldElementCache.set(normalizedElement.accessor, element)
			return element
		})

	const contentElements = entities.length
		? entities.map(entity => {
				if (textElementCache.has(entity)) {
					return textElementCache.get(entity)!
				}
				const entityKey = entity.getKey()

				if (contemberBlockElementCache.has(entityKey)) {
					return contemberBlockElementCache.get(entityKey)!
				}

				const blockType = entity.getRelativeSingleField(discriminationField)

				if (blockType.hasValue(textBlockDiscriminant)) {
					// This is a text block
					const textAccessor = entity.getRelativeSingleField(textBlockField)
					let element: SlateElement

					if (textAccessor.currentValue === null || textAccessor.currentValue === '') {
						element = editor.createDefaultElement([{ text: '' }])
					} else if (typeof textAccessor.currentValue !== 'string') {
						throw new BindingError(`BlockEditor: The 'textBlockField' does not contain a string value.`)
					} else {
						try {
							element = JSON.parse(textAccessor.currentValue)
						} catch (_) {
							throw new BindingError(`BlockEditor: The 'textBlockField' contains invalid JSON.`)
						}
					}
					textElementCache.set(entity, element)
					return element
				} else {
					const selectedBlock = blocks.find(block => blockType.hasValue(block.discriminateBy))

					if (selectedBlock === undefined) {
						throw new BindingError(`BlockEditor: Encountered an entity without a corresponding block definition.`)
					}
					const contemberBlock: ContemberBlockElement = {
						type: contemberBlockElementType,
						children: [{ text: '' }],
						entityKey,
						blockType: selectedBlock.discriminateBy,
					}
					/*
						TODO This is a memory leak as we don't ever remove the blocks from the map. They're tiny objects though and
						we're not expecting the user to create thousands and thousands of them so it's not that big of a deal but it's
						still far from ideal. How do we fix this though? 🤔
					 */
					contemberBlockElementCache.set(entityKey, contemberBlock)
					return contemberBlock
				}
		  })
		: [
				{
					type: contemberContentPlaceholderType,
					children: [{ text: '' }],
					placeholder,
				} as ContemberContentPlaceholder,
		  ]
	return adjacentAccessorsToElements(leadingFieldBackedElements, 'leading').concat(
		contentElements,
		adjacentAccessorsToElements(trailingFieldBackedElements, 'trailing'),
	)
}
