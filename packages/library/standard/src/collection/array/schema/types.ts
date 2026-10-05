import type { IRScopeProps } from '@retikz/core';
import type { IRChild } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { ArrayCellSchema, ArrayIndexOptionsSchema, ArrayIndexStyleSchema, ArraySchema } from './schema';

/** 启用索引带时的位置、自动起点或显式标号与文本外观 */
export type IRArrayIndexOptions = input<typeof ArrayIndexOptionsSchema>;

/** 索引文本的稀疏外观覆盖，不受单格样式影响 */
export type IRArrayIndexStyle = input<typeof ArrayIndexStyleSchema>;

/** Array 专属单格 Source，允许内容宽度模式 */
export type IRArrayCell = Omit<input<typeof ArrayCellSchema>, 'content'> & {
  /** 文字或唯一可绘制 child，支持已注册的第三方复合组件 */
  content?: string | IRChild;
};

/** 稀疏 Array Source，保留尚未合并的样式 */
export type IRArray = Omit<
  input<typeof ArraySchema>,
  keyof IRScopeProps | 'items' | 'data' | 'cellIdMode' | 'dataExpand' | 'skeleton'
> &
  Omit<IRScopeProps, 'style'> & {
    style?: IRCell['style'];
    /**
     * 直属格身份：explicit 仅显式 id，string 使用 items 字符串，index 由 Array id 与零基下标生成
     * @default 'explicit'
     */
    cellIdMode?: input<typeof ArraySchema>['cellIdMode'];
  } & (
    | {
        /** 字符串默认只提供 content；cellIdMode 为 string 时也提供 id */ items: Array<string | IRArrayCell>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** 递归展示 JSON 数组；index 模式为直属格生成 id */ data: NonNullable<input<typeof ArraySchema>['data']>;
        items?: never;
        skeleton?: never;
        /** 嵌套对象与数组的展开选择；true 全部展开，false 全部显示为文本，数组选择 map / array
         * @default true
         */
        dataExpand?: input<typeof ArraySchema>['dataExpand'];
      }
    | {
        /** 无真实数据的示意骨架，与 data 及显式结构互斥 */
        skeleton: NonNullable<input<typeof ArraySchema>['skeleton']>;
        items?: never;
        data?: never;
        dataExpand?: never;
      }
  );
