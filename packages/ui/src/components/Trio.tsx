import * as React from 'react'
import cn from 'classnames'
import { useClassNamePrefix } from '../auxiliary'
import { toViewClass } from '../utils'

export function Trio({
	className,
	column,
	start,
	center,
	end,
	clickThroughSpace,
}: {
	column?: boolean
	className?: string
	start?: React.ReactNode
	center?: React.ReactNode
	end?: React.ReactNode
	clickThroughSpace?: boolean
}) {
	const prefix = useClassNamePrefix()
	if (!start && !center && !end) {
		return null
	}
	return (
		<div
			className={cn(
				`${prefix}trio`,
				className,
				toViewClass('column', column),
				toViewClass('clickThroughSpace', clickThroughSpace),
			)}
		>
			<div className={`${prefix}trio-start`}>{start}</div>
			<div className={`${prefix}trio-center`}>{center}</div>
			<div className={`${prefix}trio-end`}>{end}</div>
		</div>
	)
}
Trio.displayName = 'Trio'
