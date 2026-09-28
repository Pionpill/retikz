import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import type { OverlayLayoutInspectOptions } from '@retikz/layout/inspect';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import type { InputOverlayLayout } from '../normalize';
import { overlayLayout } from '../overlay-layout';

/** 创建带当前实例检查请求的OverlayLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param inspect 当前实例的检查请求，省略时为 true；false 关闭当前实例的请求
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const inspectOverlayLayout = (
  input: InputOverlayLayout,
  inspect: false | true | OverlayLayoutInspectOptions = true,
) =>
  overlayLayout(input, createInspectionVanillaAuthoring({ inspector: OVERLAY_LAYOUT_INSPECTOR_KEY, options: inspect }));
