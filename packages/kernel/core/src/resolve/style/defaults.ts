import { mergeProperties } from '@retikz/foundation';

import type { IRScope, IRScopeDefaults, StyleChannel } from '../../schemas';
import { mergeArrowDefaults } from './arrow';
import { mergeGraphicStyle } from './opacity';
import type { EffectiveScopeDefaults } from './types';

/** 判断当前层是否切断指定默认配置通道 */
export const cutsStyleChannel = (reset: IRScopeDefaults['reset'], channel: StyleChannel): boolean => {
  if (reset === undefined || reset === false) return false;
  return reset === true || reset.includes(channel);
};

/** 在 Scope 入口合并默认配置；不提前展开主色或解析依赖元素的主题值 */
export const resolveScopeDefaults = (scope: IRScope, parent: EffectiveScopeDefaults = {}): EffectiveScopeDefaults => {
  const defaults = scope.defaults;
  if (defaults === undefined) return parent;

  const { style, reset } = defaults;
  const shouldOverride = (value: unknown) => value !== undefined;
  let node = cutsStyleChannel(reset, 'node') ? undefined : parent.node;
  let path = cutsStyleChannel(reset, 'path') ? undefined : parent.path;
  let label = cutsStyleChannel(reset, 'label') ? undefined : parent.label;
  let arrow = cutsStyleChannel(reset, 'arrow') ? undefined : parent.arrow;

  if (style !== undefined || defaults.node !== undefined) {
    const { style: nodeStyle, layout, ...geometry } = defaults.node ?? {};
    node = {
      geometry: { ...node?.geometry, ...mergeProperties([geometry], { shouldOverride }) },
      style: mergeGraphicStyle(node?.style, style, nodeStyle),
      layout: { ...node?.layout, ...mergeProperties([layout], { shouldOverride }) },
    };
  }

  if (style !== undefined || defaults.path !== undefined) {
    const { style: pathStyle, ...geometry } = defaults.path ?? {};
    path = {
      geometry: { ...path?.geometry, ...mergeProperties([geometry], { shouldOverride }) },
      style: mergeGraphicStyle(path?.style, style, pathStyle),
    };
  }

  if (defaults.label !== undefined) label = { ...label, ...mergeProperties([defaults.label], { shouldOverride }) };
  if (defaults.arrow !== undefined) arrow = mergeArrowDefaults(arrow ?? {}, defaults.arrow);

  return { node, path, label, arrow, scopeColor: style?.color ?? parent.scopeColor };
};
