import { CreateCollectionHandler } from './handlers/create-collection.handler';
import { CreateCourseHandler } from './handlers/create-course.handler';
import { CreateMajorHandler } from './handlers/create-major.handler';
import { CreateResourceHanlder } from './handlers/create-resource.handler';
import { CreateTutorialHanlder } from './handlers/create-tutorial.handler';
import { DeleteCourseHandler } from './handlers/delete-course.handler';
import { DeleteMajorHandler } from './handlers/delete-major.handler';
import { UpdateCourseHandler } from './handlers/update-course.handler';
import { UpdateMajorHandler } from './handlers/update-major.handler';

export const COMMAND_HANDLERS = [
  CreateCollectionHandler,
  CreateResourceHanlder,
  CreateTutorialHanlder,
  CreateMajorHandler,
  UpdateMajorHandler,
  DeleteMajorHandler,
  CreateCourseHandler,
  UpdateCourseHandler,
  DeleteCourseHandler,
];
