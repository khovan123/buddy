import { GetCollectionByIdHandler } from './handlers/get-collection-by-id.handler';
import { GetCollectionsByIdsHandler } from './handlers/get-collections-by-ids.handler';
import { GetContentMetaHandler } from './handlers/get-content-meta.handler';
import { GetCoursesByMajorHandler } from './handlers/get-courses-by-major.handler';
import { GetLibraryResourceBySlugHandler } from './handlers/get-library-resource-by-slug.handler';
import { GetLibraryResourceCollectionBySlugHandler } from './handlers/get-library-resource-collection-by-slug.handler';
import { GetLibraryResourceCollectionsHandler } from './handlers/get-library-resource-collections.handler';
import { GetLibraryResourcesHandler } from './handlers/get-library-resources.handler';
import { GetLibraryTutorialBySlugHandler } from './handlers/get-library-tutorial-by-slug.handler';
import { GetLibraryTutorialCollectionBySlugHandler } from './handlers/get-library-tutorial-collection-by-slug.handler';
import { GetLibraryTutorialCollectionsHandler } from './handlers/get-library-tutorial-collections.handler';
import { GetLibraryTutorialsHandler } from './handlers/get-library-tutorials.handler';
import { GetMyResourceCollectionsHandler } from './handlers/get-my-resource-collections.handler';
import { GetMyResourcesHandler } from './handlers/get-my-resources.handler';
import { GetMyTutorialCollectionsHandler } from './handlers/get-my-tutorial-collections.handler';
import { GetMyTutorialsHandler } from './handlers/get-my-tutorials.handler';
import { GetResourceByIdHandler } from './handlers/get-resource-by-id.handler';
import { GetResourceBySlugHandler } from './handlers/get-resource-by-slug.handler';
import { GetResourceCollectionBySlugHandler } from './handlers/get-resource-collection-by-slug.handler';
import { GetResourceCollectionsHandler } from './handlers/get-resource-collections.handler';
import { GetResourcePreviewHandler } from './handlers/get-resource-preview.handler';
import { GetResourceUploadHistoryHandler } from './handlers/get-resource-upload-history.handler';
import { GetResourcesByIdsHandler } from './handlers/get-resources-by-ids.handler';
import { GetResourcesByUserHandler } from './handlers/get-resources-by-user.handler';
import { GetResourcesHandler } from './handlers/get-resources.handler';
import { GetTopResourceCollectionsHandler } from './handlers/get-top-resource-collections.handler';
import { GetTopResourcesHandler } from './handlers/get-top-resources.handler';
import { GetTopTutorialCollectionsHandler } from './handlers/get-top-tutorial-collections.handler';
import { GetTopTutorialsHandler } from './handlers/get-top-tutorials.handler';
import { GetTutorialByIdHandler } from './handlers/get-tutorial-by-id.handler';
import { GetTutorialBySlugHandler } from './handlers/get-tutorial-by-slug.handler';
import { GetTutorialCollectionBySlugHandler } from './handlers/get-tutorial-collection-by-slug.handler';
import { GetTutorialCollectionsHandler } from './handlers/get-tutorial-collections.handler';
import { GetTutorialUploadHistoryHandler } from './handlers/get-tutorial-upload-history.handler';
import { GetTutorialsByIdsHandler } from './handlers/get-tutorials-by-ids.handler';
import { GetTutorialsByUserHandler } from './handlers/get-tutorials-by-user.handler';
import { GetTutorialsHandler } from './handlers/get-tutorials.handler';
import { GetUncollectedResourcesHandler } from './handlers/get-uncollected-resources.handler';
import { GetUncollectedTutorialsHandler } from './handlers/get-uncollected-tutorials.handler';

export const QUERY_HANDLERS = [
  GetResourcesHandler,
  GetMyResourcesHandler,
  GetResourcesByUserHandler,
  GetTutorialsByUserHandler,
  GetTutorialsHandler,
  GetMyTutorialsHandler,
  GetTopResourcesHandler,
  GetTopTutorialsHandler,
  GetTopResourceCollectionsHandler,
  GetTopTutorialCollectionsHandler,
  GetContentMetaHandler,
  GetCoursesByMajorHandler,
  GetResourceUploadHistoryHandler,
  GetTutorialUploadHistoryHandler,
  GetResourceBySlugHandler,
  GetTutorialBySlugHandler,
  GetResourceCollectionsHandler,
  GetTutorialCollectionsHandler,
  GetMyResourceCollectionsHandler,
  GetMyTutorialCollectionsHandler,
  GetResourceCollectionBySlugHandler,
  GetTutorialCollectionBySlugHandler,
  GetUncollectedResourcesHandler,
  GetUncollectedTutorialsHandler,
  GetLibraryResourcesHandler,
  GetLibraryTutorialsHandler,
  GetLibraryResourceCollectionsHandler,
  GetLibraryTutorialCollectionsHandler,
  GetLibraryResourceBySlugHandler,
  GetLibraryTutorialBySlugHandler,
  GetLibraryResourceCollectionBySlugHandler,
  GetLibraryTutorialCollectionBySlugHandler,
  GetResourcePreviewHandler,
  GetResourceByIdHandler,
  GetTutorialByIdHandler,
  GetCollectionByIdHandler,
  GetResourcesByIdsHandler,
  GetTutorialsByIdsHandler,
  GetCollectionsByIdsHandler,
];
