import { JwtAuthGuard } from '@libs/common';
import { successResponse } from '@libs/contracts';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FastifyRequest } from 'fastify';
import { Model } from 'mongoose';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../../../infrastructure/persistence/mongoose/schemas/notification-preference.schema';
import { UpdateNotificationPreferencesDto } from '../dtos/update-notification-preferences.dto';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  productUpdates: true,
  learningReminders: true,
  walletEvents: true,
  creatorSales: true,
  weeklyDigest: false,
};

type AuthenticatedRequest = FastifyRequest & { user: { sub: string } };

/** Controller handling notification preference settings. */
@Controller({ path: 'notifications/preferences', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    @InjectModel(NotificationPreference.name)
    private readonly preferences: Model<NotificationPreferenceDocument>,
  ) {}

  @Get()
  async getPreferences(@Req() req: AuthenticatedRequest) {
    const preferences = await this.getOrCreate(req.user.sub);
    return successResponse(this.toResponse(preferences));
  }

  @Patch()
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const preferences = await this.preferences
      .findOneAndUpdate(
        { userId: req.user.sub },
        { $set: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...dto } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return successResponse(this.toResponse(preferences));
  }

  private async getOrCreate(userId: string) {
    const existing = await this.preferences.findOne({ userId }).exec();
    if (existing) {
      return existing;
    }

    return this.preferences.create({
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    });
  }

  private toResponse(preferences: NotificationPreferenceDocument) {
    return {
      productUpdates: preferences.productUpdates,
      learningReminders: preferences.learningReminders,
      walletEvents: preferences.walletEvents,
      creatorSales: preferences.creatorSales,
      weeklyDigest: preferences.weeklyDigest,
      updatedAt: preferences.updatedAt,
    };
  }
}
