import type { GridLayoutInput } from '@retikz/layout';
import type { GridLayoutInspectOptions } from '@retikz/layout/inspect';

import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import { gridLayout } from '../grid-layout';

/** 创建带当前实例检查请求的 Grid 布局嵌入项 */
export const inspectGridLayout = (
  id: string,
  input: GridLayoutInput,
  inspect: false | true | GridLayoutInspectOptions = true,
) => gridLayout(id, input, createInspectionVanillaAuthoring({ inspector: GRID_LAYOUT_INSPECTOR_KEY, value: inspect }));
