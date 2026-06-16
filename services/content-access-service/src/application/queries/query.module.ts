import { CheckAccessHandler } from './handlers/check-access.handler';
import { ListUserAccessHandler } from './handlers/list-user-access.handler';

export const QUERY_HANDLERS = [CheckAccessHandler, ListUserAccessHandler];
