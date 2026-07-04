import type { z } from 'zod';

import type { DirectionalAnchorInput, ValueOf } from '../../../shared';
import type { AtDirection } from './constants';
import type { AtPositionSchema } from './schema';

/** 相对定位 IR 类型 `{ direction, of, distance? }`，与 IRPosition/PolarPosition union 平级 */
export type IRAtPosition = z.infer<typeof AtPositionSchema>;

/** at 方向字面量类型 */
export type AtDirectionValue = ValueOf<typeof AtDirection>;

export type AtDirectionInput = DirectionalAnchorInput;

export type IRAtPositionInput = Omit<IRAtPosition, 'direction'> & {
  direction: AtDirectionInput;
};
