import type { IRChild, IRNode, IRNodeLabelBoundaryPosition, IRScope } from '@retikz/core';
import type { IRFlexLayoutItem } from '@retikz/layout';
import type { IRSurface } from '@retikz/standard';

import { createFlexLayout, FlexLayoutDirection, LayoutAlignment, LayoutOverflow } from '@retikz/layout';
import { createSurface } from '@retikz/standard';

import type { CanonicalGroup } from '../../resolve';
import type { IRGroup, IRGroupCaptionText } from '../../schemas';

const DEFAULT_GROUP_PADDING = 10;
const DEFAULT_GROUP_BACKGROUND = { fill: 'lightgray', fillOpacity: 0.04 };
const DEFAULT_GROUP_BORDER = { stroke: 'lightgray', strokeWidth: 1, dashPattern: [4, 3] };
const DEFAULT_GROUP_CORNER_RADIUS = 4;
const DEFAULT_GROUP_LABEL_POSITION: IRNodeLabelBoundaryPosition = { boundary: 'bottom', fraction: 0 };
const DEFAULT_GROUP_LABEL_FONT = { size: 'xs' as const };
const DEFAULT_GROUP_LABEL_TEXT_COLOR = 'gray' as const;
const DEFAULT_CAPTION_GAP = 4;

/** 从 Group Source 提取完整 Core Scope props，移除领域与 Surface 呈现字段 */
export const groupScopeProps = (source: IRGroup): Omit<IRScope, 'type' | 'children'> => {
  const {
    namespace: _namespace,
    type: _type,
    graphTheme: _graphTheme,
    caption: _caption,
    labels: _labels,
    padding: _padding,
    background: _background,
    border: _border,
    cornerRadius: _cornerRadius,
    overflow: _overflow,
    children: _children,
    ...scope
  } = source;
  void _namespace;
  void _type;
  void _graphTheme;
  void _caption;
  void _labels;
  void _padding;
  void _background;
  void _border;
  void _cornerRadius;
  void _overflow;
  void _children;
  return scope;
};

/** 生成不受 Group nodeDefault 影响的 caption 文本 Node */
const captionNode = (text: IRGroupCaptionText, kind: 'title' | 'description'): IRNode => {
  const defaultFont = kind === 'title' ? { size: 'sm' as const } : { size: 'xs' as const };
  return {
    type: 'node',
    position: [0, 0],
    shape: 'rectangle',
    fill: 'none',
    stroke: 'none',
    textColor: 'currentColor',
    opacity: kind === 'description' ? 0.7 : 1,
    padding: 0,
    margin: 0,
    minimumSize: 0,
    scale: 1,
    rotate: 0,
    ...text,
    font: { ...defaultFont, ...text.font },
  };
};

const flexItem = (key: string, child: IRChild): IRFlexLayoutItem => ({
  kind: 'flex',
  key,
  child,
  margin: 0,
  basis: 'content',
  grow: 0,
  shrink: 1,
});

/** 把 caption title / description 下沉为复用 Layout Flex 的无 identity 内容 */
const captionContent = (source: IRGroup): IRChild | undefined => {
  const caption = source.caption;
  if (caption === undefined) return undefined;
  const items: Array<IRFlexLayoutItem> = [];
  if (caption.title !== undefined) items.push(flexItem('title', captionNode(caption.title, 'title')));
  if (caption.description !== undefined) {
    items.push(flexItem('description', captionNode(caption.description, 'description')));
  }
  const layout = createFlexLayout({
    direction: caption.direction === 'vertical' ? FlexLayoutDirection.Column : FlexLayoutDirection.Row,
    gap: caption.itemGap ?? DEFAULT_CAPTION_GAP,
    alignItems: LayoutAlignment.Start,
    children: items,
  });
  return { type: 'scope', resetStyle: ['node'], children: [layout] };
};

/** 把 caption 与任意 authored body 组合为 Surface 的唯一 child */
const groupContent = (group: CanonicalGroup): IRChild => {
  const caption = captionContent(group.source);
  const body: IRChild | undefined =
    group.children.length === 0 ? undefined : { type: 'scope', children: [...group.children] };
  if (caption === undefined && body === undefined) return { type: 'scope', children: [] };
  if (caption === undefined) return body!;
  if (body === undefined) return caption;
  const top = group.source.caption?.side !== 'bottom';
  return createFlexLayout({
    direction: FlexLayoutDirection.Column,
    gap: group.source.caption?.bodyGap ?? DEFAULT_CAPTION_GAP,
    alignItems: LayoutAlignment.Stretch,
    children: top
      ? [flexItem('caption', caption), flexItem('body', body)]
      : [flexItem('body', body), flexItem('caption', caption)],
  });
};

/** 把 Group canonical content 下沉为唯一 Standard Surface Source */
export const lowerGroupSurface = (group: CanonicalGroup): IRSurface =>
  createSurface({
    namespace: 'standard',
    type: 'surface',
    child: groupContent(group),
    padding: group.source.padding ?? DEFAULT_GROUP_PADDING,
    overflow: group.source.overflow ?? LayoutOverflow.Visible,
    background: group.source.background ?? DEFAULT_GROUP_BACKGROUND,
    border: group.source.border ?? DEFAULT_GROUP_BORDER,
    cornerRadius: group.source.cornerRadius ?? DEFAULT_GROUP_CORNER_RADIUS,
  });

/** 创建与最终 Surface allocation 完全重合的透明 Core Node label host */
export const lowerGroupLabelHost = (source: IRGroup, width: number, height: number): IRNode => ({
  type: 'node',
  position: [width / 2, height / 2],
  shape: 'rectangle',
  fill: 'none',
  stroke: 'none',
  textColor: 'currentColor',
  opacity: 1,
  padding: 0,
  margin: 0,
  minimumSize: { width, height },
  scale: 1,
  rotate: 0,
  ...(source.labels === undefined
    ? {}
    : {
        label: source.labels.map(label => ({
          ...label,
          font: { ...label.font, size: label.font?.size ?? DEFAULT_GROUP_LABEL_FONT.size },
          textColor: label.textColor ?? DEFAULT_GROUP_LABEL_TEXT_COLOR,
          align: label.align ?? 'start',
          position: label.position ?? DEFAULT_GROUP_LABEL_POSITION,
        })),
      }),
});
