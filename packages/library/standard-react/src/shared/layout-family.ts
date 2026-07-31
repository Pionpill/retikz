import type { EmbeddableContribution } from '@retikz/react';
import type {
  FlexLayoutItemInput,
  GridLayoutItemInput,
  LayoutItemKindValue,
  OverlayLayoutItemInput,
} from '@retikz/standard';
import type { ReactElement, ReactNode } from 'react';

import { buildIRWithContributions } from '@retikz/react';
import { StandardLayoutPreset } from '@retikz/standard';
import { Children, Fragment, isValidElement } from 'react';

import type { LayoutItemProps } from '../layout-item';

import { LayoutItem } from '../layout-item';

type LayoutItemInputByKind = Readonly<{
  flex: FlexLayoutItemInput;
  grid: GridLayoutItemInput;
  overlay: OverlayLayoutItemInput;
}>;

/** 三种 Standard layout React adapter 共用的 contribution namespace */
export const StandardLayoutReactNamespace = 'standard.layout';

/** 为每次 React family contribution 返回可变的布局 definition 副本 */
export const makeReactStandardLayoutComposites = () => [...StandardLayoutPreset.compile.composites];

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
  child: LayoutItemInputByKind[LayoutItemKindValue]['child'];
  inspection: NonNullable<EmbeddableContribution['inspectionRoots']> | null;
}> => {
  const hasIR = props.ir !== undefined;
  const hasChildren = props.children !== undefined;
  if (hasIR === hasChildren) throw new Error('Standard LayoutItem requires exactly one of children or ir');
  if (hasIR) return { child: props.ir, inspection: null };
  const built = buildIRWithContributions(props.children);
  if (built.ir.children.length !== 1) {
    throw new Error('Standard LayoutItem React child must produce exactly one IRChild');
  }
  validateNestedLayoutContributions(built.contributions);
  const inspection = built.inspectionRoots.map(root => {
    const [sceneSegment, ...path] = root.locator.path;
    if (sceneSegment.index !== 0) {
      throw new Error('Standard LayoutItem inspection root must be relative to its sole IRChild');
    }
    return Object.freeze({ locator: Object.freeze({ path }), tree: root.tree });
  });
  return {
    child: built.ir.children[0],
    inspection: inspection.length === 0 ? null : Object.freeze(inspection),
  };
};

/** 解析一个容器的直属 LayoutItem，并按期望 kind 生成 Standard authoring inputs */
export const resolveReactLayoutItems = <TKind extends LayoutItemKindValue>(
  children: ReactNode,
  expectedKind: TKind,
): Readonly<{
  items: Array<LayoutItemInputByKind[TKind]>;
  inspectionChildren: Array<NonNullable<EmbeddableContribution['inspectionRoots']> | null>;
}> => {
  const inspectionChildren: Array<NonNullable<EmbeddableContribution['inspectionRoots']> | null> = [];
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
    inspectionChildren.push(resolved.inspection);
    return { ...item, key: itemKey, child: resolved.child } as LayoutItemInputByKind[TKind];
  });
  return Object.freeze({ items, inspectionChildren });
};

/** 为一个 Standard layout contribution 创建相对单 node 的 inspection tree */
export const createReactLayoutInspectionRoots = (
  inspect: boolean | Readonly<Record<string, unknown>> | undefined,
  children: Array<NonNullable<EmbeddableContribution['inspectionRoots']> | null>,
): NonNullable<EmbeddableContribution['inspectionRoots']> =>
  Object.freeze([
    Object.freeze({
      locator: Object.freeze({ path: [] }),
      tree: Object.freeze({
        ...(inspect === undefined ? {} : { policy: Object.freeze({ component: inspect }) }),
        ...(children.every(child => child === null) ? {} : { children: Object.freeze(children) }),
      }),
    }),
  ]);
