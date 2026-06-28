import type { z } from 'zod';
import type { AtPositionSchema } from './schema';
import type { ValueOf } from '../../../types';
import type { AtDirection } from './constants';

/** 相对定位 IR 类型 `{ direction, of, distance? }`，与 IRPosition/PolarPosition union 平级 */
export type IRAtPosition = z.infer<typeof AtPositionSchema>;

/** at 方向字面量类型 */
export type AtDirectionValue = ValueOf<typeof AtDirection>;
