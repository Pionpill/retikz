import { defineInspector } from '@retikz/inspect';

import { GridLayoutArtifactSchema } from '../../composites/layout/grid-layout';
import { STANDARD_NAMESPACE } from '../../composites/shared';
import { mergeLayoutInspectOptionsInput, STANDARD_LAYOUT_INSPECTOR_NAMESPACE } from '../shared';
import { inspectGridLayoutArtifact } from './output';
import { GridLayoutInspectOptionsInputSchema, GridLayoutInspectOptionsSchema } from './schema';

/** Grid 布局检查器的稳定注册键 */
export const GRID_LAYOUT_INSPECTOR_KEY = Object.freeze({
  namespace: STANDARD_LAYOUT_INSPECTOR_NAMESPACE,
  name: 'grid-layout',
});

/** 从最终 Grid 布局产物生成辅助内容的检查器定义 */
export const GRID_LAYOUT_INSPECTOR = defineInspector({
  ...GRID_LAYOUT_INSPECTOR_KEY,
  owner: { kind: 'composite', namespace: STANDARD_NAMESPACE, type: 'gridLayout' },
  subjectSchema: GridLayoutArtifactSchema,
  optionsInputSchema: GridLayoutInspectOptionsInputSchema,
  optionsSchema: GridLayoutInspectOptionsSchema,
  mergeOptionsInput: mergeLayoutInspectOptionsInput,
  inspect: inspectGridLayoutArtifact,
});
