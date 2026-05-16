import { CreateCareerHandler } from './handlers/create-career.handler';
import { CreateSkillHandler } from './handlers/create-skill.handler';
import { CreateUserProfileHandler } from './handlers/create-user-profile.handler';
import { DeleteCareerHandler } from './handlers/delete-career.handler';
import { DeleteSkillHandler } from './handlers/delete-skill.handler';
import { UpdateCareerHandler } from './handlers/update-career.handler';
import { UpdateProfileHandler } from './handlers/update-profile.handler';
import { UpdateSkillHandler } from './handlers/update-skill.handler';
import { UploadAvatarHandler } from './handlers/upload-avatar.handler';

export const COMMAND_HANDLERS = [
  UpdateProfileHandler,
  UploadAvatarHandler,
  CreateUserProfileHandler,
  CreateCareerHandler,
  UpdateCareerHandler,
  DeleteCareerHandler,
  CreateSkillHandler,
  UpdateSkillHandler,
  DeleteSkillHandler,
];
