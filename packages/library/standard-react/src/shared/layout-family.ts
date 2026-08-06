import type { EmbeddableContribution } from '@retikz/react';
import type {
  FlexLayoutItemInput,
  GridLayoutItemInput,
  LayoutItemKindValue,
  OverlayLayoutItemInput,
} from '@retikz/standard';
import type { ReactElement, ReactNode } from 'react';

import { buildIRWithContributions } from '@retikz/react';
import { FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition } from '@retikz/standard';
import { Children, Fragment, isValidElement } from 'react';

import type { LayoutItemProps } from '../layout-item';

import { LayoutItem } from '../layout-item';
import { StandardLayoutReactNamespace } from './constants';

type LayoutItemInputByKind = Readonly<{
  flex: FlexLayoutItemInput;
  grid: GridLayoutItemInput;
  overlay: OverlayLayoutItemInput;
}>;

/** 布局项目内部转发给外层贡献的声明位置 */
type NestedAuthoringSite = NonNullable<EmbeddableContribution['authoringSites']>[number];

/** 为每次 React family contribution 返回可变的布局 definition 副本 */
export const makeReactStandardLayoutComposites = (): ReturnType<EmbeddableContribution['makeComposites']> => [
  FlexLayoutDefinition,
  GridLayoutDefinition,
  OverlayLayoutDefinition,
];

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

/** 验证 LayoutItem 内部贡献只能折叠当前 Standard layout family */
const validateNestedLayoutContributions = (
  contributions: ReturnType<typeof buildIRWithContributions>['contributions'],
): void => {
  const foreign = contributions.some(
    contribution =>
      contribution.namespace !== StandardLayoutReactNamespace ||
      contribution.makeComposites !== makeReactStandardLayoutComposites ||
      Object.keys(contribution.datasets).length > 0,
  );
  if (foreign) throw new Error('Standard LayoutItem cannot forward foreign Tier 2 contributions');
};

/** 把单个 LayoutItem 的 child authoring 转为恰好一个 JSON-safe IRChild */
const resolveLayoutItemChild = (
  props: LayoutItemProps,
): Readonly<{
  /** 当前布局项目包含的 Core 子元素 */
  child: LayoutItemInputByKind[LayoutItemKindValue]['child'];
  /** 子元素内部按声明顺序收集的位置 */
  authoringSites: ReadonlyArray<NestedAuthoringSite>;
}> => {
  const hasIR = props.ir !== undefined;
  const hasChildren = props.children !== undefined;
  if (hasIR === hasChildren) throw new Error('Standard LayoutItem requires exactly one of children or ir');
  if (hasIR) return Object.freeze({ child: props.ir, authoringSites: Object.freeze([]) });
  const built = buildIRWithContributions(props.children);
  if (built.ir.children.length !== 1) {
    throw new Error('Standard LayoutItem React child must produce exactly one IRChild');
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
  });
};

/** 解析一个容器的直属 LayoutItem，并按期望 kind 生成 Standard authoring inputs */
export const resolveReactLayoutItems = <TKind extends LayoutItemKindValue>(
  children: ReactNode,
  expectedKind: TKind,
): Readonly<{
  /** 传给对应 Standard 布局定义的项目输入 */
  items: Array<LayoutItemInputByKind[TKind]>;
  /** 所有项目内部按声明顺序收集的位置 */
  authoringSites: ReadonlyArray<NestedAuthoringSite>;
}> => {
  const authoringSites: Array<NestedAuthoringSite> = [];
  const items = flattenLayoutChildren(children).map(child => {
    if (!isValidElement(child) || child.type !== LayoutItem) {
      throw new Error('Standard layout container direct children must be LayoutItem');
    }
    const props = (child as ReactElement<LayoutItemProps>).props;
    if (props.kind !== expectedKind) {
      throw new Error(`Standard layout container expects LayoutItem kind "${expectedKind}"`);
    }
    const { children: itemChildren, ir, itemKey, ...item } = props;
    void itemChildren;
    void ir;
    const resolved = resolveLayoutItemChild(props);
    authoringSites.push(...resolved.authoringSites);
    return { ...item, key: itemKey, child: resolved.child } as LayoutItemInputByKind[TKind];
  });
  return Object.freeze({ items, authoringSites: Object.freeze(authoringSites) });
};
