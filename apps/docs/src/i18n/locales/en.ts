import enJson from './en.json';
import type { I18nResources } from './zh';

/** English copy. Structure mirrors zh.json; keep keys in sync. Type annotation enforces parity at compile time. */
export const en: I18nResources = enJson;

export default en;
