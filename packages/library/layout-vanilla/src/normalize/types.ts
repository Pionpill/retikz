import type {
  InputFlexLayoutConfig,
  InputFlexLayoutItemConfig,
  InputGridLayoutConfig,
  InputGridLayoutItemConfig,
  InputOverlayLayoutConfig,
  InputOverlayLayoutItemConfig,
} from '@retikz/layout';
import type { InputChild } from '@retikz/vanilla';

/** 在根 Scene traversal 中归一化 child 的 Vanilla Layout item */
type InputLayoutItem<TItem> = Omit<TItem, 'child'> & {
  /** 直属布局 child 的作者侧输入 */
  child: InputChild;
};

/** Vanilla FlexLayout item 输入 */
export type InputFlexLayoutItem = InputLayoutItem<InputFlexLayoutItemConfig>;

/** Vanilla GridLayout item 输入 */
export type InputGridLayoutItem = InputLayoutItem<InputGridLayoutItemConfig>;

/** Vanilla OverlayLayout item 输入 */
export type InputOverlayLayoutItem = InputLayoutItem<InputOverlayLayoutItemConfig>;

/** Vanilla FlexLayout authoring 输入 */
export type InputFlexLayout = Omit<InputFlexLayoutConfig, 'children'> & {
  /** 作者声明的直属子项，省略时按空列表处理
   * @default []
   */
  children?: ReadonlyArray<InputFlexLayoutItem>;
};

/** Vanilla GridLayout authoring 输入 */
export type InputGridLayout = Omit<InputGridLayoutConfig, 'children'> & {
  /** 作者声明的直属子项，省略时按空列表处理
   * @default []
   */
  children?: ReadonlyArray<InputGridLayoutItem>;
};

/** Vanilla OverlayLayout authoring 输入 */
export type InputOverlayLayout = Omit<InputOverlayLayoutConfig, 'children'> & {
  /** 作者声明的直属子项，省略时按空列表处理
   * @default []
   */
  children?: ReadonlyArray<InputOverlayLayoutItem>;
};
