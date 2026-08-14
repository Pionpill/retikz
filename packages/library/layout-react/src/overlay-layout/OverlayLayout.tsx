import type { OverlayLayoutInput } from '@retikz/layout';
import type { InputOverlayLayout } from '@retikz/layout-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { LayoutItemKind } from '@retikz/layout';
import { OverlayLayoutInputEmbedAdapter } from '@retikz/layout-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { LayoutEmbeddableComponent } from '../shared';

import { createInputLayoutItems } from '../shared';

/** Overlay 布局的 React 属性 */
export type OverlayLayoutProps = Omit<OverlayLayoutInput, 'children'> &
  Readonly<{
    /** 交给可选编译驱动解释的不透明声明数据 */
    authoring?: unknown;
    /** 必须由 Overlay 类型布局项目组成的子元素 */
    children?: ReactNode;
  }>;

/** 将 React LayoutItem children 组装为 Vanilla OverlayLayout 输入 */
const createOverlayLayoutInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { authoring: _authoring, children, ...input } = props as OverlayLayoutProps;
  void _authoring;
  const collected = createInputLayoutItems(children, LayoutItemKind.Overlay, context);
  return withInputEmbedAdapters(
    { ...input, children: collected.items } satisfies InputOverlayLayout,
    collected.adapters,
  );
};

const OverlayLayoutComponent: FC<OverlayLayoutProps> = () => null;

/** Layout Overlay 布局的 React 声明组件 */
export const OverlayLayout = OverlayLayoutComponent as LayoutEmbeddableComponent<OverlayLayoutProps>;

OverlayLayout.displayName = 'OverlayLayout';
OverlayLayout.isTier2Embeddable = true;
OverlayLayout.inputEmbedAdapter = OverlayLayoutInputEmbedAdapter;
OverlayLayout.createInputEmbedProps = createOverlayLayoutInput;
