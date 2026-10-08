import type { IRChild } from '@retikz/core';
import type { IRFlexLayout, IRFlexLayoutItem } from '@retikz/layout/compose';
import { FlexLayoutDirection } from '@retikz/layout/compose';

import type { InputSurfaceConfig } from '../../presentation';
import { createSurface } from '../../presentation';
import { BLOCK_HEADER_CONTENT_GAP, BLOCK_STRUCTURE_DEFAULTS } from './defaults';
import { mergeBlockProperties } from './properties';
import type { BlockHeaderOptions, BlockStructureOptions } from './types';

/** 用公开 Flex IR 表达包内组合，不注册新的基础结构类型 */
const composeFlex = (options: Omit<IRFlexLayout, 'namespace' | 'type'>): IRFlexLayout => ({
  namespace: 'layout',
  type: 'flexLayout',
  ...options,
});

/** 普通内容的顺序只由 authored children 决定 */
const flexItemsOf = (children: Array<IRChild>): Array<IRFlexLayoutItem> =>
  children.map(child => ({ kind: 'flex', child }));

/** 外层 Flex 只负责双轴尺寸，实际 Surface 根独占 Scope 与 padding */
const composeRegion = (
  options: BlockStructureOptions,
  defaults: Omit<BlockStructureOptions, 'children'>,
  direction: IRFlexLayout['direction'],
  items?: Array<IRFlexLayoutItem>,
): IRChild => {
  const { children = [], size, gap, justifyContent, alignItems, ...surfaceOptions } = options;
  const {
    gap: defaultGap,
    justifyContent: defaultDistribution,
    alignItems: defaultAlignment,
    ...surfaceDefaults
  } = defaults;
  const content = composeFlex({
    direction,
    gap: gap ?? defaultGap,
    justifyContent: justifyContent ?? defaultDistribution,
    alignItems: alignItems ?? defaultAlignment,
    children: items ?? flexItemsOf(children),
  });
  const surface = createSurface({
    ...mergeBlockProperties<Omit<InputSurfaceConfig, 'namespace' | 'type' | 'child'>>(surfaceDefaults, surfaceOptions),
    namespace: 'standard',
    type: 'surface',
    child: content,
  });
  if (size === undefined) return surface;

  return composeFlex({
    direction: FlexLayoutDirection.Column,
    size,
    children: [{ kind: 'flex', grow: 1, child: surface }],
  });
};

/** 组合有序纵向根区域，不推断或重排 Header/Content/Footer */
export const composeBlock = (options: BlockStructureOptions = {}): IRChild =>
  composeRegion(options, BLOCK_STRUCTURE_DEFAULTS.block, FlexLayoutDirection.Column);

/** 主体纵向排列并增长，显式 accessory 按自然宽度置于其后 */
export const composeBlockHeader = (options: BlockHeaderOptions = {}): IRChild => {
  const { accessory, contentGap = BLOCK_HEADER_CONTENT_GAP, children = [], ...regionOptions } = options;
  const items: Array<IRFlexLayoutItem> = [];
  if (children.length > 0)
    items.push({
      kind: 'flex',
      grow: 1,
      child: composeFlex({
        direction: FlexLayoutDirection.Column,
        gap: contentGap,
        children: flexItemsOf(children),
      }),
    });
  if (accessory !== undefined) items.push({ kind: 'flex', shrink: 0, child: accessory });
  return composeRegion(regionOptions, BLOCK_STRUCTURE_DEFAULTS.header, FlexLayoutDirection.Row, items);
};

/** 组合开放的纵向主体，不解释领域事实 */
export const composeBlockContent = (options: BlockStructureOptions = {}): IRChild =>
  composeRegion(options, BLOCK_STRUCTURE_DEFAULTS.content, FlexLayoutDirection.Column);

/** 组合自然流中的横向结尾区域，默认主轴 end */
export const composeBlockFooter = (options: BlockStructureOptions = {}): IRChild =>
  composeRegion(options, BLOCK_STRUCTURE_DEFAULTS.footer, FlexLayoutDirection.Row);

/** 组合可选纵向分区，标题由普通 child 表达 */
export const composeBlockSection = (options: BlockStructureOptions = {}): IRChild =>
  composeRegion(options, BLOCK_STRUCTURE_DEFAULTS.section, FlexLayoutDirection.Column);
