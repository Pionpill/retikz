import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import type { GridLayoutInspectOptions } from '@retikz/layout/inspect';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import { gridLayout } from '../grid-layout';
import type { InputGridLayout } from '../normalize';

/** 创建带当前实例检查请求的GridLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param inspect 当前实例的检查请求，省略时为 true；false 关闭当前实例的请求
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const inspectGridLayout = (input: InputGridLayout, inspect: false | true | GridLayoutInspectOptions = true) =>
  gridLayout(input, createInspectionVanillaAuthoring({ inspector: GRID_LAYOUT_INSPECTOR_KEY, options: inspect }));
