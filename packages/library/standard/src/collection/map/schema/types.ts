import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { MapSchema } from './schema';

/** 稀疏 Map Source，展示键允许重复 */
export type IRMap = Omit<input<typeof MapSchema>, keyof IRScopeProps | 'entries' | 'data' | 'dataExpand'> &
  Omit<IRScopeProps, 'style'> & {
    style?: input<typeof MapSchema>['style'];
  } & (
    | {
        /** 显式键值单元格 */ entries: Array<{ key: string | IRCell; value: string | IRCell }>;
        data?: never;
        dataExpand?: never;
      }
    | {
        /** 递归展示 JSON 对象，不推导单元格 id */ data: NonNullable<input<typeof MapSchema>['data']>;
        entries?: never;
        /** 嵌套对象与数组的展开选择；true 全部展开，false 全部显示为文本，数组选择 map / list
         * @default true
         */
        dataExpand?: input<typeof MapSchema>['dataExpand'];
      }
  );
