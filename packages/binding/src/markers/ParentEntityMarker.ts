import { ParentEntityParameters } from '../treeParameters'
import { EntityFieldMarkersContainer } from './EntityFieldMarkersContainer'

export class ParentEntityMarker {
	public constructor(
		public readonly parentEntity: ParentEntityParameters,
		public readonly fields: EntityFieldMarkersContainer,
	) {}
}
