import type { InspectionLinePrimitive, InspectionPrimitive, ResolvedBaseLayoutInspectOptions } from '@retikz/core';

import type {
  LayoutArtifactContainer,
  LayoutArtifactItemBase,
  LayoutArtifactRect,
  LayoutSpacingArtifact,
} from '../artifact-types';

import { LayoutSpacingKind } from '../constants';

const outline = (role: string, rect: LayoutArtifactRect): InspectionPrimitive => ({
  kind: 'rect' as const,
  role,
  ...rect,
  presentation: 'outline' as const,
  tone: 'scope',
  lineStyle: 'dashed' as const,
});

const positiveRect = (rect: LayoutArtifactRect): boolean => rect.width > 0 && rect.height > 0;

const sameCoordinate = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-9;

/** 用固定正交坐标与升序区间表示一段水平或垂直边界 */
type AxisAlignedBoundarySegment = Readonly<{
  axis: 'x' | 'y';
  fixed: number;
  start: number;
  end: number;
}>;

/** 把正交 line 转成便于区间运算的 canonical segment */
const boundarySegmentOf = (line: InspectionLinePrimitive): AxisAlignedBoundarySegment | undefined => {
  if (sameCoordinate(line.y1, line.y2)) {
    return { axis: 'x', fixed: line.y1, start: Math.min(line.x1, line.x2), end: Math.max(line.x1, line.x2) };
  }
  if (sameCoordinate(line.x1, line.x2)) {
    return { axis: 'y', fixed: line.x1, start: Math.min(line.y1, line.y2), end: Math.max(line.y1, line.y2) };
  }
  return undefined;
};

/** 从一段边界中减去此前已保留的全部共线区间 */
const subtractCoveredBoundary = (
  segment: AxisAlignedBoundarySegment,
  covered: ReadonlyArray<AxisAlignedBoundarySegment>,
): Array<AxisAlignedBoundarySegment> => {
  let fragments = [segment];
  covered.forEach(candidate => {
    if (candidate.axis !== segment.axis || !sameCoordinate(candidate.fixed, segment.fixed)) return;
    fragments = fragments.flatMap(fragment => {
      const overlapStart = Math.max(fragment.start, candidate.start);
      const overlapEnd = Math.min(fragment.end, candidate.end);
      if (overlapEnd <= overlapStart + 1e-9) return [fragment];
      return [
        { ...fragment, end: overlapStart },
        { ...fragment, start: overlapEnd },
      ].filter(part => part.end > part.start + 1e-9);
    });
  });
  return fragments;
};

/** 以来源 line 的方向和视觉语义恢复一个未覆盖区间 */
const lineFromBoundarySegment = (
  source: InspectionLinePrimitive,
  segment: AxisAlignedBoundarySegment,
): InspectionLinePrimitive => {
  const forward = segment.axis === 'x' ? source.x1 <= source.x2 : source.y1 <= source.y2;
  const start = forward ? segment.start : segment.end;
  const end = forward ? segment.end : segment.start;
  return segment.axis === 'x'
    ? { ...source, x1: start, y1: segment.fixed, x2: end, y2: segment.fixed }
    : { ...source, x1: segment.fixed, y1: start, x2: segment.fixed, y2: end };
};

/** 保留非边界 primitive，并把 outline 或正交 line 切成未覆盖片段 */
const normalizeBoundaryPrimitive = (
  primitive: InspectionPrimitive,
  covered: Array<AxisAlignedBoundarySegment>,
): Array<InspectionPrimitive> => {
  if (primitive.kind !== 'line' && !(primitive.kind === 'rect' && primitive.presentation === 'outline')) {
    return [primitive];
  }
  const sourceLines =
    primitive.kind === 'line'
      ? [primitive]
      : inspectLayoutStructureRect(primitive.role, primitive).map(line => ({
          ...line,
          tone: primitive.tone,
          lineStyle: primitive.lineStyle,
          ...(primitive.opacity === undefined ? {} : { opacity: primitive.opacity }),
        }));
  const fragments = sourceLines.flatMap(line => {
    const segment = boundarySegmentOf(line);
    if (segment === undefined) return [line];
    const uncovered = subtractCoveredBoundary(segment, covered);
    covered.push(...uncovered);
    return uncovered.map(fragment => lineFromBoundarySegment(line, fragment));
  });
  const unchanged =
    primitive.kind === 'rect' &&
    fragments.length === sourceLines.length &&
    fragments.every((line, index) => {
      const source = sourceLines[index];
      return (
        sameCoordinate(line.x1, source.x1) &&
        sameCoordinate(line.y1, source.y1) &&
        sameCoordinate(line.x2, source.x2) &&
        sameCoordinate(line.y2, source.y2)
      );
    });
  return unchanged ? [primitive] : fragments;
};

