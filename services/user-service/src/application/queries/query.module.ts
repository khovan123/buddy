import { GetCareerByIdHandler } from './handlers/get-career-by-id.handler';
import { GetCareersHandler } from './handlers/get-careers.handler';
import { GetSkillByIdHandler } from './handlers/get-skill-by-id.handler';
import { GetSkillsHandler } from './handlers/get-skills.handler';
import { GetUserByIdHandler } from './handlers/get-user-by-id.handler';
import { GetUsersHandler } from './handlers/get-users.handler';

export const QUERY_HANDLERS = [
  GetUserByIdHandler,
  GetUsersHandler,
  GetCareersHandler,
  GetCareerByIdHandler,
  GetSkillsHandler,
  GetSkillByIdHandler,
];
