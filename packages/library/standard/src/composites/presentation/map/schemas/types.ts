import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../shared/schemas';
import type { MapSchema } from './schema';

/** 稀疏 Map Source，展示键允许重复 */
export type IRMap = Omit<input<typeof MapSchema>, keyof IRScopeProps | 'entries'> &
  Omit<IRScopeProps, 'style'> & {
    style?: input<typeof MapSchema>['style'];
    entries: Array<{ key: string | IRCell; value: string | IRCell }>;
  };
/** Map 类型化工厂输入 */
export type MapInput = IRMap;
