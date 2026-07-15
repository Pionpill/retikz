import type { ChangeItem } from '../types';

/** beta.2 发布包统一采用 ESM-only 的用户可见变更。 */
export const esmOnlyChangeItem: ChangeItem = {
  label: {
    zh: 'BREAKING：发布格式改为 ESM-only',
    en: 'BREAKING: publishing is now ESM-only',
  },
  content: {
    zh: '仅发布 ES module 运行时代码，并要求 Node.js 24 或更高版本。',
    en: 'Only ES module runtime code is published, with Node.js 24 or newer required.',
  },
};
