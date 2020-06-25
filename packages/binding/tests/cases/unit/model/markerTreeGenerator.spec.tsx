import * as React from 'react'
import { EntityListSubTree, Field, HasMany, HasOne, SingleEntitySubTree } from '../../../../src/coreComponents'
import {
	FieldMarker,
	HasManyRelationMarker,
	HasOneRelationMarker,
	Marker,
	MarkerTreeRoot,
	SubTreeMarker,
} from '../../../../src/markers'
import { MarkerTreeGenerator } from '../../../../src/model'
import { BoxedQualifiedSingleEntity } from '../../../../src/treeParameters'

describe('Marker tree generator', () => {
	it('should reject empty trees', () => {
		const generator = new MarkerTreeGenerator((<></>))

		expect(() => generator.generate()).toThrowError(/empty/i)
	})

	it('combine nested markers', () => {
		const generator = new MarkerTreeGenerator(
			(
				<>
					<SingleEntitySubTree entity="Foo(bar = 123)">
						<HasMany field="hasMany[x > 50]">
							<Field field="hasManyField" />
							<HasOne field="hasOne">
								<HasMany field="common">
									<Field field="same" />
									<Field field="name" />
								</HasMany>
							</HasOne>
						</HasMany>
						<Field field="fooField" />
					</SingleEntitySubTree>
					<SingleEntitySubTree entity="Foo(bar = 123)">
						<HasMany field="hasMany[x > 50]">
							<HasOne field="hasOne">
								<HasMany field="common">
									<Field field="surname" />
									<Field field="same" />
								</HasMany>
								<Field field="hasOneField" />
							</HasOne>
						</HasMany>
					</SingleEntitySubTree>
				</>
			),
		)

		const innerHasMany = new HasManyRelationMarker(
			{
				field: 'common',
				filter: undefined,
				connections: undefined,
				forceCreation: false,
				isNonbearing: false,
				initialEntityCount: 0,
				orderBy: undefined,
				offset: undefined,
				limit: undefined,
			},
			new Map([
				['same', new FieldMarker('same')],
				['name', new FieldMarker('name')],
				['surname', new FieldMarker('surname')],
			]),
		)

		const hasOne = new HasOneRelationMarker(
			{
				field: 'hasOne',
				connections: undefined,
				filter: undefined,
				forceCreation: false,
				isNonbearing: false,
				reducedBy: undefined,
			},
			new Map<string, Marker>([
				[innerHasMany.placeholderName, innerHasMany],
				['hasOneField', new FieldMarker('hasOneField')],
			]),
		)

		const outerHasMany = new HasManyRelationMarker(
			{
				field: 'hasMany',
				filter: { x: { gt: 50 } },
				connections: undefined,
				forceCreation: false,
				isNonbearing: false,
				initialEntityCount: 0,
				orderBy: undefined,
				offset: undefined,
				limit: undefined,
			},
			new Map<string, Marker>([
				['hasManyField', new FieldMarker('hasManyField')],
				[hasOne.placeholderName, hasOne],
			]),
		)
		const subTreeMarker = new SubTreeMarker(
			new BoxedQualifiedSingleEntity({
				entityName: 'Foo',
				where: { bar: 123 },
				filter: undefined,
				hasOneRelationPath: [],
			}),
			new Map<string, Marker>([
				[outerHasMany.placeholderName, outerHasMany],
				['fooField', new FieldMarker('fooField')],
			]),
		)
		expect(generator.generate()).toEqual(new MarkerTreeRoot(new Map([[subTreeMarker.placeholderName, subTreeMarker]])))
	})

	it('should reject top-level fields and relations', () => {
		const topOne = (
			<HasOne field="foo">
				<Field field="bar" />
			</HasOne>
		)
		const topMany = (
			<HasMany field="foo">
				<Field field="bar" />
			</HasMany>
		)
		const topField = <Field field="foo" />

		for (const faultyTop of [topOne, topMany, topField]) {
			expect(() => new MarkerTreeGenerator(faultyTop).generate()).toThrowError()
		}
	})
})
