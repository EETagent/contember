import {
	Component,
	EntityAccessor,
	Field,
	FieldAccessor,
	useEntityContext,
	useEnvironment,
	useMutationState,
	useRelativeSingleField,
} from '@contember/binding'
import { FileUploadReadyState, FileUploadState, useFileUpload } from '@contember/react-client'
import { Box, Button, FormGroup } from '@contember/ui'
import { assertNever } from '@contember/utils'
import * as React from 'react'
import { useDropzone } from 'react-dropzone'
import { SimpleRelativeSingleFieldProps } from '../auxiliary'
import {
	AggregateUploadProps,
	getAggregateFileMetadataFieldsPopulator,
	useDesugaredAggregateUploadProps,
} from '../upload'

export interface UploadFieldMetadata {
	accessor: FieldAccessor<string>
	uploadState: FileUploadState | undefined
	emptyText?: React.ReactNode
}

export type UploadFieldProps = {
	accept?: string
	children: (url: string) => React.ReactNode
	emptyText?: React.ReactNode
} & SimpleRelativeSingleFieldProps &
	AggregateUploadProps

export const UploadField = Component<UploadFieldProps>(
	props => {
		const [uploadState, { startUpload }] = useFileUpload()
		const environment = useEnvironment()
		const entity = useEntityContext()
		const isMutating = useMutationState()
		const accessor = useRelativeSingleField<string>(props)
		const aggregateUploadProps = useDesugaredAggregateUploadProps(props)
		const entityRef = React.useRef<EntityAccessor>(entity)

		entityRef.current = entity

		const onDrop = React.useCallback(
			async (files: File[]) => {
				startUpload([
					{
						id: 0,
						file: files[0],
					},
				])
			},
			[startUpload],
		)
		const { getRootProps, getInputProps, isDragActive } = useDropzone({
			onDrop,
			disabled: isMutating,
			accept: props.accept,
			multiple: false,
			noKeyboard: true, // This would normally be absolutely henious but there is a keyboard-focusable button inside.
		})
		const metadata: UploadFieldMetadata = React.useMemo(
			() => ({
				emptyText: props.emptyText,
				uploadState: uploadState[0],
				accessor,
			}),
			[accessor, props.emptyText, uploadState],
		)
		let file: File | undefined = undefined
		let previewUrl: string | undefined = undefined

		if (0 in uploadState) {
			const state = uploadState[0]
			if (state.file && state.previewUrl) {
				file = state.file
				previewUrl = state.previewUrl
			}
		}

		React.useEffect(() => {
			let isMounted = true
			const createPopulator = async () => {
				if (previewUrl && file) {
					const populate = await getAggregateFileMetadataFieldsPopulator(
						entityRef.current,
						file,
						previewUrl,
						aggregateUploadProps,
					)
					if (isMounted) {
						populate()
					}
				}
			}
			createPopulator()
			return () => {
				isMounted = false
			}
		}, [aggregateUploadProps, file, previewUrl])

		return (
			<FormGroup
				label={environment.applySystemMiddleware('labelMiddleware', props.label)}
				labelDescription={props.labelDescription}
				labelPosition={props.labelPosition}
				description={props.description}
				errors={accessor.errors}
			>
				<div
					{...getRootProps({
						style: {},
					})}
				>
					<input {...getInputProps()} />
					<Inner metadata={metadata} {...props}>
						{props.children}
					</Inner>
				</div>
			</FormGroup>
		)
	},
	props => (
		<>
			<Field field={props.field} />

			{props.sizeField && <Field field={props.sizeField} isNonbearing />}
			{props.typeField && <Field field={props.typeField} isNonbearing />}
			{props.fileNameField && <Field field={props.fileNameField} isNonbearing />}
			{props.lastModifiedField && <Field field={props.lastModifiedField} isNonbearing />}

			{props.widthField && <Field field={props.widthField} isNonbearing />}
			{props.heightField && <Field field={props.heightField} isNonbearing />}

			{props.durationField && <Field field={props.durationField} isNonbearing />}
		</>
	),
	'UploadField',
)

type InnerProps = SimpleRelativeSingleFieldProps & {
	metadata: UploadFieldMetadata
	emptyText?: React.ReactNode
	children: (url: string) => React.ReactNode
}

const Inner = React.memo((props: InnerProps) => {
	const { uploadState, accessor, emptyText } = props.metadata
	React.useEffect(() => {
		if (
			uploadState &&
			uploadState.readyState === FileUploadReadyState.Success &&
			uploadState.fileUrl !== accessor.currentValue
		) {
			accessor.updateValue?.(uploadState.fileUrl)
		}
	}, [uploadState, accessor])

	const renderPreview = () => {
		if (uploadState && uploadState.readyState !== FileUploadReadyState.Uninitialized && uploadState.previewUrl) {
			return props.children(uploadState.previewUrl)
		}
		if (accessor.currentValue) {
			return props.children(accessor.currentValue)
		}
		return <span className="fileInput-empty">{emptyText}</span>
	}
	const renderUploadStatusMessage = (uploadState?: FileUploadState) => {
		if (!uploadState || uploadState.readyState === FileUploadReadyState.Uninitialized) {
			return (
				<>
					<Button size="small">Select a file to upload</Button>
					<span className={'fileInput-drop'}>or drag & drop</span>
				</>
			)
		}
		switch (uploadState.readyState) {
			case FileUploadReadyState.Initializing:
				return `Starting upload`
			case FileUploadReadyState.Uploading:
				return `Upload progress: ${(uploadState.progress * 100).toFixed()}%`
			case FileUploadReadyState.Error:
				return `Upload failed`
			case FileUploadReadyState.Success:
				return `Upload has finished successfully`
			default:
				assertNever(uploadState)
		}
	}
	return (
		<Box distinction="seamlessIfNested">
			<span className="fileInput">
				<span className="fileInput-preview">{renderPreview()}</span>
				<span className="fileInput-message">{renderUploadStatusMessage(props.metadata.uploadState)}</span>
			</span>
		</Box>
	)
})
