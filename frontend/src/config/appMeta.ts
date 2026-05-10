import { mergeAppMetaFromEnv, type AppMeta } from './mergeAppMeta';

export type { AppMeta };
export { mergeAppMetaFromEnv } from './mergeAppMeta';

export const appMeta = mergeAppMetaFromEnv(import.meta.env);
