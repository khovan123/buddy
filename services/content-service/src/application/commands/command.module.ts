import { CreateCollectionHandler } from './handlers/create-collection.handler';
import { CreateCourseHandler } from './handlers/create-course.handler';
import { CreateMajorHandler } from './handlers/create-major.handler';
import { CreateResourceHanlder } from './handlers/create-resource.handler';
import { CreateTutorialHanlder } from './handlers/create-tutorial.handler';
import { DeleteCourseHandler } from './handlers/delete-course.handler';
import { DeleteMajorHandler } from './handlers/delete-major.handler';
import { DeleteResourceHandler } from './handlers/delete-resource.handler';
import { DeleteTutorialHandler } from './handlers/delete-tutorial.handler';
import { RecheckResourceModerationHandler } from './handlers/recheck-resource-moderation.handler';
import { RecheckTutorialModerationHandler } from './handlers/recheck-tutorial-moderation.handler';
import { UpdateCourseHandler } from './handlers/update-course.handler';
import { UpdateResourceHandler } from './handlers/update-resource.handler';
import { UpdateTutorialHandler } from './handlers/update-tutorial.handler';
import { UpdateCollectionHandler } from './handlers/update-collection.handler';
import { UpdateMajorHandler } from './handlers/update-major.handler';

export const COMMAND_HANDLERS = [
  CreateCollectionHandler,
  CreateResourceHanlder,
  CreateTutorialHanlder,
  CreateMajorHandler,
  UpdateMajorHandler,
  DeleteMajorHandler,
  DeleteResourceHandler,
  DeleteTutorialHandler,
  RecheckResourceModerationHandler,
  RecheckTutorialModerationHandler,
  CreateCourseHandler,
  UpdateCourseHandler,
  DeleteCourseHandler,
  UpdateResourceHandler,
  UpdateTutorialHandler,
  UpdateCollectionHandler,
];
