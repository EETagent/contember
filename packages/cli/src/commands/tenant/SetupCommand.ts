import { Command, CommandConfiguration, Input } from '../../cli'
import { interactiveSetup } from '../../utils/tenant'

type Args = {
	apiUrl: string
}

type Options = {}

export class SetupCommand extends Command<Args, Options> {
	protected configure(configuration: CommandConfiguration<Args, Options>): void {
		configuration.description('Creates superadmin and login key')
		configuration.argument('apiUrl').description('Contember API URL')
	}

	protected async execute(input: Input<Args, Options>): Promise<void> {
		if (!process.stdin.isTTY) {
			throw 'This command is interactive and requires TTY'
		}
		const apiUrl = input.getArgument('apiUrl')

		const { loginToken } = await interactiveSetup(apiUrl)
		console.log('Superadmin created.')
		console.log('Login token: ' + loginToken)
	}
}
