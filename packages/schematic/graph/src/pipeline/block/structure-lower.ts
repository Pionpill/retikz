import type { IRChild, IRNode, IRScope } from '@retikz/core';
import type { IRFlexLayout, IRFlexLayoutItem } from '@retikz/layout';
import type { IRSurface } from '@retikz/standard';

import {
  createFlexLayout,
  FlexLayoutDirection,
  LayoutAlignment,
  LayoutDistribution,
  LayoutOverflow,
} from '@retikz/layout';
import { createSurface, STANDARD_NAMESPACE, SURFACE_TYPE } from '@retikz/standard';

import type { IRBlockHeader, IRBlockRow, IRBlockSection, IRBlockText } from '../../schemas';

const DEFAULT_HEADER_GAP = 8;
const DEFAULT_HEADER_TEXT_GAP = 4;
const DEFAULT_SECTION_GAP = 4;
const DEFAULT_SECTION_PADDING = 8;
const DEFAULT_SECTION_BACKGROUND = { fill: 'lightgray', fillOpacity: 0.04 } as const;
const DEFAULT_SECTION_BORDER = { stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 } as const;
const DEFAULT_SECTION_CORNER_RADIUS = 8;
const DEFAULT_ROW_GAP = 8;
const DEFAULT_ROW_PADDING = 8;

const structureTextNode = (text: IRBlockText, kind: 'title' | 'description' | 'section'): IRNode => {
  const normalizedText = typeof text === 'string' ? { text } : text;
  return {
    type: 'node',
    position: [0, 0],
    shape: 'rectangle',
    fill: 'none',
    stroke: 'none',
    textColor: 'currentColor',
    opacity: kind === 'title' ? 1 : 0.7,
    padding: 0,
    margin: 0,
    minimumSize: 0,
    scale: 1,
    rotate: 0,
    ...normalizedText,
    font: {
      size: kind === 'title' ? ('base' as const) : kind === 'description' ? ('xs' as const) : ('sm' as const),
      ...(kind === 'title' ? { weight: 'bold' as const } : {}),
      ...normalizedText.font,
    },
  };
};

const structureText = (text: IRBlockText, kind: 'title' | 'description' | 'section'): IRChild => ({
  type: 'scope',
  resetStyle: ['node'],
  children: [structureTextNode(text, kind)],
});

const flexItem = (
  key: string,
  child: IRChild,
  options: Partial<Pick<IRFlexLayoutItem, 'grow' | 'shrink' | 'alignSelf'>> = {},
): IRFlexLayoutItem => ({
  kind: 'flex',
  key,
  child,
  margin: 0,
  basis: 'content',
  grow: 0,
  shrink: 1,
  ...options,
});

const sectionScopeProps = (source: IRBlockSection): Omit<IRScope, 'type' | 'children'> => {
  const {
    namespace: _namespace,
    type: _type,
    title: _title,
    children: _children,
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
  void _title;
  void _children;
  void _gap;
  void _padding;
  void _background;
  void _border;
  void _cornerRadius;
  void _overflow;
  return scope;
};

const rowScopeProps = (source: IRBlockRow): Omit<IRScope, 'type' | 'children'> => {
  const {
    namespace: _namespace,
    type: _type,
    children: _children,
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
  void _children;
  void _gap;
  void _padding;
  void _background;
  void _border;
  void _cornerRadius;
  void _overflow;
  return scope;
};

/** 把 Header 下沉为固定 slot 顺序的横向 FlexLayout */
export const lowerBlockHeaderLayout = (source: IRBlockHeader): IRFlexLayout => {
  const textItems = [flexItem('title', structureText(source.title, 'title'))];
  if (source.description !== undefined) {
    textItems.push(flexItem('description', structureText(source.description, 'description')));
  }
  const textColumn = createFlexLayout({
    direction: source.direction === 'horizontal' ? FlexLayoutDirection.Row : FlexLayoutDirection.Column,
    gap: source.itemGap ?? DEFAULT_HEADER_TEXT_GAP,
    justifyContent: source.justifyContent ?? LayoutDistribution.Start,
    alignItems: LayoutAlignment.Start,
    children: textItems,
  });
  const headerItems: Array<IRFlexLayoutItem> = [];
  if (source.icon !== undefined) headerItems.push(flexItem('icon', source.icon));
  headerItems.push(flexItem('text', textColumn, { grow: 1 }));
  if (source.trailing !== undefined) headerItems.push(flexItem('trailing', source.trailing));
  return createFlexLayout({
    direction: FlexLayoutDirection.Row,
    gap: DEFAULT_HEADER_GAP,
    alignItems: LayoutAlignment.Center,
    children: headerItems,
  });
};

/** 把 Section 下沉为携带完整 Scope props 的 Standard Surface */
export const lowerBlockSectionSurface = (source: IRBlockSection): IRSurface => {
  const items: Array<IRFlexLayoutItem> = [];
  if (source.title !== undefined) items.push(flexItem('title', structureText(source.title, 'section')));
  source.children?.forEach((child, childIndex) => items.push(flexItem(`child:${childIndex}`, child)));
  return createSurface({
    namespace: STANDARD_NAMESPACE,
    type: SURFACE_TYPE,
    ...sectionScopeProps(source),
    child: createFlexLayout({
      direction: FlexLayoutDirection.Column,
      gap: source.gap ?? DEFAULT_SECTION_GAP,
      alignItems: LayoutAlignment.Stretch,
      children: items,
    }),
    padding: source.padding ?? DEFAULT_SECTION_PADDING,
    overflow: source.overflow ?? LayoutOverflow.Visible,
    background: source.background ?? DEFAULT_SECTION_BACKGROUND,
    border: source.border ?? DEFAULT_SECTION_BORDER,
    cornerRadius: source.cornerRadius ?? DEFAULT_SECTION_CORNER_RADIUS,
  });
};

/** 把 Row 下沉为携带完整 Scope props 的 Standard Surface */
export const lowerBlockRowSurface = (source: IRBlockRow): IRSurface =>
  createSurface({
    namespace: STANDARD_NAMESPACE,
    type: SURFACE_TYPE,
    ...rowScopeProps(source),
    child: createFlexLayout({
      direction: FlexLayoutDirection.Row,
      gap: source.gap ?? DEFAULT_ROW_GAP,
      alignItems: LayoutAlignment.Center,
      children:
        source.children?.map(cell => ({
          kind: 'flex',
          margin: 0,
          basis: 0,
          grow: 1,
          shrink: 1,
          min: 0,
          ...cell,
        })) ?? [],
    }),
    padding: source.padding ?? DEFAULT_ROW_PADDING,
    overflow: source.overflow ?? LayoutOverflow.Visible,
    ...(source.background === undefined ? {} : { background: source.background }),
    ...(source.border === undefined ? {} : { border: source.border }),
    cornerRadius: source.cornerRadius ?? 0,
  });
