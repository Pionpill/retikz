import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../shared/schemas';
import type { ListSchema } from './schema';

/** 稀疏 List Source，保留尚未合并的样式 */
export type IRList = Omit<input<typeof ListSchema>, keyof IRScopeProps | 'items'> &
  Omit<IRScopeProps, 'style'> & {
    style?: IRCell['style'];
    /** 字符串同时提供 content 和 id；对象可分别配置 */
    items: Array<string | IRCell>;
  };
/** List 类型化工厂输入 */
export type ListInput = IRList;
