import type { GridLayoutInput } from '@retikz/standard';
import type { GridLayoutInspectOptions } from '@retikz/standard/inspect';

import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/standard/inspect';

import { gridLayout } from '../grid-layout';

/** 创建带当前实例检查请求的 Grid 布局嵌入项 */
export const inspectGridLayout = (
  id: string,
  input: GridLayoutInput,
  inspect: false | true | GridLayoutInspectOptions = true,
) => gridLayout(id, input, createInspectionVanillaAuthoring({ inspector: GRID_LAYOUT_INSPECTOR_KEY, value: inspect }));
