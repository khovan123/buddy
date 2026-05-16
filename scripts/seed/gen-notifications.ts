import { authUserIds, randInt, USER_COUNT } from './ids';

/**
 * Generate notification records (notification-service, Mongo).
 *
 * From notification handlers (send-welcome-email, send-otp-email, etc.):
 *   - userId: auth user UUID
 *   - type: 'email' | 'push' | 'sms' | 'in_app'
 *   - channel: string describing the notification purpose
 *   - recipient: email/phone/userId depending on type
 *   - subject: string (for email)
 *   - templateId: string
 *   - templateData: Record<string, unknown>
 *   - status: 'pending' | 'sent' | 'failed' | 'delivered'
 *   - attempts: number (default 0)
 *   - maxAttempts: number (default 3)
 */

const NOTIFICATION_TEMPLATES = [
  {
    channel: 'welcome',
    type: 'email',
    subject: 'Welcome to UniBuddy!',
    templateId: 'welcome',
    templateDataFn: (nickname: string, email: string) => ({
      nickname,
      email,
      loginUrl: 'https://unibuddy.dev/login',
    }),
  },
  {
    channel: 'purchase_confirmation',
    type: 'email',
    subject: 'Purchase Confirmation',
    templateId: 'purchase-confirmation',
    templateDataFn: (nickname: string, _email: string) => ({
      nickname,
      itemName: 'Course Material',
      amount: `${randInt(10, 200)}k VND`,
    }),
  },
  {
    channel: 'new_follower',
    type: 'in_app',
    subject: undefined,
    templateId: 'new-follower',
    templateDataFn: (nickname: string) => ({
      followerName: nickname,
      message: `${nickname} started following you`,
    }),
  },
  {
    channel: 'content_verified',
    type: 'in_app',
    subject: undefined,
    templateId: 'content-verified',
    templateDataFn: (nickname: string) => ({
      nickname,
      contentTitle: 'Your uploaded resource',
      message: 'Your content has been verified and is now live',
    }),
  },
  {
    channel: 'rating_received',
    type: 'in_app',
    subject: undefined,
    templateId: 'rating-received',
    templateDataFn: (nickname: string) => ({
      nickname,
      stars: randInt(3, 5),
      message: 'You received a new rating',
    }),
  },
];

const FIRST_NAMES = [
  'Minh',
  'Tuan',
  'Hieu',
  'Duc',
  'Long',
  'Nam',
  'Khanh',
  'Phuc',
  'Duy',
  'An',
  'Linh',
  'Trang',
  'Huong',
  'Ngoc',
  'Thao',
  'Mai',
  'Hoa',
  'Lan',
  'Yen',
  'Chi',
  'Bao',
  'Khoa',
  'Dat',
  'Trung',
  'Tien',
  'Phat',
  'Vinh',
  'Thanh',
  'Hung',
  'Son',
  'Nhi',
  'Uyen',
  'Hanh',
  'My',
  'Anh',
  'Phuong',
  'Thy',
  'Quyen',
  'Van',
  'Tam',
  'Quang',
  'Binh',
  'Cuong',
  'Ha',
  'Huy',
  'Lam',
  'Nhat',
  'Sang',
  'Tai',
  'Tri',
];

export function genNotifications(count = 200) {
  return Array.from({ length: count }, (_, i) => {
    const userIdx = randInt(0, USER_COUNT - 1);
    const userId = authUserIds[userIdx];
    const nickname = FIRST_NAMES[userIdx];
    const email = `${nickname.toLowerCase()}${userIdx}@unibuddy.dev`;
    const template = NOTIFICATION_TEMPLATES[i % NOTIFICATION_TEMPLATES.length];

    // Status distribution: 70% delivered, 15% sent, 10% pending, 5% failed
    const r = Math.random();
    const status = r < 0.7 ? 'delivered' : r < 0.85 ? 'sent' : r < 0.95 ? 'pending' : 'failed';

    const attempts = status === 'pending' ? 0 : status === 'failed' ? randInt(1, 3) : 1;
    const sentAt =
      status === 'sent' || status === 'delivered'
        ? new Date(Date.now() - randInt(0, 60) * 86400000)
        : undefined;

    return {
      userId,
      type: template.type,
      channel: template.channel,
      recipient: template.type === 'email' ? email : userId,
      subject: template.subject,
      templateId: template.templateId,
      templateData: template.templateDataFn(nickname, email),
      status,
      attempts,
      maxAttempts: 3,
      lastAttemptAt: attempts > 0 ? new Date() : undefined,
      sentAt,
      errorMessage: status === 'failed' ? 'SMTP connection timeout' : undefined,
      correlationId: crypto.randomUUID(),
      createdAt: new Date(Date.now() - randInt(0, 60) * 86400000),
      updatedAt: new Date(),
    };
  });
}
