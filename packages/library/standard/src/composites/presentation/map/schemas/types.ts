import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../shared/schemas';
import type { MapSchema } from './schema';

/** 稀疏 Map Source，展示键允许重复 */
export type IRMap = Omit<input<typeof MapSchema>, keyof IRScopeProps | 'entries' | 'data'> &
  Omit<IRScopeProps, 'style'> & {
    style?: input<typeof MapSchema>['style'];
  } & (
    | { /** 显式键值单元格 */ entries: Array<{ key: string | IRCell; value: string | IRCell }>; data?: never }
    | { /** 递归展示 JSON 对象，不推导单元格 id */ data: NonNullable<input<typeof MapSchema>['data']>; entries?: never }
  );
/** Map 类型化工厂输入 */
export type MapInput = IRMap;
