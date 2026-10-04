import type { IRScopeProps } from '@retikz/core';
import type { IRChild } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { ListCellSchema, ListIndexOptionsSchema, ListIndexStyleSchema, ListSchema } from './schema';

/** 启用索引带时的位置、显示起点与文本外观 */
export type IRListIndexOptions = input<typeof ListIndexOptionsSchema>;
/** 索引文本的稀疏外观覆盖，不受单格样式影响 */
export type IRListIndexStyle = input<typeof ListIndexStyleSchema>;

/** List 专属单格 Source，允许内容宽度模式 */
export type IRListCell = Omit<input<typeof ListCellSchema>, 'content'> & {
  /** 文字或唯一可绘制 child，支持已注册的第三方复合组件 */
  content: string | IRChild;
};

/** 稀疏 List Source，保留尚未合并的样式 */
export type IRList = Omit<
  input<typeof ListSchema>,
  keyof IRScopeProps | 'items' | 'data' | 'cellIdMode' | 'dataExpand'
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
        dataExpand?: never;
      }
    | {
        /** 递归展示 JSON 数组；index 模式为直属格生成 id */ data: NonNullable<input<typeof ListSchema>['data']>;
        items?: never;
        /** 嵌套对象与数组的展开选择；true 全部展开，false 全部显示为文本，数组选择 map / list
         * @default true
         */
        dataExpand?: input<typeof ListSchema>['dataExpand'];
      }
  );
/** List 类型化工厂输入 */
export type ListInput = IRList;
