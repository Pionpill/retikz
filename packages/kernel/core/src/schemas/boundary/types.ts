import type { z } from 'zod';

import type { ValueOf } from '../../types';
import type { BoundaryKeyword } from './constants';
import type { BoundarySchema } from './schema';

/** 连接面引用类型（'shape' | 'circle' | 其它 shape 名 | {type, params}） */
export type IRBoundary = z.infer<typeof BoundarySchema>;

/** 连接面保留关键字联合（'shape' | 'circle'；其余取值为借用的 shape 引用） */
export type BoundaryKeywordValue = ValueOf<typeof BoundaryKeyword>;
