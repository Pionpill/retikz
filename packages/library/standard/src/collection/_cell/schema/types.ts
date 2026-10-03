import type { IRChild } from '@retikz/core';
import type { input } from 'zod';

import type { CellSchema, CellStyleSchema, CellLayoutSchema } from './cell';

/** List 与 Map 共用的稀疏单元格 Source */
export type IRCell = Omit<input<typeof CellSchema>, 'content'> & { content: string | IRChild };
export type IRCellStyle = input<typeof CellStyleSchema>;
export type IRCellLayout = input<typeof CellLayoutSchema>;