/** 按传入优先级切分共线边界，已覆盖区间保留更早语义 */
export const normalizeLayoutBoundaryGroups = (
  groups: ReadonlyArray<ReadonlyArray<InspectionPrimitive>>,
): Array<Array<InspectionPrimitive>> => {
  const covered: Array<AxisAlignedBoundarySegment> = [];
  return groups.map(group => group.flatMap(primitive => normalizeBoundaryPrimitive(primitive, covered)));
};

/** 把矩形结构区域展开为四条 dashed 边界线 */
export const inspectLayoutStructureRect = (role: string, rect: LayoutArtifactRect): Array<InspectionLinePrimitive> => [
  {
    kind: 'line',
    role,
    x1: rect.x,
    y1: rect.y,
    x2: rect.x + rect.width,
    y2: rect.y,
    tone: 'scope',
    lineStyle: 'dashed',
  },
  {
    kind: 'line',
    role,
    x1: rect.x + rect.width,
    y1: rect.y,
    x2: rect.x + rect.width,
    y2: rect.y + rect.height,
    tone: 'scope',
    lineStyle: 'dashed',
  },
  {
    kind: 'line',
    role,
    x1: rect.x,
    y1: rect.y + rect.height,
    x2: rect.x + rect.width,
    y2: rect.y + rect.height,
    tone: 'scope',
    lineStyle: 'dashed',
  },
  {
    kind: 'line',
    role,
    x1: rect.x,
    y1: rect.y,
    x2: rect.x,
    y2: rect.y + rect.height,
    tone: 'scope',
    lineStyle: 'dashed',
  },
];

/** 返回 outer 减去裁剪后 inner 的最多四块非重叠矩形 */
const subtractRect = (outer: LayoutArtifactRect, inner: LayoutArtifactRect): Array<LayoutArtifactRect> => {
  if (!positiveRect(outer)) return [];
  const outerRight = outer.x + outer.width;
  const outerBottom = outer.y + outer.height;
  const intersection = {
    x: Math.max(outer.x, inner.x),
    y: Math.max(outer.y, inner.y),
    width: Math.max(0, Math.min(outerRight, inner.x + inner.width) - Math.max(outer.x, inner.x)),
    height: Math.max(0, Math.min(outerBottom, inner.y + inner.height) - Math.max(outer.y, inner.y)),
  };
  if (!positiveRect(intersection)) return [outer];
  const intersectionRight = intersection.x + intersection.width;
  const intersectionBottom = intersection.y + intersection.height;
  return [
    { x: outer.x, y: outer.y, width: outer.width, height: intersection.y - outer.y },
    { x: outer.x, y: intersectionBottom, width: outer.width, height: outerBottom - intersectionBottom },
    { x: outer.x, y: intersection.y, width: intersection.x - outer.x, height: intersection.height },
    { x: intersectionRight, y: intersection.y, width: outerRight - intersectionRight, height: intersection.height },
  ].filter(positiveRect);
};

const fillRing = (
  role: string,
  outer: LayoutArtifactRect,
  inner: LayoutArtifactRect,
  fillPattern: 'forward-diagonal' | 'backward-diagonal',
): Array<InspectionPrimitive> => {
  const fills = subtractRect(outer, inner).map(rect => ({
    kind: 'rect' as const,
    role,
    ...rect,
    presentation: 'fill' as const,
    tone: 'scope' as const,
    fillPattern,
  }));
  if (fills.length === 0) return [];
  const outerRight = outer.x + outer.width;
  const outerBottom = outer.y + outer.height;
  const clippedInner = {
    x: Math.max(outer.x, inner.x),
    y: Math.max(outer.y, inner.y),
    width: Math.max(0, Math.min(outerRight, inner.x + inner.width) - Math.max(outer.x, inner.x)),
    height: Math.max(0, Math.min(outerBottom, inner.y + inner.height) - Math.max(outer.y, inner.y)),
  };
  const boundaries = [
    ...inspectLayoutStructureRect(role, outer),
    ...(positiveRect(clippedInner) ? inspectLayoutStructureRect(role, clippedInner) : []),
  ];
  return [...fills, ...boundaries];
};

