import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import type { GridLayoutInspectOptions } from '@retikz/layout/inspect';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import { gridLayout } from '../grid-layout';
import type { InputGridLayout } from '../normalize';

/** 创建带当前实例检查请求的 Grid 布局嵌入项 */
export const inspectGridLayout = (input: InputGridLayout, inspect: false | true | GridLayoutInspectOptions = true) =>
  gridLayout(input, createInspectionVanillaAuthoring({ inspector: GRID_LAYOUT_INSPECTOR_KEY, options: inspect }));
