import { defineInspector } from '@retikz/inspect';

import { OverlayLayoutArtifactSchema } from '../../composites/layout/overlay-layout';
import { STANDARD_NAMESPACE } from '../../composites/shared';
import { mergeLayoutInspectOptionsInput, STANDARD_LAYOUT_INSPECTOR_NAMESPACE } from '../shared';
import { inspectOverlayLayoutArtifact } from './output';
import { OverlayLayoutInspectOptionsInputSchema, OverlayLayoutInspectOptionsSchema } from './schema';

/** Overlay 布局检查器的稳定注册键 */
export const OVERLAY_LAYOUT_INSPECTOR_KEY = Object.freeze({
  namespace: STANDARD_LAYOUT_INSPECTOR_NAMESPACE,
  name: 'overlay-layout',
});

/** 从最终 Overlay 布局产物生成辅助内容的检查器定义 */
export const OVERLAY_LAYOUT_INSPECTOR = defineInspector({
  ...OVERLAY_LAYOUT_INSPECTOR_KEY,
  owner: { kind: 'composite', namespace: STANDARD_NAMESPACE, type: 'overlayLayout' },
  subjectSchema: OverlayLayoutArtifactSchema,
  optionsInputSchema: OverlayLayoutInspectOptionsInputSchema,
  optionsSchema: OverlayLayoutInspectOptionsSchema,
  mergeOptionsInput: mergeLayoutInspectOptionsInput,
  inspect: inspectOverlayLayoutArtifact,
});