/** 三种 layout family 共用的固定六层 inspection 分组 */
export type LayoutInspectionLayers = Readonly<{
  underlay: Array<InspectionPrimitive>;
  boxes: Array<InspectionPrimitive>;
  warnings: Array<InspectionPrimitive>;
  guides: Array<InspectionPrimitive>;
  labels: Array<InspectionPrimitive>;
}>;

/** 把 resolved spacing artifact lowering 为 family-specific underlay */
export const inspectLayoutSpacing = (
  family: 'flex' | 'grid',
  spacing: ReadonlyArray<LayoutSpacingArtifact>,
  options: Readonly<{ gaps: boolean; distributedSpace: boolean }>,
): Array<InspectionPrimitive> => {
  const inspected: Array<InspectionPrimitive> = [];
  spacing
    .filter(
      segment =>
        (segment.kind === LayoutSpacingKind.Gap && options.gaps) ||
        (segment.kind === LayoutSpacingKind.Distributed && options.distributedSpace),
    )
    .forEach(segment => {
      const role = `${family}.${segment.kind}`;
      if (segment.kind === LayoutSpacingKind.Gap) {
        inspected.push({
          kind: 'rect',
          role,
          ...segment.bounds,
          presentation: 'fill',
          tone: 'scope',
          fillPattern: 'forward-diagonal',
        });
      }
      inspected.push(...inspectLayoutStructureRect(role, segment.bounds));
    });
  return inspected;
};

/** 把三种 layout 共用 artifact 几何 lowering 为基础 inspection primitives */
export const inspectLayoutArtifactBase = (
  container: LayoutArtifactContainer,
  items: ReadonlyArray<LayoutArtifactItemBase>,
  options: ResolvedBaseLayoutInspectOptions,
  alignmentGuideDimension: 'x' | 'y' = 'y',
): LayoutInspectionLayers => {
  const underlay: Array<InspectionPrimitive> = [];
  const boxes: Array<InspectionPrimitive> = [];
  const warnings: Array<InspectionPrimitive> = [];
  const guides: Array<InspectionPrimitive> = [];
  const labels: Array<InspectionPrimitive> = [];
  if (options.bounds.container) boxes.push(outline('layout.container', container.allocationBounds));
  if (options.bounds.content) boxes.push(outline('layout.content', container.contentBounds));
  items.forEach(item => {
    if (options.bounds.slot) boxes.push(outline('layout.slot', item.slotBounds));
    if (options.bounds.allocation) boxes.push(outline('layout.allocation', item.allocationBounds));
    if (options.bounds.visual) boxes.push(outline('layout.visual', item.visualBounds));
    if (
      options.overflow &&
      (item.overflow.allocation.x ||
        item.overflow.allocation.y ||
        item.overflow.visual.x ||
        item.overflow.visual.y ||
        item.overflow.clipped)
    ) {
      warnings.push({
        kind: 'rect',
        role: 'layout.overflow',
        ...item.visualBounds,
        presentation: 'fill',
        tone: 'warning',
        fillPattern: 'solid',
      });
    }
    if (options.alignmentGuides && item.alignmentGuide !== undefined) {
      const vertical = alignmentGuideDimension === 'x';
      guides.push({
        kind: 'line',
        role: 'layout.alignment-guide',
        x1: vertical ? item.alignmentGuide.position : item.slotBounds.x,
        y1: vertical ? item.slotBounds.y : item.alignmentGuide.position,
        x2: vertical ? item.alignmentGuide.position : item.slotBounds.x + item.slotBounds.width,
        y2: vertical ? item.slotBounds.y + item.slotBounds.height : item.alignmentGuide.position,
        tone: 'scope',
        lineStyle: 'dashed',
      });
    }
    if (options.labels) {
      labels.push({
        kind: 'label',
        role: 'layout.label',
        x: item.slotBounds.x + 3,
        y: item.slotBounds.y + 12,
        text: item.key,
        tone: 'scope',
      });
    }
  });
  if (options.spacing.padding) {
    underlay.push(
      ...fillRing('layout.padding', container.allocationBounds, container.contentBounds, 'backward-diagonal'),
    );
  }
  if (options.spacing.margin) {
    items.forEach(item =>
      underlay.push(...fillRing('layout.margin', item.marginBounds, item.slotBounds, 'forward-diagonal')),
    );
  }
  return { underlay, boxes, warnings, guides, labels };
};
