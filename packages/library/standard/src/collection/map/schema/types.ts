import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { MapSchema } from './schema';

/** 稀疏 Map Source，展示键允许重复 */
export type IRMap = Omit<input<typeof MapSchema>, keyof IRScopeProps | 'entries' | 'data' | 'dataExpand' | 'skeleton'> &
  Omit<IRScopeProps, 'style'> & {
    /** Map 集合的整体与键值角色样式输入 */
    style?: input<typeof MapSchema>['style'];
  } & (
    | {
        /** 显式键值单元格 */ entries: Array<{
          /** 当前条目的键侧文本或单元格声明 */
          key: string | IRCell;
          /** 当前条目的值侧文本或单元格声明 */
          value: string | IRCell;
        }>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** 递归展示 JSON 对象，不推导单元格 id */ data: NonNullable<input<typeof MapSchema>['data']>;
        entries?: never;
        skeleton?: never;
        /** 嵌套对象与数组的展开选择；true 全部展开，false 全部显示为文本，数组选择 map / array
         * @default true
         */
        dataExpand?: input<typeof MapSchema>['dataExpand'];
      }
    | {
        /** 无真实数据的示意骨架，与 data 及显式结构互斥 */
        skeleton: NonNullable<input<typeof MapSchema>['skeleton']>;
        entries?: never;
        data?: never;
        dataExpand?: never;
      }
  );
