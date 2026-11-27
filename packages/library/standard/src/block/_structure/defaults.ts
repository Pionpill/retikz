import type { IRNode } from '@retikz/core';

import type { BlockStructureOptions } from './types';

/** 结构框架自身的组合默认；下层 schema 的默认仍归原 owner */
export const BLOCK_STRUCTURE_DEFAULTS = {
  block: {
    padding: 0,
    gap: 0,
    justifyContent: 'start',
    alignItems: 'stretch',
    cornerRadius: 8,
    border: { stroke: 'currentColor', opacity: { stroke: 0.2 }, strokeWidth: 1 },
  },
  header: { padding: 12, gap: 8, justifyContent: 'start', alignItems: 'center' },
  content: { padding: 12, gap: 8, justifyContent: 'start', alignItems: 'stretch' },
  footer: { padding: 12, gap: 8, justifyContent: 'end', alignItems: 'center' },
  section: { padding: 0, gap: 4, justifyContent: 'start', alignItems: 'stretch' },
} satisfies Record<string, Omit<BlockStructureOptions, 'children'>>;

/** Header 主体纵向间距的单一默认 */
export const BLOCK_HEADER_CONTENT_GAP = 4;

/** 文字角色共用的普通 Node 布局默认 */
export const BLOCK_TEXT_LAYOUT = { padding: 0, margin: 0, minimumSize: 0 } satisfies IRNode['layout'];

/** 标题与说明的组合视觉默认，字体允许逐字段覆盖 */
export const BLOCK_TEXT_STYLES = {
  title: { fill: 'none', stroke: 'none', font: { size: 'base', weight: 'bold' } },
  description: { fill: 'none', stroke: 'none', opacity: 0.7, font: { size: 'xs' } },
} satisfies Record<string, NonNullable<IRNode['style']>>;
