import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import type { FlexLayoutInspectOptions } from '@retikz/layout/inspect';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import { flexLayout } from '../flex-layout';
import type { InputFlexLayout } from '../normalize';

/** 创建带当前实例检查请求的 Flex 布局嵌入项 */
export const inspectFlexLayout = (
  id: string,
  input: InputFlexLayout,
  inspect: false | true | FlexLayoutInspectOptions = true,
) =>
  flexLayout(id, input, createInspectionVanillaAuthoring({ inspector: FLEX_LAYOUT_INSPECTOR_KEY, options: inspect }));
