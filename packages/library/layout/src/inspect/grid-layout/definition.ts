import { defineInspector } from '@retikz/inspect';

import { GridLayoutArtifactSchema } from '../../composites/grid-layout';
import { LAYOUT_NAMESPACE } from '../../shared';
import { LAYOUT_INSPECTOR_NAMESPACE, mergeLayoutInspectOptionsInput } from '../shared';
import { inspectGridLayoutArtifact } from './output';
import { GridLayoutInspectOptionsInputSchema, GridLayoutInspectOptionsSchema } from './schema';

/** Grid 布局检查器的稳定注册键 */
export const GRID_LAYOUT_INSPECTOR_KEY = Object.freeze({
  namespace: LAYOUT_INSPECTOR_NAMESPACE,
  type: 'grid-layout',
});

/** 从最终 Grid 布局产物生成辅助内容的检查器定义 */
export const GRID_LAYOUT_INSPECTOR = defineInspector({
  ...GRID_LAYOUT_INSPECTOR_KEY,
  owner: { kind: 'composite', namespace: LAYOUT_NAMESPACE, type: 'gridLayout' },
  subjectSchema: GridLayoutArtifactSchema,
  optionsInputSchema: GridLayoutInspectOptionsInputSchema,
  optionsSchema: GridLayoutInspectOptionsSchema,
  mergeOptionsInput: mergeLayoutInspectOptionsInput,
  inspect: inspectGridLayoutArtifact,
});
