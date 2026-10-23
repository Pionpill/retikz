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
  const defaults = TreeConnectionDefaultsSchema.options[0].shape;
  const styleDefaults = defaults.path.shape.style.shape;
  const resolvedPath = {
    ...path,
    style: {
      ...path.style,
      stroke: path.style.stroke ?? styleDefaults.stroke.parse(undefined),
      strokeWidth: path.style.strokeWidth ?? styleDefaults.strokeWidth.parse(undefined),
      fill: path.style.fill ?? styleDefaults.fill.parse(undefined),
    },
    marks: path.marks ?? defaults.path.shape.marks.parse(undefined),
  };
  return route === '-|-' || route === '|-|'
    ? { route, path: resolvedPath, ...(fraction === undefined ? {} : { fraction }) }
    : { route: route ?? defaults.route.parse(undefined), path: resolvedPath };
};

/** 文字与对象配置统一到节点，保留空子槽与显式身份 */
export const resolveTree = (source: IRTree): CanonicalTree => {
  const { root, defaultNode: node, defaultConnection: connection, layout, label, namespace, type, ...scope } = source;
  void namespace;
  void type;
  const makeNode = (item?: Exclude<IRTreeItem, string>): IRNode => {
    const style = mergeProperties([node?.style ?? {}, item?.node?.style ?? {}]);
    const nodeLayout = mergeProperties([node?.layout ?? {}, item?.node?.layout ?? {}]);
    const defaults = TreeNodeDefaultsSchema.shape;
    return {
      type: 'node',
      ...(item?.id === undefined ? {} : { id: item.id }),
      shape: item?.node?.shape ?? node?.shape ?? defaults.shape.parse(undefined),
      style: {
        ...style,
        stroke: style.stroke ?? defaults.style.shape.stroke.parse(undefined),
        strokeWidth: style.strokeWidth ?? defaults.style.shape.strokeWidth.parse(undefined),
        fill: style.fill ?? defaults.style.shape.fill.parse(undefined),
      },
      layout: {
        ...nodeLayout,
        minimumSize: nodeLayout.minimumSize ?? defaults.layout.shape.minimumSize.parse(undefined),
        padding: nodeLayout.padding ?? defaults.layout.shape.padding.parse(undefined),
        margin: nodeLayout.margin ?? defaults.layout.shape.margin.parse(undefined),
      },
      ...(item?.content === undefined || item.content === '' ? {} : { text: item.content }),
    };
  };
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
    layout: {
      direction: layout?.direction ?? TreeLayoutSchema.shape.direction.parse(undefined),
      levelGap: layout?.levelGap ?? TreeLayoutSchema.shape.levelGap.parse(undefined),
      siblingGap: layout?.siblingGap ?? TreeLayoutSchema.shape.siblingGap.parse(undefined),
    },
    scope,
    label,
  };
};
