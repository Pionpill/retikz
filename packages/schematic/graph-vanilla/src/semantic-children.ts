import type { InputChild, InputEmbedContext, NormalizedInputEmbedChildren } from '@retikz/vanilla';

import {
  BlockHeaderProviderKey,
  BlockProviderKey,
  BlockRowProviderKey,
  BlockSectionProviderKey,
  EntityProviderKey,
  GraphProviderKey,
  GroupProviderKey,
  RelationProviderKey,
} from '@retikz/graph';

import type { InputGraphChild, InputGraphMember } from './normalize';

import { RetikzGraphVanillaError, RetikzGraphVanillaErrorCode } from './errors';

type GraphSemanticProviderKey = typeof GraphProviderKey;

const providerKeyByType: Readonly<Record<InputGraphMember['type'], GraphSemanticProviderKey>> = Object.freeze({
  graph: GraphProviderKey,
  group: GroupProviderKey,
  block: BlockProviderKey,
  blockHeader: BlockHeaderProviderKey,
  blockSection: BlockSectionProviderKey,
  blockRow: BlockRowProviderKey,
  entity: EntityProviderKey,
  relation: RelationProviderKey,
});

/** 判断 Vanilla child 是否为可直接归一化的 Graph-family semantic 输入 */
export const isGraphSemanticInput = (child: InputGraphChild): child is InputGraphMember =>
  !('namespace' in child) && 'type' in child && child.type !== undefined && child.type in providerKeyByType;

/** 判断 Vanilla child 是否应交由 Core authoring normalizer 处理 */
const isGraphAuthoringChild = (child: InputGraphChild): child is InputChild => !isGraphSemanticInput(child);

const visitSemanticChildren = (child: InputGraphMember, visit: (nestedChild: InputGraphChild) => void): void => {
  switch (child.type) {
    case 'graph':
    case 'group':
    case 'block':
    case 'blockSection':
      child.children?.forEach(visit);
      return;
    case 'blockHeader':
      if (child.icon !== undefined) visit(child.icon);
      if (child.trailing !== undefined) visit(child.trailing);
      return;
    case 'blockRow':
      child.children?.forEach(cell => visit(cell.child));
      return;
    case 'entity':
    case 'relation':
      return;
  }
};

const mapSemanticChildren = (
  child: InputGraphMember,
  map: (nestedChild: InputGraphChild) => InputGraphChild,
): InputGraphMember => {
  switch (child.type) {
    case 'graph':
    case 'group':
    case 'block':
    case 'blockSection':
      return {
        ...child,
        ...(child.children === undefined ? {} : { children: child.children.map(map) }),
      };
    case 'blockHeader':
      return {
        ...child,
        ...(child.icon === undefined ? {} : { icon: map(child.icon) }),
        ...(child.trailing === undefined ? {} : { trailing: map(child.trailing) }),
      };
    case 'blockRow':
      return {
        ...child,
        ...(child.children === undefined
          ? {}
          : { children: child.children.map(cell => ({ ...cell, child: map(cell.child) })) }),
      };
    case 'entity':
    case 'relation':
      return child;
  }
};

const providerKeyToken = (key: GraphSemanticProviderKey): string => `${key.namespace}.${key.type}`;

/** 递归归一化 Graph-family semantic 输入中的非 semantic authoring children */
export const normalizeGraphAuthoringChildren = (
  children: ReadonlyArray<InputGraphChild>,
  context: InputEmbedContext,
  label: string,
): Readonly<{
  children: ReadonlyArray<InputGraphChild>;
  providerRoots: ReadonlyArray<GraphSemanticProviderKey>;
  nested?: NormalizedInputEmbedChildren;
}> => {
  const authoredChildren: Array<InputChild> = [];
  const providerRoots: Array<GraphSemanticProviderKey> = [];
  const providerTokens = new Set<string>();
  const collect = (child: InputGraphChild): void => {
    if (isGraphAuthoringChild(child)) {
      authoredChildren.push(child);
      return;
    }
    const providerKey = providerKeyByType[child.type];
    const providerToken = providerKeyToken(providerKey);
    if (!providerTokens.has(providerToken)) {
      providerTokens.add(providerToken);
      providerRoots.push(providerKey);
    }
    visitSemanticChildren(child, collect);
  };
  children.forEach(collect);

  if (authoredChildren.length === 0) return { children, providerRoots };
  if (context.normalizeChildren === undefined) {
    throw new RetikzGraphVanillaError({
      code: RetikzGraphVanillaErrorCode.NormalizeSceneRequired,
      message: `${label} authoring requires a normalizeScene embed context.`,
      details: { label },
    });
  }

  const nested = context.normalizeChildren(authoredChildren);
  let childCursor = 0;
  const replace = (child: InputGraphChild): InputGraphChild => {
    if (!isGraphSemanticInput(child)) return nested.children[childCursor++];
    return mapSemanticChildren(child, replace);
  };
  return { children: children.map(replace), providerRoots, nested };
};
