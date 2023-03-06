module.exports = {
	parser: '@typescript-eslint/parser',
	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:promise/recommended',
	],
	plugins: [],
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module',
	},
	rules: {
		'no-console': 'error',
		'@typescript-eslint/camelcase': 'off',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/no-namespace': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/ban-types': 'off',

		'prefer-const': 'off',

		'semi': 'off',
		'no-extra-semi': 'off',
		'@typescript-eslint/indent': ['error', 'tab', {
			SwitchCase: 1,
			ignoredNodes: [
				'TSTypeAnnotation',
				'TSTypeParameterInstantiation',
				'PropertyDefinition',
			],
		}],
		'@typescript-eslint/semi': ['error', 'never'],
		'@typescript-eslint/no-extra-semi': ['error'],
		'@typescript-eslint/member-delimiter-style': ['error', { multiline: { delimiter: 'none' } }],
		'array-bracket-newline': ['error', 'consistent'],
		'array-bracket-spacing': ['error', 'never'],
		'array-element-newline': ['error', 'consistent'],
		'arrow-parens': ['error', 'as-needed'],
		'arrow-spacing': ['error', { before: true, after: true }],
		'block-spacing': ['error', 'always'],
		'brace-style': ['error', '1tbs'],
		'comma-dangle': ['error', 'always-multiline'],
		'comma-spacing': ['error', { before: false, after: true }],
		'comma-style': ['error', 'last'],
		'computed-property-spacing': ['error', 'never'],
		'eol-last': ['error', 'always'],
		'function-call-argument-newline': ['error', 'consistent'],
		'jsx-quotes': ['error', 'prefer-double'],
		'key-spacing': ['error', { beforeColon: false, afterColon: true }],
		'keyword-spacing': ['error', { before: true, after: true }],
		'linebreak-style': ['error', 'unix'],
		'no-whitespace-before-property': ['error'],
		'object-curly-newline': ['error', { consistent: true }],
		'object-curly-spacing': ['error', 'always'],
		'quote-props': ['error', 'consistent-as-needed'],
		'quotes': ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
		'space-in-parens': ['error', 'never'],
		'space-infix-ops': ['error'],
		'space-unary-ops': ['error', { words: true, nonwords: false }],
		'promise/param-names': 'off',
	},
}
