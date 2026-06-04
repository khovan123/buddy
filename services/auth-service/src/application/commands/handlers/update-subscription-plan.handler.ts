import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UpdateSubscriptionPlanCommand } from '../update-subscription-plan.command';

/** Updates subscription plan on the auth user record used for JWT plan claims. */
@CommandHandler(UpdateSubscriptionPlanCommand)
export class UpdateSubscriptionPlanHandler implements ICommandHandler<UpdateSubscriptionPlanCommand> {
  private readonly logger = new Logger(UpdateSubscriptionPlanHandler.name);

  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(command: UpdateSubscriptionPlanCommand) {
    await this.userRepo.updateSubscriptionPlan(command.userId, command.plan);

    this.logger.log(`Plan updated to ${command.plan} for user ${command.userId}`);
  }
}
