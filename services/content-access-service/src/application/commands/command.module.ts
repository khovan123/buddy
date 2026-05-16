import { GrantAccessHandler } from './handlers/grant-access.handler';
import { RevokeAccessHandler } from './handlers/revoke-access.handler';

export const COMMAND_HANDLERS = [GrantAccessHandler, RevokeAccessHandler];
