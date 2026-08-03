import type { VanillaTier2Contribution } from '@retikz/vanilla';

import { FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition } from '@retikz/standard';

/** 三种 Standard layout embed 共用的 contribution namespace */
export const StandardLayoutVanillaNamespace = 'standard.layout';

/** 为每次 Vanilla family contribution 返回可变的布局 definition 副本 */
export const makeVanillaStandardLayoutComposites = (): ReturnType<VanillaTier2Contribution['makeComposites']> => [
  FlexLayoutDefinition,
  GridLayoutDefinition,
  OverlayLayoutDefinition,
];
