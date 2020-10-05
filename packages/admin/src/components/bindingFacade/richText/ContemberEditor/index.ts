import {
	addMarks,
	canToggleMark,
	closestBlockEntry,
	ejectElement,
	elementToSpecifics,
	getElementDataAttributes,
	hasMarks,
	getPreviousSibling,
	isElementType,
	permissivelyDeserializeElements,
	removeMarks,
	serializeElements,
	strictlyDeserializeElements,
	textToSpecifics,
	toLatestFormat,
	topLevelNodes,
} from './methods'

// TODO use export * as ContemberEditor from './methods' once the tooling is ready.
export const ContemberEditor = {
	addMarks,
	canToggleMark,
	closestBlockEntry,
	ejectElement,
	elementToSpecifics,
	getElementDataAttributes,
	hasMarks,
	getPreviousSibling,
	isElementType,
	permissivelyDeserializeElements,
	removeMarks,
	serializeElements,
	strictlyDeserializeElements,
	textToSpecifics,
	toLatestFormat,
	topLevelNodes,
}
