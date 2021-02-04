import {
	Component,
	Field,
	FieldValue,
	QueryLanguage,
	SugaredRelativeSingleField,
	wrapFilterInHasOnes,
} from '@contember/binding'
import { FormGroup, TextInput, Select } from '@contember/ui'
import { assertNever } from '@contember/utils'
import * as React from 'react'
import { Input } from '@contember/client'
import { Checkbox } from '../../../../ui'
import { FieldFallbackView, FieldFallbackViewPublicProps } from '../../../fieldViews'
import { DataGridCellPublicProps, DataGridColumn, DataGridHeaderCellPublicProps, DataGridOrderDirection } from '../base'

export type TextCellProps<Persisted extends FieldValue = FieldValue> = DataGridHeaderCellPublicProps &
	DataGridCellPublicProps &
	FieldFallbackViewPublicProps &
	SugaredRelativeSingleField & {
		disableOrder?: boolean
		initialOrder?: DataGridOrderDirection
		format?: (value: Persisted) => React.ReactNode
	}

interface TextFilterArtifacts {
	mode: 'matches' | 'doesNotMatch'
	query: string
	nullCondition: boolean
}

export const TextCell = Component<TextCellProps>(props => {
	return (
		<DataGridColumn<TextFilterArtifacts>
			{...props}
			enableOrdering={!props.disableOrder as true}
			getNewOrderBy={(newDirection, { environment }) =>
				newDirection && QueryLanguage.desugarOrderBy(`${props.field as string} ${newDirection}`, environment)
			}
			getNewFilter={(filter, { environment }) => {
				let condition: Input.Condition<string> = {
					containsCI: filter.query,
				}

				if (filter.query === '' && filter.nullCondition === false) {
					return undefined
				}

				if (filter.mode === 'matches') {
					if (filter.nullCondition) {
						condition = {
							or: [condition, { isNull: true }],
						}
					}
				} else if (filter.mode === 'doesNotMatch') {
					condition = { not: condition }
					if (filter.nullCondition) {
						condition = {
							and: [condition, { isNull: false }],
						}
					}
				} else {
					return undefined
				}

				const desugared = QueryLanguage.desugarRelativeSingleField(props, environment)
				return wrapFilterInHasOnes(desugared.hasOneRelationPath, {
					[desugared.field]: condition,
				})
			}}
			filterRenderer={({ filter, setFilter }) => {
				const normalizedFilter: TextFilterArtifacts = filter ?? {
					mode: 'matches',
					query: '',
					nullCondition: false,
				}
				return (
					<FormGroup label={props.header}>
						<Select
							value={normalizedFilter.mode}
							options={[
								{ value: 'matches', label: 'Matches' },
								{ value: 'doesNotMatch', label: "Doesn't match" },
							]}
							onChange={e => {
								const value = e.currentTarget.value as TextFilterArtifacts['mode']

								setFilter({
									...normalizedFilter,
									mode: value,
									nullCondition: normalizedFilter.mode === value ? normalizedFilter.nullCondition : false,
								})
							}}
						/>
						<TextInput
							value={normalizedFilter.query}
							onChange={e => {
								const value = e.currentTarget.value
								setFilter({
									...normalizedFilter,
									query: value,
								})
							}}
						/>
						<Checkbox
							checked={normalizedFilter.nullCondition}
							onChange={checked => {
								setFilter({
									...normalizedFilter,
									nullCondition: checked,
								})
							}}
						>
							<b>{normalizedFilter.mode === 'matches' ? 'Include' : 'Exclude'}</b> N/A
						</Checkbox>
					</FormGroup>
				)
			}}
		>
			<Field
				{...props}
				format={value => {
					if (value === null) {
						return <FieldFallbackView fallback={props.fallback} fallbackStyle={props.fallbackStyle} />
					}
					if (props.format) {
						return props.format(value)
					}
					return value
				}}
			/>
		</DataGridColumn>
	)
}, 'TextCell') as <Persisted extends FieldValue = FieldValue>(props: TextCellProps<Persisted>) => React.ReactElement
