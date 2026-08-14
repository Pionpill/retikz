import type {
  FlexLayoutInput,
  FlexLayoutItemInput,
  GridLayoutInput,
  GridLayoutItemInput,
  OverlayLayoutInput,
  OverlayLayoutItemInput,
} from '@retikz/layout';
import type { InputChild } from '@retikz/vanilla';

/** 在根 Scene traversal 中归一化 child 的 Vanilla Layout item */
type InputLayoutItem<TItem> = Omit<TItem, 'child'> & {
  /** 直属布局 child 的作者侧输入 */
  child: InputChild;
};

/** Vanilla FlexLayout item 输入 */
export type InputFlexLayoutItem = InputLayoutItem<FlexLayoutItemInput>;

/** Vanilla GridLayout item 输入 */
export type InputGridLayoutItem = InputLayoutItem<GridLayoutItemInput>;

/** Vanilla OverlayLayout item 输入 */
export type InputOverlayLayoutItem = InputLayoutItem<OverlayLayoutItemInput>;

/** Vanilla FlexLayout authoring 输入 */
export type InputFlexLayout = Omit<FlexLayoutInput, 'children'> & {
  children?: ReadonlyArray<InputFlexLayoutItem>;
};

/** Vanilla GridLayout authoring 输入 */
export type InputGridLayout = Omit<GridLayoutInput, 'children'> & {
  children?: ReadonlyArray<InputGridLayoutItem>;
};

/** Vanilla OverlayLayout authoring 输入 */
export type InputOverlayLayout = Omit<OverlayLayoutInput, 'children'> & {
  children?: ReadonlyArray<InputOverlayLayoutItem>;
};
