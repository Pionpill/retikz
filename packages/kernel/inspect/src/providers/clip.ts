import type { PathCommand } from '@retikz/core';

import { defineInspector } from '../contract';
import { ClipInspectOptionsSchema } from '../schema';
import { pathCommandsToChildren, pathStyle } from './geometry';

/** Scene 裁剪使用处的检查器标识 */
export const CLIP_INSPECTOR_KEY = Object.freeze({ namespace: 'inspect', type: 'clip' });

/** 显示分组使用的裁剪边缘，不应用主图裁剪 */
export const CLIP_INSPECTOR = defineInspector({
  ...CLIP_INSPECTOR_KEY,
  subject: { kind: 'primitive', type: 'group' },
  optionsSchema: ClipInspectOptionsSchema,
  inspect: (subject, context) => {
    if (!context.options.outline || subject.clipRef === undefined) return [];
    const resource = context.result.scene.resources?.find(
      candidate => candidate.kind === 'clip' && candidate.id === subject.clipRef,
    );
    if (resource?.kind !== 'clip') {
      context.warn('UnsupportedGeometry', 'Clip resource is unavailable');
      return [];
    }
    return pathCommandsToChildren(
      resource.path.commands as ReadonlyArray<PathCommand>,
      pathStyle(context.appearance.scopeColor),
      { implicitClose: true },
    ).map(child => ({ coordinateSpace: 'local' as const, child }));
  },
});
