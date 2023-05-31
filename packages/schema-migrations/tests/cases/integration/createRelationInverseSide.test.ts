import { testMigrations } from '../../src/tests'
import { Model } from '@contember/schema'
import { SQL } from '../../src/tags'
import { SchemaBuilder } from '@contember/schema-definition'

testMigrations('create inverse side relation (post with locales)', {
	originalSchema: new SchemaBuilder()
		.entity('Post', e => e)
		.entity('PostLocale', e => e.manyHasOne('post', r => r.target('Post')))
		.buildSchema(),
	updatedSchema: new SchemaBuilder()
		.entity('Post', e => e)
		.entity('PostLocale', e => e.manyHasOne('post', r => r.target('Post').inversedBy('locales')))
		.buildSchema(),
	diff: [
		{
			modification: 'createRelationInverseSide',
			entityName: 'Post',
			relation: {
				name: 'locales',
				type: Model.RelationType.OneHasMany,
				target: 'PostLocale',
				ownedBy: 'post',
			},
		},
	],
	sql: SQL``,
})

testMigrations('create inverse side relation together with changing onDelete behaviour', {
	originalSchema: new SchemaBuilder()
		.entity('Post', e => e)
		.entity('PostLocale', e => e.manyHasOne('post', r => r.target('Post')))
		.buildSchema(),
	updatedSchema: new SchemaBuilder()
		.entity('Post', e => e)
		.entity('PostLocale', e =>
			e.manyHasOne('post', r => r.target('Post').inversedBy('locales').onDelete(Model.OnDelete.cascade)),
		)
		.buildSchema(),
	diff: [
		{
			modification: 'updateRelationOnDelete',
			entityName: 'PostLocale',
			fieldName: 'post',
			onDelete: 'cascade',
		},
		{
			modification: 'createRelationInverseSide',
			entityName: 'Post',
			relation: {
				name: 'locales',
				type: Model.RelationType.OneHasMany,
				target: 'PostLocale',
				ownedBy: 'post',
			},
		},
	],
	sql: SQL`ALTER TABLE "post_locale" DROP CONSTRAINT "fk_post_locale_post_id_post_id"; ALTER TABLE "post_locale" ADD FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;`,
})
