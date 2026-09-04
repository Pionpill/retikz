import type { LayoutItemKindValue } from '@retikz/layout';
import type { InputFlexLayoutItem, InputGridLayoutItem, InputOverlayLayoutItem } from '@retikz/layout-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter, InputChild } from '@retikz/vanilla';
import type { ReactElement, ReactNode } from 'react';

import { RetikzLayoutError, RetikzLayoutErrorCode } from '@retikz/layout';
import { createInputScene } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { LayoutItemProps } from '../layout-item';

import { LayoutItem } from '../layout-item';

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

/** 收集单个 LayoutItem 的 React child，不在 React 内归一化 */
const resolveLayoutItemChild = (
  props: LayoutItemProps,
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
      message: 'Layout LayoutItem React child must contain exactly one authoring child',
      details: { component: 'LayoutItem', childCount: children?.length ?? 0 },
    });
  }
  return Object.freeze({ child: children[0], adapters: input.adapters });
};

/** 将 React 直属 LayoutItem 组装为匹配 Vanilla adapter 的 typed Input */
export const createInputLayoutItems = <TKind extends LayoutItemKindValue>(
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
    if (!isValidElement(child) || child.type !== LayoutItem) {
      throw new RetikzLayoutError({
        code: RetikzLayoutErrorCode.AuthoringInvalid,
        message: 'Layout layout container direct children must be LayoutItem',
        details: { expectedKind, index },
      });
    }
    const props = (child as ReactElement<LayoutItemProps>).props;
    if (props.kind !== expectedKind) {
      throw new RetikzLayoutError({
        code: RetikzLayoutErrorCode.AuthoringInvalid,
        message: `Layout layout container expects LayoutItem kind "${expectedKind}"`,
        details: { actualKind: props.kind, expectedKind, index },
      });
    }
    const { children: itemChildren, ir, itemKey, ...item } = props;
    void itemChildren;
    void ir;
    const resolved = resolveLayoutItemChild(props, `${context.id}:items:${index}`);
    adapters.push(...resolved.adapters);
    return {
      ...item,
      ...(itemKey === undefined ? {} : { key: itemKey }),
      child: resolved.child,
    } as LayoutItemInputByKind[TKind];
  });
  return Object.freeze({ items, adapters: Object.freeze(adapters) });
};
