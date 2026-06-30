import type { z } from 'zod';

import type { WebAnchorInput } from '../../../geometry/anchor';
import type { ValueOf } from '../../../types';
import type { AtDirection, LegacyAtDirectionAlias } from './constants';
import type { AtPositionSchema } from './schema';

/** 相对定位 IR 类型 `{ direction, of, distance? }`，与 IRPosition/PolarPosition union 平级 */
export type IRAtPosition = z.infer<typeof AtPositionSchema>;

/** at 方向字面量类型 */
export type AtDirectionValue = ValueOf<typeof AtDirection>;

export type LegacyAtDirectionAliasValue = keyof typeof LegacyAtDirectionAlias;

export type AtDirectionInput = WebAnchorInput | LegacyAtDirectionAliasValue;

export type IRAtPositionInput = Omit<IRAtPosition, 'direction'> & {
  direction: AtDirectionInput;
};
