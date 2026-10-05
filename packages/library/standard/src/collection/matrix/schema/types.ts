import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type { IRCell } from '../../_cell/schema';
import type { MatrixSchema, MatrixAxisIndexSchema } from './schema';

export type IRMatrixAxisIndex = input<typeof MatrixAxisIndexSchema>;
/** 三种入口互斥的 Matrix Source；单元格内容沿用共享绘图契约 */
export type IRMatrix = Omit<
  input<typeof MatrixSchema>,
  Exclude<keyof IRScopeProps, 'style'> | 'items' | 'data' | 'skeleton' | 'dataExpand'
> &
  Omit<IRScopeProps, 'style'> &
  (
    | { /** 显式二维单元格 */ items: Array<Array<string | IRCell>>; data?: never; skeleton?: never; dataExpand?: never }
    | {
        /** 二维 JSON 数据，格内结构按 dataExpand 展示 */
        data: NonNullable<input<typeof MatrixSchema>['data']>;
        items?: never;
        skeleton?: never;
        /** 选择格内对象与数组的展开形式 */
        dataExpand?: input<typeof MatrixSchema>['dataExpand'];
      }
    | {
        /** 无真实数据的矩形或格内符号 */ skeleton: NonNullable<input<typeof MatrixSchema>['skeleton']>;
        items?: never;
        data?: never;
        dataExpand?: never;
      }
  );
