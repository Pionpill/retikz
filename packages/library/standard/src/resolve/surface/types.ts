import type { resolveBoxSpacing } from '@retikz/core';

import type { IRSurface } from '../../composites/presentation/surface';

/** 已展开 padding 并确定 overflow 与边角半径的 Surface */
export type CanonicalSurface = Omit<IRSurface, 'padding' | 'overflow' | 'cornerRadius'> &
  Required<Pick<IRSurface, 'overflow' | 'cornerRadius'>> & { padding: ReturnType<typeof resolveBoxSpacing> };
