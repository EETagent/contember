export interface GraphQlClientRequestOptions {
	variables?: GraphQlClientVariables
	apiTokenOverride?: string
	signal?: AbortSignal
	headers?: Record<string, string>
}

export interface GraphQlClientVariables {
	[name: string]: any
}

export type GraphQlClientFailedRequestMetadata = Pick<Response, 'status' | 'statusText'> & {
	responseText: string
}

export class GraphQlClient {
	constructor(public readonly apiUrl: string, private readonly apiToken?: string) { }

	async sendRequest<T = unknown>(
		query: string,
		{ apiTokenOverride, signal, variables, headers }: GraphQlClientRequestOptions = {},
	): Promise<T> {
		const resolvedHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers }
		const resolvedToken = apiTokenOverride ?? this.apiToken

		if (resolvedToken !== undefined) {
			resolvedHeaders['Authorization'] = `Bearer ${resolvedToken}`
		}

		console.debug(query)

		const response = await fetch(this.apiUrl, {
			method: 'POST',
			headers: resolvedHeaders,
			signal,
			body: JSON.stringify({ query, variables }),
		})

		if (response.ok) {
			// It may still have errors (e.g. unfilled fields) but as far as the request goes, it is ok.
			return await response.json()
		}

		const failedRequest: GraphQlClientFailedRequestMetadata = {
			status: response.status,
			statusText: response.statusText,
			responseText: await response.text(),
		}

		return Promise.reject(failedRequest)
	}
}
