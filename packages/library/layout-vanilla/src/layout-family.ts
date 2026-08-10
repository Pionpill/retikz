import type { VanillaTier2Contribution } from '@retikz/vanilla';

import { FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition } from '@retikz/layout';

/** 为每次 Vanilla family contribution 返回可变的布局 definition 副本 */
export const makeVanillaLayoutComposites = (): ReturnType<VanillaTier2Contribution['makeComposites']> => [
  FlexLayoutDefinition,
  GridLayoutDefinition,
  OverlayLayoutDefinition,
];
