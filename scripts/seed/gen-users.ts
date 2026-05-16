import * as bcrypt from 'bcrypt';
import { coursesByMajor } from './gen-academics';
import { skillsByCareer } from './gen-careers';
import { authUserIds, careerIds, majorIds, pick, pickN, randInt } from './ids';

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

const PASSWORD = 'Minh@1234567';

export async function genAuthUsers() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  return authUserIds.map((id, i) => ({
    id,
    email: `${FIRST_NAMES[i].toLowerCase()}${i}@unibuddy.dev`,
    password_hash: hash,
    nickname: FIRST_NAMES[i],
    roles: ['user'],
    subscription_plan: i < 10 ? 'CREATOR_PRO' : 'STUDENT_FREE',
    status: 'active',
    email_verified: true,
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  }));
}

export function genUserProfiles() {
  return authUserIds.map((userId, i) => {
    const majorIdx = i % 6;
    const courses = coursesByMajor(majorIdx);
    const course = pick(courses);
    const careerIdx = i % 8;
    const skills = skillsByCareer(careerIdx);

    return {
      userId,
      email: `${FIRST_NAMES[i].toLowerCase()}${i}@unibuddy.dev`,
      profile: {
        nickname: FIRST_NAMES[i],
        phone: `09${String(10000000 + i).slice(0, 8)}`,
        bio: `Student in ${['SE', 'CS', 'AI', 'DS', 'IS', 'CE'][majorIdx]} | Passionate about tech`,
        avatarUrl: null,
        dateOfBirth: new Date(2000 + (i % 5), i % 12, (i % 28) + 1),
        majorId: majorIds[majorIdx],
        courseId: course._id,
        semester: course.semester,
        careerId: careerIds[careerIdx],
        skillIds: pickN(skills, Math.min(skills.length, randInt(2, 4))),
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export function genWallets() {
  return authUserIds.map((userId) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    balance_in_cents: BigInt(randInt(0, 500000)),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  }));
}

export function genSubscriptions() {
  return authUserIds.map((userId, i) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    plan: i < 10 ? 'CREATOR_PRO' : 'STUDENT_FREE',
    status: 'ACTIVE',
    starts_at: new Date(),
    expires_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  }));
}
