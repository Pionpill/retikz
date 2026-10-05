import type { LayoutItemKind } from '@retikz/layout';
import { RetikzLayoutError, RetikzLayoutErrorCode } from '@retikz/layout';
import type { InputFlexLayoutItem, InputGridLayoutItem, InputOverlayLayoutItem } from '@retikz/layout-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import { createInputScene } from '@retikz/react';
import type { AnyInputEmbedAdapter, InputChild } from '@retikz/vanilla';
import type { ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import type { FlexLayoutItemProps, GridLayoutItemProps, OverlayLayoutItemProps } from '../layout-item';
import { FlexLayoutItem, GridLayoutItem, OverlayLayoutItem } from '../layout-item';

type LayoutItemAuthoringProps = FlexLayoutItemProps | GridLayoutItemProps | OverlayLayoutItemProps;

/** 闭合布局种类对应的 React 子项身份 */
const layoutItemComponents = { flex: FlexLayoutItem, grid: GridLayoutItem, overlay: OverlayLayoutItem };

type LayoutItemInputByKind = Readonly<{
  flex: InputFlexLayoutItem;
  grid: InputGridLayoutItem;
  overlay: InputOverlayLayoutItem;
}>;

/** 透明展开 Fragment 和数组，同时保留需要由容器验证的直属节点 */
const flattenLayoutChildren = (children: ReactNode): Array<ReactNode> => {
  const flattened: Array<ReactNode> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      flattenLayoutChildren((child as ReactElement<{ children?: ReactNode }>).props.children).forEach(value =>
        flattened.push(value),
      );
      return;
    }

    flattened.push(child);
  });

  return flattened;
};

/** 收集单个布局子项的 React child，不在 React 内归一化 */
const resolveLayoutItemChild = (
  props: LayoutItemAuthoringProps,
  embedIdPrefix: string,
): Readonly<{
  /** 当前布局项目包含的作者侧子元素 */
  child: InputChild;
  /** React 子树需要注册到根 Scene 的 Vanilla adapter */
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}> => {
  if (props.ir !== undefined) return Object.freeze({ child: props.ir, adapters: [] });

  const input = createInputScene(props.children, { embedIdPrefix });
  const children = input.scene.children;
  if (children === undefined || children.length !== 1) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.AuthoringInvalid,
      message: 'Layout item must contain exactly one authoring child',
      details: { childCount: children?.length ?? 0 },
    });
  }

  return Object.freeze({ child: children[0], adapters: input.adapters });
};

/**
 * 将 React 直属布局子项组装为匹配 Vanilla adapter 的 typed Input
 * @template TKind 预期的布局项种类，同时决定返回 items 的输入类型
 */
export const createInputLayoutItems = <TKind extends LayoutItemKind>(
  children: ReactNode,
  expectedKind: TKind,
  context: ReactInputEmbedContext,
): Readonly<{
  /** 传给对应 Layout Vanilla adapter 的项目输入 */
  items: Array<LayoutItemInputByKind[TKind]>;
  /** React 子树需要注册到根 Scene 的 Vanilla adapter */
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}> => {
  const adapters: Array<AnyInputEmbedAdapter> = [];
  const items = flattenLayoutChildren(children).map((child, index) => {
    const expectedComponent = layoutItemComponents[expectedKind];
    if (!isValidElement(child) || child.type !== expectedComponent) {
      throw new RetikzLayoutError({
        code: RetikzLayoutErrorCode.AuthoringInvalid,
        message: `Layout container expects ${expectedComponent.displayName} as a direct child`,
        details: { expectedKind, expectedComponent: expectedComponent.displayName, index },
      });
    }

    const props = (child as ReactElement<LayoutItemAuthoringProps>).props;
    const { children: itemChildren, ir, itemKey, ...item } = props;
    void itemChildren;
    void ir;
    const resolved = resolveLayoutItemChild(props, `${context.id}:items:${index}`);
    adapters.push(...resolved.adapters);

    return {
      ...item,
      kind: expectedKind,
      ...(itemKey === undefined ? {} : { key: itemKey }),
      child: resolved.child,
    } as LayoutItemInputByKind[TKind];
  });

  return Object.freeze({ items, adapters: Object.freeze(adapters) });
};
