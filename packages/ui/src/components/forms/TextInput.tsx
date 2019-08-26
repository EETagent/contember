import cn from 'classnames'
import * as React from 'react'
import { ChangeEventHandler } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { ControlDistinction, Size, ValidationState } from '../../types'
import { toEnumStateClass, toEnumViewClass, toViewClass } from '../../utils'

type PropBlackList = 'onChange' | 'ref' | 'defaultValue' | 'size'

export type UnderlyingTextAreaProps = Omit<JSX.IntrinsicElements['textarea'], PropBlackList> & {
	allowNewlines: true
	minRows?: number
}

export type UnderlyingInputProps = Omit<JSX.IntrinsicElements['input'], PropBlackList> & {
	allowNewlines?: false
}

export interface TextInputOwnProps {
	value: string
	onChange: (newValue: string) => void

	size?: Size
	distinction?: ControlDistinction
	validationState?: ValidationState
	withTopToolbar?: boolean
	readOnly?: boolean
}

export type TextInputProps = TextInputOwnProps & (UnderlyingTextAreaProps | UnderlyingInputProps)

export type SingleLineTextInputProps = TextInputOwnProps & UnderlyingInputProps
export type MultiLineTextInputProps = TextInputOwnProps & UnderlyingTextAreaProps

export const TextInput = React.memo(
	React.forwardRef(
		(
			{ size, distinction, validationState, onChange, withTopToolbar, ...otherProps }: TextInputProps,
			ref: React.Ref<any>,
		) => {
			const finalClassName = cn(
				'input',
				toEnumViewClass(size),
				toEnumViewClass(distinction),
				toEnumStateClass(validationState),
				toViewClass('withTopToolbar', withTopToolbar),
			)
			const innerOnChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = event =>
				onChange(event.target.value)

			if (otherProps.allowNewlines) {
				const { allowNewlines, ...textareaProps } = otherProps
				return (
					<TextareaAutosize
						ref={ref as any}
						className={finalClassName}
						onChange={innerOnChange}
						useCacheForDOMMeasurements
						{...textareaProps}
					/>
				)
			}
			const { allowNewlines, ...inputProps } = otherProps
			return <input ref={ref as any} type="text" className={finalClassName} onChange={innerOnChange} {...inputProps} />
		},
	),
)
