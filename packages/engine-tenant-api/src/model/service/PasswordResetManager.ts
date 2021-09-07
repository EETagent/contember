import { CreatePasswordResetRequestCommand, ResetPasswordCommand, ResetPasswordCommandErrorCode } from '../commands'
import { Response, ResponseError } from '../utils/Response'
import { getPasswordWeaknessMessage } from '../utils/password'
import { UserMailer } from '../mailing'
import { PersonRow } from '../queries'
import { PermissionContextFactory } from '../authorization'
import { ProjectManager } from './ProjectManager'
import { DatabaseContext } from '../utils'

interface MailOptions {
	project?: string
	mailVariant?: string
}

export class PasswordResetManager {
	constructor(
		private readonly dbContext: DatabaseContext,
		private readonly mailer: UserMailer,
		private readonly permissionContextFactory: PermissionContextFactory,
		private readonly projectManager: ProjectManager,
	) {}

	public async createPasswordResetRequest(person: PersonRow, mailOptions: MailOptions = {}) {
		const result = await this.dbContext.commandBus.execute(new CreatePasswordResetRequestCommand(person.id))
		const permissionContext = await this.permissionContextFactory.create({
			id: person.identity_id,
			roles: person.roles,
		})
		const projects = await this.projectManager.getProjectsByIdentity(person.identity_id, permissionContext)
		const project = (() => {
			if (projects.length === 1) {
				return projects[0]
			} else if (mailOptions.project) {
				return projects.find(it => it.slug === mailOptions.project) || null
			}
			return null
		})()

		await this.mailer.sendPasswordResetEmail(
			{
				email: person.email,
				token: result.token,
				project: project?.name,
			},
			{
				variant: mailOptions.mailVariant || '',
				projectId: project?.id,
			},
		)
	}

	public async resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
		const weakPassword = getPasswordWeaknessMessage(password)
		if (weakPassword) {
			return new ResponseError(ResetPasswordErrorCode.PASSWORD_TOO_WEAK, weakPassword)
		}
		return await this.dbContext.commandBus.execute(new ResetPasswordCommand(token, password))
	}
}

export enum ResetPasswordErrorCode {
	PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
}

export type ResetPasswordResponse = Response<undefined, ResetPasswordErrorCode | ResetPasswordCommandErrorCode>
