import type { IRChild } from '@retikz/core';
import type { input } from 'zod';

import type { CellSchema, CellStyleSchema, CellLayoutSchema } from './cell';

/** Array 与 Map 共用的稀疏单元格 Source */
export type IRCell = Omit<input<typeof CellSchema>, 'content'> & {
  /** 格内纯文本或单个绘图子项；省略时保留无内容的格子 */
  content?: string | IRChild;
};

export type IRCellStyle = input<typeof CellStyleSchema>;

export type IRCellLayout = input<typeof CellLayoutSchema>;
