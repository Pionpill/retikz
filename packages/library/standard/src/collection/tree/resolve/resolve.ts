import type { IRNode } from '@retikz/core';
import { mergeProperties } from '@retikz/foundation';

import { TreeLayoutSchema, TreeNodeDefaultsSchema, TreeConnectionDefaultsSchema } from '../schema';
import type { IRTree, IRTreeConnection, IRTreeItem } from '../schema';
import type { CanonicalTree, CanonicalTreeConnection, CanonicalTreeItem } from './types';

/** 合并连接覆盖；切换路径类型时不携带不适用的 fraction */
const resolveConnection = (
  root: IRTreeConnection | false | undefined,
  local?: IRTreeConnection | false,
): CanonicalTreeConnection | false => {
  if (local === false || (local === undefined && root === false)) return false;
  const parent = root === false ? undefined : root;
  const route = local?.route ?? parent?.route;
  const path = {
    ...parent?.path,
    ...local?.path,
    style: mergeProperties([parent?.path?.style ?? {}, local?.path?.style ?? {}]),
    marks: local?.path?.marks ?? parent?.path?.marks,
  };
  const fraction =
    route === '-|-' || route === '|-|'
      ? (local?.fraction ??
        (local?.route === undefined || local.route === parent?.route ? parent?.fraction : undefined))
      : undefined;
  return TreeConnectionDefaultsSchema.parse({ route, path, ...(fraction === undefined ? {} : { fraction }) });
};

/** 文字与对象配置统一到节点，保留空子槽与显式身份 */
export const resolveTree = (source: IRTree): CanonicalTree => {
  const { root, node, connection, layout, label, namespace, type, ...scope } = source;
  void namespace;
  void type;
  const makeNode = (item?: Exclude<IRTreeItem, string>): IRNode => ({
    type: 'node',
    ...(item?.id === undefined ? {} : { id: item.id }),
    ...TreeNodeDefaultsSchema.parse({
      shape: item?.node?.shape ?? node?.shape,
      style: mergeProperties([node?.style ?? {}, item?.node?.style ?? {}]),
      layout: mergeProperties([node?.layout ?? {}, item?.node?.layout ?? {}]),
    }),
    ...(item?.content === undefined || item.content === '' ? {} : { text: item.content }),
  });
  const explicit = (item: IRTreeItem | null): CanonicalTreeItem | null => {
    if (item === null) return null;
    const branch = typeof item === 'string' ? { content: item } : item;
    return {
      node: makeNode(branch),
      connection: resolveConnection(connection, branch.connection),
      children: (branch.children ?? []).map(explicit),
    };
  };
  return {
    root: explicit(root),
    emptyNode: makeNode(),
    layout: TreeLayoutSchema.parse(layout ?? {}),
    scope,
    label,
  };
};
