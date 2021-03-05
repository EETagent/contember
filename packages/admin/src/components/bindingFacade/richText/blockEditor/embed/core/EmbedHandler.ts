import { EntityAccessor, Environment } from '@contember/binding'
import { ReactNode } from 'react'
import { NormalizedDiscriminatedData, SugaredDiscriminateBy } from '../../../../discrimination'

export interface PopulateEmbedDataOptions<EmbedArtifacts = any> {
	source: string
	embedArtifacts: EmbedArtifacts
	entity: EntityAccessor
}

export interface EmbedHandler<EmbedArtifacts = any> {
	debugName: string // Optional for error messages

	staticRender: (environment: Environment) => ReactNode
	canHandleSource: (source: string, url: URL | undefined) => boolean | EmbedArtifacts
	renderEmbed: () => ReactNode
	populateEmbedData: (options: PopulateEmbedDataOptions<EmbedArtifacts>) => void
	discriminateBy: SugaredDiscriminateBy
}

export type NormalizedEmbedHandlers = NormalizedDiscriminatedData<EmbedHandler>
