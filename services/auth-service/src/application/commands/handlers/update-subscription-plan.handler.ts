import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UpdateSubscriptionPlanCommand } from '../update-subscription-plan.command';

/**
 * Updates subscription plan on user record and invalidates all refresh tokens,
 * forcing the user to re-login and get a fresh JWT with the new plan claim.
 */
@CommandHandler(UpdateSubscriptionPlanCommand)
export class UpdateSubscriptionPlanHandler implements ICommandHandler<UpdateSubscriptionPlanCommand> {
  private readonly logger = new Logger(UpdateSubscriptionPlanHandler.name);

  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(command: UpdateSubscriptionPlanCommand) {
    await this.userRepo.updateSubscriptionPlan(command.userId, command.plan);
    await this.userRepo.invalidateUserTokens(command.userId);

    this.logger.log(
      `Plan updated to ${command.plan} for user ${command.userId} — tokens invalidated`,
    );
  }
}
