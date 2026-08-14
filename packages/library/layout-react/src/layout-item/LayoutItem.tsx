import type { FlexLayoutItemInput, GridLayoutItemInput, OverlayLayoutItemInput } from '@retikz/layout';
import type { InputEmbedContribution } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

type IRChild = InputEmbedContribution['node'];

type LayoutItemChildSource =
  | Readonly<{ children: ReactNode; ir?: never }>
  | Readonly<{ children?: never; ir: IRChild }>;

/** FlexLayout 直属 item 的 React authoring props */
export type FlexLayoutItemProps = Omit<FlexLayoutItemInput, 'child' | 'key'> &
  Readonly<{ kind: 'flex'; itemKey: string }> &
  LayoutItemChildSource;

/** GridLayout 直属 item 的 React authoring props */
export type GridLayoutItemProps = Omit<GridLayoutItemInput, 'child' | 'key'> &
  Readonly<{ kind: 'grid'; itemKey: string }> &
  LayoutItemChildSource;

/** OverlayLayout 直属 item 的 React authoring props */
export type OverlayLayoutItemProps = Omit<OverlayLayoutItemInput, 'child' | 'key'> &
  Readonly<{ kind: 'overlay'; itemKey: string }> &
  LayoutItemChildSource;

/** 三种布局容器共用的 kind 判别 React item props */
export type LayoutItemProps = FlexLayoutItemProps | GridLayoutItemProps | OverlayLayoutItemProps;

const LayoutItemComponent: FC<LayoutItemProps> = () => {
  throw new Error('Layout LayoutItem must be a direct child of FlexLayout, GridLayout, or OverlayLayout');
};

/** 只由 Layout 布局容器静态读取的语义 item 组件 */
export const LayoutItem = LayoutItemComponent;

LayoutItem.displayName = 'LayoutItem';
