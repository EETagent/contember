import 'jasmine'
import {
	CreateInitEventCommand,
	getSystemMigrationsDirectory,
	ProjectConfig,
	SchemaVersionBuilder,
	setupSystemVariables,
	SystemContainerFactory,
	SystemExecutionContainer,
	typeDefs as systemTypeDefs,
	unnamedIdentity,
} from '@contember/engine-system-api'
import {
	MigrationFilesManager,
	MigrationsResolver,
	ModificationHandlerFactory,
	SchemaMigrator,
} from '@contember/schema-migrations'
import {
	GraphQlSchemaBuilderFactory,
	PermissionsByIdentityFactory,
	PermissionsVerifier,
} from '@contember/engine-content-api'
import { makeExecutableSchema } from 'graphql-tools'
import { ContentApiTester } from './ContentApiTester'
import { SystemApiTester } from './SystemApiTester'
import { TesterStageManager } from './TesterStageManager'
import { SequenceTester } from './SequenceTester'
import { Client } from '@contember/database'
import { createUuidGenerator } from './testUuid'
import { graphqlObjectFactories } from './graphqlObjectFactories'
import { project } from './project'
import { migrate } from './migrationsRunner'
import { createConnection, dbCredentials, recreateDatabase } from './dbUtils'
import { ExecutedMigrationsResolver } from '@contember/engine-system-api/dist/src/model/migrations/ExecutedMigrationsResolver'
import { join } from 'path'

export class ApiTester {
	public static project = project

	constructor(
		public readonly client: Client,
		public readonly content: ContentApiTester,
		public readonly system: SystemApiTester,
		public readonly stages: TesterStageManager,
		public readonly sequences: SequenceTester,
		public readonly systemExecutionContainer: ReturnType<
			ReturnType<SystemExecutionContainer.Factory['createBuilder']>['build']
		>,
		public readonly cleanup: () => Promise<void>,
	) {}

	public static async create(options: {
		project?: Partial<ProjectConfig>
		migrationsResolver?: MigrationsResolver
		systemExecutionContainerHook?: (
			container: ReturnType<SystemExecutionContainer.Factory['createBuilder']>,
		) => ReturnType<SystemExecutionContainer.Factory['createBuilder']>
	}): Promise<ApiTester> {
		const dbName = String(process.env.TEST_DB_NAME)
		const connection = await recreateDatabase(dbName)

		await migrate({ db: dbCredentials(dbName), schema: 'system', dir: getSystemMigrationsDirectory() })
		await connection.end()

		const projectConnection = createConnection(dbName)
		const projectDb = projectConnection.createClient('system')

		const queryHandler = projectDb.createQueryHandler()
		await setupSystemVariables(projectDb, unnamedIdentity, { uuid: createUuidGenerator('a450') })

		await new CreateInitEventCommand({ uuid: createUuidGenerator('a451') }).execute(projectDb)

		const projectMigrationFilesManager = ApiTester.createProjectMigrationFilesManager()
		const migrationsResolver = options.migrationsResolver || new MigrationsResolver(projectMigrationFilesManager)
		const modificationHandlerFactory = new ModificationHandlerFactory(ModificationHandlerFactory.defaultFactoryMap)
		const schemaMigrator = new SchemaMigrator(modificationHandlerFactory)
		const executedMigrationsResolver = new ExecutedMigrationsResolver(queryHandler)
		const schemaVersionBuilder = new SchemaVersionBuilder(executedMigrationsResolver, schemaMigrator)
		const gqlSchemaBuilderFactory = new GraphQlSchemaBuilderFactory(graphqlObjectFactories)

		const systemContainerFactory = new SystemContainerFactory()
		const systemContainer = systemContainerFactory.create({
			projectsDir: ApiTester.getMigrationsDir(),
			project: { ...ApiTester.project, ...(options.project || {}) },
			contentPermissionsVerifier: new PermissionsVerifier(new PermissionsByIdentityFactory()),
			modificationHandlerFactory,
			providers: { uuid: createUuidGenerator('a452') },
		})

		let systemExecutionContainerBuilder = systemContainer.systemExecutionContainerFactory.createBuilder(projectDb)
		if (options.systemExecutionContainerHook) {
			systemExecutionContainerBuilder = options.systemExecutionContainerHook(systemExecutionContainerBuilder)
		}
		const systemExecutionContainer = systemExecutionContainerBuilder.build()

		const systemSchema = makeExecutableSchema({
			typeDefs: systemTypeDefs,
			resolvers: systemContainer.get('systemResolvers') as any,
			logger: {
				log: err => {
					console.error(err)
					process.exit(1)
					return err
				},
			},
		})

		const stageManager = new TesterStageManager(
			options.project ? options.project.stages || [] : [],
			projectDb,
			systemExecutionContainer.stageCreator,
			systemExecutionContainer.projectMigrator,
			migrationsResolver,
			schemaVersionBuilder,
		)

		const contentApiTester = new ContentApiTester(
			projectDb,
			gqlSchemaBuilderFactory,
			stageManager,
			schemaVersionBuilder,
		)
		const systemApiTester = new SystemApiTester(projectDb, systemSchema, systemContainer, systemExecutionContainer)
		const sequenceTester = new SequenceTester(projectDb.createQueryHandler(), contentApiTester, systemApiTester)

		let closed = false

		return new ApiTester(
			projectDb,
			contentApiTester,
			systemApiTester,
			stageManager,
			sequenceTester,
			systemExecutionContainer,
			async () => {
				if (!closed) {
					await projectConnection.end()
					closed = true
				}
			},
		)
	}

	public static getMigrationsDir(): string {
		return join(__dirname + '/../../src/example-project/migrations')
	}

	private static createProjectMigrationFilesManager(): MigrationFilesManager {
		return new MigrationFilesManager(ApiTester.getMigrationsDir())
	}
}
