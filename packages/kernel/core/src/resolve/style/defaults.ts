import { mergeDefinedProperties } from '@retikz/foundation';

import type { IRScope, StyleChannel } from '../../schemas';
import { mergeArrowDefaults } from './arrow';
import { mergeFont } from './font';
import { mergeNodeLabelDefaults, mergePathLabelDefaults } from './label';
import { mergeGraphicStyle } from './opacity';
import type { MergedScopeDefaults } from './types';

/**
 * 合并当前作用域与父级的默认配置，供子元素继续继承
 * @description 先按 reset 清除指定通道的继承值，再依次合入共同样式与节点、路径各自的配置；颜色保留到元素解析时确定
 * @template TScope 提供 defaults 字段的作用域类型
 * @returns 未提供 defaults 时返回 parent 原对象，否则返回合并后的配置
 */
export const resolveScopeDefaults = <TScope extends Pick<IRScope, 'defaults'>>(
  scope: TScope,
  parent: MergedScopeDefaults = {},
): MergedScopeDefaults => {
  const defaults = scope.defaults;
  if (defaults === undefined) return parent;

  const { style, reset } = defaults;
  /** 判断 reset 是否要求停止继承当前通道的父级默认配置 */
  const cutsStyleChannel = (channel: StyleChannel): boolean => {
    if (reset === undefined || reset === false) return false;
    return reset === true || reset.includes(channel);
  };

  let node = cutsStyleChannel('node') ? undefined : parent.node;
  let path = cutsStyleChannel('path') ? undefined : parent.path;

  if (style !== undefined || defaults.node !== undefined) {
    const { style: nodeStyle, layout, label, ...geometry } = defaults.node ?? {};
    node = {
      geometry: mergeDefinedProperties([node?.geometry, geometry]),
      style: {
        ...mergeGraphicStyle(node?.style, style, nodeStyle),
        font: mergeFont(node?.style.font, nodeStyle?.font),
      },
      label: mergeNodeLabelDefaults(node?.label, label),
      layout: mergeDefinedProperties([node?.layout, layout]),
    };
  }

  if (style !== undefined || defaults.path !== undefined) {
    const { style: pathStyle, label, arrow, ...geometry } = defaults.path ?? {};
    path = {
      geometry: mergeDefinedProperties([path?.geometry, geometry]),
      style: mergeGraphicStyle(path?.style, style, pathStyle),
      label: mergePathLabelDefaults(path?.label, label),
      arrow: arrow === undefined ? path?.arrow : mergeArrowDefaults(path?.arrow ?? {}, arrow),
    };
  }

  return { node, path };
};
