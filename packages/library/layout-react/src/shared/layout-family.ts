import type {
  FlexLayoutItemInput,
  GridLayoutItemInput,
  LayoutItemKindValue,
  OverlayLayoutItemInput,
} from '@retikz/layout';
import type { EmbeddableContribution } from '@retikz/react';
import type { ReactElement, ReactNode } from 'react';

import { FlexLayoutProvider, GridLayoutProvider, OverlayLayoutProvider } from '@retikz/layout';
import { buildIRWithContributions } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { LayoutItemProps } from '../layout-item';

import { LayoutItem } from '../layout-item';

type LayoutItemInputByKind = Readonly<{
  flex: FlexLayoutItemInput;
  grid: GridLayoutItemInput;
  overlay: OverlayLayoutItemInput;
}>;

/** 布局项目内部转发给外层贡献的声明位置 */
type NestedAuthoringSite = NonNullable<EmbeddableContribution['authoringSites']>[number];

type CompositeDependencyContribution = EmbeddableContribution['compositeDependencies'];

const LAYOUT_PROVIDERS = new Set([FlexLayoutProvider, GridLayoutProvider, OverlayLayoutProvider]);

const isLayoutProviderKey = (key: CompositeDependencyContribution['roots'][number]): boolean =>
  [...LAYOUT_PROVIDERS].some(provider => provider.key.namespace === key.namespace && provider.key.type === key.type);

/** 透明展开 Fragment 和数组，同时保留需要由 container 验证的直属节点 */
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

/** 验证 LayoutItem 内部贡献只能折叠当前 Layout layout family */
const validateNestedLayoutContributions = (
  contributions: ReturnType<typeof buildIRWithContributions>['contributions'],
): void => {
  const foreign = contributions.some(
    contribution =>
      contribution.roots.length === 0 ||
      contribution.providers.length === 0 ||
      contribution.roots.some(root => !isLayoutProviderKey(root)) ||
      contribution.providers.some(provider => !LAYOUT_PROVIDERS.has(provider)),
  );
  if (foreign) throw new Error('Layout LayoutItem cannot forward foreign Tier 2 contributions');
};

/** 把单个 LayoutItem 的 child authoring 转为恰好一个 JSON-safe IRChild */
const resolveLayoutItemChild = (
  props: LayoutItemProps,
): Readonly<{
  /** 当前布局项目包含的 Core 子元素 */
  child: LayoutItemInputByKind[LayoutItemKindValue]['child'];
  /** 子元素内部按声明顺序收集的位置 */
  authoringSites: ReadonlyArray<NestedAuthoringSite>;
  /** 子元素按 authored 顺序携带的 Layout provider graph contributions */
  compositeDependencies: CompositeDependencyContribution;
}> => {
  const hasIR = props.ir !== undefined;
  const hasChildren = props.children !== undefined;
  if (hasIR === hasChildren) throw new Error('Layout LayoutItem requires exactly one of children or ir');
  if (hasIR) {
    return Object.freeze({
      child: props.ir,
      authoringSites: Object.freeze([]),
      compositeDependencies: Object.freeze({ roots: Object.freeze([]), providers: Object.freeze([]) }),
    });
  }
  const built = buildIRWithContributions(props.children);
  if (built.ir.children.length !== 1) {
    throw new Error('Layout LayoutItem React child must produce exactly one IRChild');
  }
  validateNestedLayoutContributions(built.contributions);
  return Object.freeze({
    child: built.ir.children[0],
    authoringSites: Object.freeze(
      built.authoringSites
        .filter(site => site.kind !== 'scene')
        .map(({ sourcePath, ...site }) => {
          void sourcePath;
          return Object.freeze(site) as NestedAuthoringSite;
        }),
    ),
    compositeDependencies: Object.freeze({
      roots: Object.freeze(built.contributions.flatMap(contribution => contribution.roots)),
      providers: Object.freeze(built.contributions.flatMap(contribution => contribution.providers)),
    }),
  });
};

/** 解析一个容器的直属 LayoutItem，并按期望 kind 生成 Layout authoring inputs */
export const resolveReactLayoutItems = <TKind extends LayoutItemKindValue>(
  children: ReactNode,
  expectedKind: TKind,
): Readonly<{
  /** 传给对应 Layout 布局定义的项目输入 */
  items: Array<LayoutItemInputByKind[TKind]>;
  /** 所有项目内部按声明顺序收集的位置 */
  authoringSites: ReadonlyArray<NestedAuthoringSite>;
  /** 所有项目内部按声明顺序转发的 Layout provider graph contribution */
  compositeDependencies: CompositeDependencyContribution;
}> => {
  const authoringSites: Array<NestedAuthoringSite> = [];
  const roots: Array<CompositeDependencyContribution['roots'][number]> = [];
  const providers: Array<CompositeDependencyContribution['providers'][number]> = [];
  const items = flattenLayoutChildren(children).map(child => {
    if (!isValidElement(child) || child.type !== LayoutItem) {
      throw new Error('Layout layout container direct children must be LayoutItem');
    }
    const props = (child as ReactElement<LayoutItemProps>).props;
    if (props.kind !== expectedKind) {
      throw new Error(`Layout layout container expects LayoutItem kind "${expectedKind}"`);
    }
    const { children: itemChildren, ir, itemKey, ...item } = props;
    void itemChildren;
    void ir;
    const resolved = resolveLayoutItemChild(props);
    authoringSites.push(...resolved.authoringSites);
    roots.push(...resolved.compositeDependencies.roots);
    providers.push(...resolved.compositeDependencies.providers);
    return { ...item, key: itemKey, child: resolved.child } as LayoutItemInputByKind[TKind];
  });
  return Object.freeze({
    items,
    authoringSites: Object.freeze(authoringSites),
    compositeDependencies: Object.freeze({ roots: Object.freeze(roots), providers: Object.freeze(providers) }),
  });
};
