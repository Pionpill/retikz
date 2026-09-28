import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import type { FlexLayoutInspectOptions } from '@retikz/layout/inspect';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';

import { flexLayout } from '../flex-layout';
import type { InputFlexLayout } from '../normalize';

/** 创建带当前实例检查请求的FlexLayout 嵌入项
 * @param input 容器与子项输入，保留传入对象引用
 * @param inspect 当前实例的检查请求，省略时为 true；false 关闭当前实例的请求
 * @returns 由布局适配器消费的 InputEmbed，不在创建时求解布局
 */
export const inspectFlexLayout = (input: InputFlexLayout, inspect: false | true | FlexLayoutInspectOptions = true) =>
  flexLayout(input, createInspectionVanillaAuthoring({ inspector: FLEX_LAYOUT_INSPECTOR_KEY, options: inspect }));
