import type { IRScopeProps } from '@retikz/core';
import type { IRChild } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../shared/cell/schema';
import type { ListCellSchema, ListIndexOptionsSchema, ListIndexStyleSchema, ListSchema } from './schema';

export type IRListIndexOptions = input<typeof ListIndexOptionsSchema>;
export type IRListIndexStyle = input<typeof ListIndexStyleSchema>;

/** List 专属单格 Source，允许内容宽度模式 */
export type IRListCell = Omit<input<typeof ListCellSchema>, 'content'> & { content: string | IRChild };

/** 稀疏 List Source，保留尚未合并的样式 */
export type IRList = Omit<
  input<typeof ListSchema>,
  keyof IRScopeProps | 'items' | 'data' | 'cellIdMode' | 'dataObjectDisplay'
> &
  Omit<IRScopeProps, 'style'> & {
    style?: IRCell['style'];
    /**
     * 直属格身份：explicit 仅显式 id，string 使用 items 字符串，index 由 List id 与零基下标生成
     * @default 'explicit'
     */
    cellIdMode?: input<typeof ListSchema>['cellIdMode'];
  } & (
    | {
        /** 字符串默认只提供 content；cellIdMode 为 string 时也提供 id */ items: Array<string | IRListCell>;
        data?: never;
        dataObjectDisplay?: never;
      }
    | {
        /** 递归展示 JSON 数组；index 模式为直属格生成 id */ data: NonNullable<input<typeof ListSchema>['data']>;
        items?: never;
        /** 非空对象值的展示方式，递归作用于嵌套 data
         * @default 'map'
         */
        dataObjectDisplay?: input<typeof ListSchema>['dataObjectDisplay'];
      }
  );
/** List 类型化工厂输入 */
export type ListInput = IRList;
