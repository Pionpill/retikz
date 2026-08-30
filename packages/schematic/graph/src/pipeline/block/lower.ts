import type { IRChild, IRScope } from '@retikz/core';
import type { IRFlexLayoutItem } from '@retikz/layout';
import type { IRSurface } from '@retikz/standard';

import { createFlexLayout, FlexLayoutDirection, LayoutAlignment, LayoutOverflow } from '@retikz/layout';
import { createSurface, STANDARD_NAMESPACE, SURFACE_TYPE } from '@retikz/standard';

import type { CanonicalBlock } from '../../resolve';
import type { IRBlock } from '../../schemas';

const DEFAULT_BLOCK_GAP = 8;
const DEFAULT_BLOCK_PADDING = 8;
const DEFAULT_BLOCK_BACKGROUND = { fill: 'none' } as const;
const DEFAULT_BLOCK_BORDER = { stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 } as const;
const DEFAULT_BLOCK_CORNER_RADIUS = 8;

/** 从 Block Source 提取完整 Core Scope props，移除 Graph、布局与 Surface 字段 */
export const blockScopeProps = (source: IRBlock): Omit<IRScope, 'type' | 'children'> => {
  const {
    namespace: _namespace,
    type: _type,
    graphTheme: _graphTheme,
    children: _children,
    width: _width,
    minWidth: _minWidth,
    gap: _gap,
    padding: _padding,
    background: _background,
    border: _border,
    cornerRadius: _cornerRadius,
    overflow: _overflow,
    ...scope
  } = source;
  void _namespace;
  void _type;
  void _graphTheme;
  void _children;
  void _width;
  void _minWidth;
  void _gap;
  void _padding;
  void _background;
  void _border;
  void _cornerRadius;
  void _overflow;
  return scope;
};

/** 创建任意 Block child 的 occurrence-local Flex item */
const blockChildItem = (child: IRChild, childIndex: number): IRFlexLayoutItem => ({
  kind: 'flex',
  key: `child:${childIndex}`,
  child,
  margin: 0,
  basis: 'content',
  grow: 0,
  shrink: 1,
});

/** 把 Block canonical children 下沉为固定纵向 FlexLayout */
const lowerBlockContent = (block: CanonicalBlock): IRChild =>
  createFlexLayout({
    direction: FlexLayoutDirection.Column,
    gap: block.source.gap ?? DEFAULT_BLOCK_GAP,
    alignItems: LayoutAlignment.Stretch,
    children: block.source.children?.map(blockChildItem) ?? [],
  });

/** 把 Block canonical content 下沉为携带完整 Scope props 的唯一 Standard Surface */
export const lowerBlockSurface = (block: CanonicalBlock): IRSurface =>
  createSurface({
    namespace: STANDARD_NAMESPACE,
    type: SURFACE_TYPE,
    ...blockScopeProps(block.source),
    child: lowerBlockContent(block),
    padding: block.source.padding ?? DEFAULT_BLOCK_PADDING,
    overflow: block.source.overflow ?? LayoutOverflow.Visible,
    background: block.source.background ?? DEFAULT_BLOCK_BACKGROUND,
    border: block.source.border ?? DEFAULT_BLOCK_BORDER,
    cornerRadius: block.source.cornerRadius ?? DEFAULT_BLOCK_CORNER_RADIUS,
  });
