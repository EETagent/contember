import { InputBare, InputLike } from '../../ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown'
import { Button } from '../../ui/button'
import { MoreHorizontalIcon, XIcon } from 'lucide-react'
import * as React from 'react'
import { DataViewNullFilterTrigger, DataViewTextFilterInput, DataViewTextFilterMatchModeLabel, DataViewTextFilterMatchModeTrigger, DataViewTextFilterResetTrigger, TextFilterArtifactsMatchMode } from '@contember/react-dataview'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { DataViewActiveFilterUI } from '../ui'
import { DataViewNullFilter } from './common'
import { dict } from '../../../../lib/dict'


export const DataViewTextFilter = ({ name }: {
	name: string
}) => (
	<>
		<InputLike className={'p-1 relative basis-1/4 min-w-40'}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size={'sm'} variant={'secondary'} className={'px-3'}>
						<DataViewTextFilterMatchModeLabel name={name} render={dict.datagrid.textMatchMode} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[160px]">
					{Object.entries(dict.datagrid.textMatchMode).map(([mode, label]) => (
						<DataViewTextFilterMatchModeTrigger name={name} mode={mode as TextFilterArtifactsMatchMode} key={mode}>
							<DropdownMenuItem className={'data-[active]:font-bold'}>
								{label}
							</DropdownMenuItem>
						</DataViewTextFilterMatchModeTrigger>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<DataViewTextFilterInput name={name}>
				<InputBare placeholder={dict.datagrid.textPlaceholder} className={'w-full ml-2'} />
			</DataViewTextFilterInput>

			<div className={'ml-auto flex gap-1 items-center'}>
				<DataViewNullFilterTrigger name={name} action={'unset'}>
					<DataViewActiveFilterUI className={'ml-auto'}>
						<span className={'italic'}>{dict.datagrid.na}</span>
					</DataViewActiveFilterUI>
				</DataViewNullFilterTrigger>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant={'ghost'} size={'sm'} className={'p-0.5 h-5 w-5'}>
							<MoreHorizontalIcon />
						</Button>
					</PopoverTrigger>
					<PopoverContent>
						<DataViewTextFilterResetTrigger name={name}>
							<Button size={'sm'} className={'w-full text-left justify-start gap-1'} variant={'ghost'}>
								<XIcon className={'w-3 h-3'} /> {dict.datagrid.textReset}
							</Button>
						</DataViewTextFilterResetTrigger>
						<DataViewNullFilter name={name} />
					</PopoverContent>
				</Popover>
			</div>
		</InputLike>
	</>
)
