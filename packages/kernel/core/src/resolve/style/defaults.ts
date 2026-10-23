import { mergeProperties } from '@retikz/foundation';

import type { IRScope, IRScopeDefaults, StyleChannel } from '../../schemas';
import { mergeArrowDefaults } from './arrow';
import { mergeFont } from './font';
import { mergeNodeLabelDefaults, mergePathLabelDefaults } from './label';
import { mergeGraphicStyle } from './opacity';
import type { EffectiveScopeDefaults } from './types';

/** 判断当前层是否切断指定默认配置通道 */
export const cutsStyleChannel = (reset: IRScopeDefaults['reset'], channel: StyleChannel): boolean => {
  if (reset === undefined || reset === false) return false;
  return reset === true || reset.includes(channel);
};

/** 在 Scope 入口合并默认配置；不提前展开主色或解析依赖元素的主题值 */
export const resolveScopeDefaults = <TScope extends Pick<IRScope, 'defaults'>>(
  scope: TScope,
  parent: EffectiveScopeDefaults = {},
): EffectiveScopeDefaults => {
  const defaults = scope.defaults;
  if (defaults === undefined) return parent;

  const { style, reset } = defaults;
  const shouldOverride = (value: unknown) => value !== undefined;
  let node = cutsStyleChannel(reset, 'node') ? undefined : parent.node;
  let path = cutsStyleChannel(reset, 'path') ? undefined : parent.path;

  if (style !== undefined || defaults.node !== undefined) {
    const { style: nodeStyle, layout, label, ...geometry } = defaults.node ?? {};
    node = {
      geometry: { ...node?.geometry, ...mergeProperties([geometry], { shouldOverride }) },
      style: {
        ...mergeGraphicStyle(node?.style, style, nodeStyle),
        font: mergeFont(node?.style.font, nodeStyle?.font),
      },
      label: mergeNodeLabelDefaults(node?.label, label),
      layout: { ...node?.layout, ...mergeProperties([layout], { shouldOverride }) },
    };
  }

  if (style !== undefined || defaults.path !== undefined) {
    const { style: pathStyle, label, arrow, ...geometry } = defaults.path ?? {};
    path = {
      geometry: { ...path?.geometry, ...mergeProperties([geometry], { shouldOverride }) },
      style: mergeGraphicStyle(path?.style, style, pathStyle),
      label: mergePathLabelDefaults(path?.label, label),
      arrow: arrow === undefined ? path?.arrow : mergeArrowDefaults(path?.arrow ?? {}, arrow),
    };
  }

  return { node, path, scopeColor: style?.color ?? parent.scopeColor };
};
