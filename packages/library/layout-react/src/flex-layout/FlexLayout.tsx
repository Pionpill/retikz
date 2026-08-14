import type { FlexLayoutInput } from '@retikz/layout';
import type { InputFlexLayout } from '@retikz/layout-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { LayoutItemKind } from '@retikz/layout';
import { FlexLayoutInputEmbedAdapter } from '@retikz/layout-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { LayoutEmbeddableComponent } from '../shared';

import { createInputLayoutItems } from '../shared';

/** Flex 布局的 React 属性 */
export type FlexLayoutProps = Omit<FlexLayoutInput, 'children'> &
  Readonly<{
    /** 交给可选编译驱动解释的不透明声明数据 */
    authoring?: unknown;
    /** 必须由 Flex 类型布局项目组成的子元素 */
    children?: ReactNode;
  }>;

/** 将 React LayoutItem children 组装为 Vanilla FlexLayout 输入 */
const createFlexLayoutInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { authoring: _authoring, children, ...input } = props as FlexLayoutProps;
  void _authoring;
  const collected = createInputLayoutItems(children, LayoutItemKind.Flex, context);
  return withInputEmbedAdapters({ ...input, children: collected.items } satisfies InputFlexLayout, collected.adapters);
};

const FlexLayoutComponent: FC<FlexLayoutProps> = () => null;

/** Layout Flex 布局的 React 声明组件 */
export const FlexLayout = FlexLayoutComponent as LayoutEmbeddableComponent<FlexLayoutProps>;

FlexLayout.displayName = 'FlexLayout';
FlexLayout.isTier2Embeddable = true;
FlexLayout.inputEmbedAdapter = FlexLayoutInputEmbedAdapter;
FlexLayout.createInputEmbedProps = createFlexLayoutInput;
