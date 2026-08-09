import type { OverlayLayoutInput } from '@retikz/layout';
import type { OverlayLayoutInspectOptions } from '@retikz/layout/inspect';

import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import { overlayLayout } from '../overlay-layout';

/** 创建带当前实例检查请求的 Overlay 布局嵌入项 */
export const inspectOverlayLayout = (
  id: string,
  input: OverlayLayoutInput,
  inspect: false | true | OverlayLayoutInspectOptions = true,
) =>
  overlayLayout(
    id,
    input,
    createInspectionVanillaAuthoring({ inspector: OVERLAY_LAYOUT_INSPECTOR_KEY, value: inspect }),
  );
