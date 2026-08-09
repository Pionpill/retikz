import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { BoundaryFit, BoundaryKeyword } from './constants';
import type { BoundarySchema } from './schema';

/** 连接面引用类型（'shape' | 'circle' | 其它 shape 名 | {type, params}） */
export type IRBoundary = z.infer<typeof BoundarySchema>;

/** 连接面内置关键字联合（'shape' | 'circle'） */
export type BoundaryKeywordValue = ValueOf<typeof BoundaryKeyword>;

/** 内置规则连接面的拟合策略联合 */
export type BoundaryFitValue = ValueOf<typeof BoundaryFit>;
