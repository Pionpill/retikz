import type { IRGraphicStyle, IRNode, IRPath } from '@retikz/core';
import type { InspectionAppearanceContext } from '@retikz/inspect';

import type {
  LayoutArtifactContainer,
  LayoutArtifactItemBase,
  LayoutArtifactRect,
  LayoutSpacingArtifact,
} from '../../composites/shared';
import type { ResolvedBaseLayoutInspectOptions } from './types';

import { LayoutSpacingKind } from '../../composites/shared';

/** 布局辅助边界使用的标准虚线周期 */
const LayoutInspectionDashPattern = Object.freeze([6, 4]);

/** 布局辅助纹理在用户坐标中的标准周期 */
const LayoutInspectionPatternSize = 12;

/** 布局辅助纹理的标准线宽 */
const LayoutInspectionPatternLineWidth = 1;

/** 布局辅助纹理的标准透明度 */
const LayoutInspectionPatternOpacity = 0.55;

/** 布局溢出警告填充的标准透明度 */
const LayoutInspectionWarningOpacity = 0.14;

/** 布局辅助图形的共享语义信息 */
type LayoutInspectionMarkBase = Readonly<{
  /** 用于测试和诊断的布局语义角色，辅助场景封装时会移除 */
  role: string;
}>;

/** 一段布局辅助边界 */
export type LayoutInspectionLineMark = LayoutInspectionMarkBase &
  Readonly<{
    kind: 'line';
    /** 起点横坐标 */
    x1: number;
    /** 起点纵坐标 */
    y1: number;
    /** 终点横坐标 */
    x2: number;
    /** 终点纵坐标 */
    y2: number;
    /** 普通路径的描边颜色 */
    color: string;
    /** 是否使用布局辅助边界的标准虚线 */
    dashed: boolean;
  }>;

/** 一块尚未展开为四条边界的矩形轮廓 */
export type LayoutInspectionOutlineMark = LayoutInspectionMarkBase &
  Readonly<{
    kind: 'outline';
    /** 轮廓矩形 */
    rect: LayoutArtifactRect;
    /** 普通路径的描边颜色 */
    color: string;
  }>;

/** 一块由普通节点填充的布局辅助区域 */
type LayoutInspectionAreaMark = LayoutInspectionMarkBase &
  Readonly<{
    kind: 'area';
    /** 填充矩形 */
    rect: LayoutArtifactRect;
    /** 普通节点使用的颜色或填充 */
    fill: IRGraphicStyle['fill'];
    /** 普通节点的整体透明度 */
    opacity: number;
  }>;

/** 一条由普通节点承载的布局辅助标签 */
type LayoutInspectionLabelMark = LayoutInspectionMarkBase &
  Readonly<{
    kind: 'label';
    /** 标签横坐标 */
    x: number;
    /** 标签纵坐标 */
    y: number;
    /** 标签文本 */
    text: string;
    /** 标签文字颜色 */
    color: string;
  }>;

/** Layout 布局内部用于排序与共线消重的辅助标记 */
export type LayoutInspectionMark =
  | LayoutInspectionLineMark
  | LayoutInspectionOutlineMark
  | LayoutInspectionAreaMark
  | LayoutInspectionLabelMark;

/** Layout 布局检查器实际返回的普通 Core 子元素 */
export type LayoutInspectionChild = IRPath | IRNode;

/** 创建一块虚线矩形轮廓 */
export const inspectLayoutOutline = (
  role: string,
  rect: LayoutArtifactRect,
  color: string,
): LayoutInspectionOutlineMark => ({ kind: 'outline', role, rect, color });

/** 创建一段可选择实线或虚线的辅助边界 */
export const inspectLayoutLine = (
  role: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  dashed: boolean,
): LayoutInspectionLineMark => ({ kind: 'line', role, x1, y1, x2, y2, color, dashed });

const positiveRect = (rect: LayoutArtifactRect): boolean => rect.width > 0 && rect.height > 0;

const sameCoordinate = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-9;

/** 用固定正交坐标与升序区间表示一段水平或垂直边界 */
type AxisAlignedBoundarySegment = Readonly<{
  /** 边界延伸的物理轴 */
  axis: 'x' | 'y';
  /** 正交轴上的固定坐标 */
  fixed: number;
  /** 主轴升序起点 */
  start: number;
  /** 主轴升序终点 */
  end: number;
}>;

/** 把正交边界转成便于区间运算的标准线段 */
const boundarySegmentOf = (line: LayoutInspectionLineMark): AxisAlignedBoundarySegment | undefined => {
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

/** 以来源边界的方向和视觉语义恢复一个未覆盖区间 */
const lineFromBoundarySegment = (
  source: LayoutInspectionLineMark,
  segment: AxisAlignedBoundarySegment,
): LayoutInspectionLineMark => {
  const forward = segment.axis === 'x' ? source.x1 <= source.x2 : source.y1 <= source.y2;
  const start = forward ? segment.start : segment.end;
  const end = forward ? segment.end : segment.start;
  return segment.axis === 'x'
    ? { ...source, x1: start, y1: segment.fixed, x2: end, y2: segment.fixed }
    : { ...source, x1: segment.fixed, y1: start, x2: segment.fixed, y2: end };
};

/** 保留非边界标记，并把矩形轮廓或正交线切成未覆盖片段 */
const normalizeBoundaryMark = (
  mark: LayoutInspectionMark,
  covered: Array<AxisAlignedBoundarySegment>,
): Array<LayoutInspectionMark> => {
  if (mark.kind !== 'line' && mark.kind !== 'outline') return [mark];
  const sourceLines = mark.kind === 'line' ? [mark] : inspectLayoutStructureRect(mark.role, mark.rect, mark.color);
  const fragments = sourceLines.flatMap(line => {
    const segment = boundarySegmentOf(line);
    if (segment === undefined) return [line];
    const uncovered = subtractCoveredBoundary(segment, covered);
    covered.push(...uncovered);
    return uncovered.map(fragment => lineFromBoundarySegment(line, fragment));
  });
  const unchanged =
    mark.kind === 'outline' &&
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
  return unchanged ? [mark] : fragments;
};

/** 按传入优先级切分共线边界，已覆盖区间保留更早语义 */
export const normalizeLayoutBoundaryGroups = (
  groups: ReadonlyArray<ReadonlyArray<LayoutInspectionMark>>,
): Array<Array<LayoutInspectionMark>> => {
  const covered: Array<AxisAlignedBoundarySegment> = [];
  return groups.map(group => group.flatMap(mark => normalizeBoundaryMark(mark, covered)));
};

/** 把矩形结构区域展开为四条虚线边界 */
export const inspectLayoutStructureRect = (
  role: string,
  rect: LayoutArtifactRect,
  color: string,
): Array<LayoutInspectionLineMark> => [
  inspectLayoutLine(role, rect.x, rect.y, rect.x + rect.width, rect.y, color, true),
  inspectLayoutLine(role, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, color, true),
  inspectLayoutLine(role, rect.x, rect.y + rect.height, rect.x + rect.width, rect.y + rect.height, color, true),
  inspectLayoutLine(role, rect.x, rect.y, rect.x, rect.y + rect.height, color, true),
];

/** 返回外层矩形减去裁剪后内层矩形所得的非重叠区域 */
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

/** 创建普通线条纹理填充，并保留既有斜线方向 */
const patternFill = (
  color: string,
  direction: 'forward-diagonal' | 'backward-diagonal',
): NonNullable<IRGraphicStyle['fill']> => ({
  kind: 'pattern',
  shape: 'lines',
  color,
  size: LayoutInspectionPatternSize,
  lineWidth: LayoutInspectionPatternLineWidth,
  rotation: direction === 'forward-diagonal' ? -45 : 45,
});

/** 创建带纹理填充及内外虚线边界的矩形环 */
const fillRing = (
  role: string,
  outer: LayoutArtifactRect,
  inner: LayoutArtifactRect,
  direction: 'forward-diagonal' | 'backward-diagonal',
  color: string,
): Array<LayoutInspectionMark> => {
  const fills: Array<LayoutInspectionMark> = subtractRect(outer, inner).map(rect => ({
    kind: 'area',
    role,
    rect,
    fill: patternFill(color, direction),
    opacity: LayoutInspectionPatternOpacity,
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
    ...inspectLayoutStructureRect(role, outer, color),
    ...(positiveRect(clippedInner) ? inspectLayoutStructureRect(role, clippedInner, color) : []),
  ];
  return [...fills, ...boundaries];
};

/** 三种布局类型共用的固定辅助内容分组 */
export type LayoutInspectionLayers = Readonly<{
  /** 间距纹理与边界 */
  underlay: Array<LayoutInspectionMark>;
  /** 容器与项目盒边界 */
  boxes: Array<LayoutInspectionMark>;
  /** 溢出警告 */
  warnings: Array<LayoutInspectionMark>;
  /** 对齐辅助线 */
  guides: Array<LayoutInspectionMark>;
  /** 项目文本标签 */
  labels: Array<LayoutInspectionMark>;
}>;

/** 把已解析的间距产物转换为对应布局类型的底层辅助内容 */
export const inspectLayoutSpacing = (
  family: 'flex' | 'grid',
  spacing: ReadonlyArray<LayoutSpacingArtifact>,
  options: Readonly<{ gaps: boolean; distributedSpace: boolean }>,
  appearance: InspectionAppearanceContext,
): Array<LayoutInspectionMark> => {
  const inspected: Array<LayoutInspectionMark> = [];
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
          kind: 'area',
          role,
          rect: segment.bounds,
          fill: patternFill(appearance.scopeColor, 'forward-diagonal'),
          opacity: LayoutInspectionPatternOpacity,
        });
      }
      inspected.push(...inspectLayoutStructureRect(role, segment.bounds, appearance.scopeColor));
    });
  return inspected;
};

/** 把三种布局共用的产物几何转换为基础辅助标记 */
export const inspectLayoutArtifactBase = (
  container: LayoutArtifactContainer,
  items: ReadonlyArray<LayoutArtifactItemBase>,
  options: ResolvedBaseLayoutInspectOptions,
  appearance: InspectionAppearanceContext,
  alignmentGuideDimension: 'x' | 'y' = 'y',
): LayoutInspectionLayers => {
  const underlay: Array<LayoutInspectionMark> = [];
  const boxes: Array<LayoutInspectionMark> = [];
  const warnings: Array<LayoutInspectionMark> = [];
  const guides: Array<LayoutInspectionMark> = [];
  const labels: Array<LayoutInspectionMark> = [];
  if (options.bounds.container) {
    boxes.push(inspectLayoutOutline('layout.container', container.allocationBounds, appearance.scopeColor));
  }
  if (options.bounds.content) {
    boxes.push(inspectLayoutOutline('layout.content', container.contentBounds, appearance.scopeColor));
  }
  items.forEach(item => {
    if (options.bounds.slot) boxes.push(inspectLayoutOutline('layout.slot', item.slotBounds, appearance.scopeColor));
    if (options.bounds.allocation) {
      boxes.push(inspectLayoutOutline('layout.allocation', item.allocationBounds, appearance.scopeColor));
    }
    if (options.bounds.visual) {
      boxes.push(inspectLayoutOutline('layout.visual', item.visualBounds, appearance.scopeColor));
    }
    if (
      options.overflow &&
      (item.overflow.allocation.x ||
        item.overflow.allocation.y ||
        item.overflow.visual.x ||
        item.overflow.visual.y ||
        item.overflow.clipped)
    ) {
      warnings.push({
        kind: 'area',
        role: 'layout.overflow',
        rect: item.visualBounds,
        fill: appearance.semanticColors.warning,
        opacity: LayoutInspectionWarningOpacity,
      });
    }
    if (options.alignmentGuides && item.alignmentGuide !== undefined) {
      const vertical = alignmentGuideDimension === 'x';
      guides.push(
        inspectLayoutLine(
          'layout.alignment-guide',
          vertical ? item.alignmentGuide.position : item.slotBounds.x,
          vertical ? item.slotBounds.y : item.alignmentGuide.position,
          vertical ? item.alignmentGuide.position : item.slotBounds.x + item.slotBounds.width,
          vertical ? item.slotBounds.y + item.slotBounds.height : item.alignmentGuide.position,
          appearance.semanticColors.guide,
          true,
        ),
      );
    }
    if (options.labels) {
      labels.push({
        kind: 'label',
        role: 'layout.label',
        x: item.slotBounds.x + 3,
        y: item.slotBounds.y + 12,
        text: item.key,
        color: appearance.scopeColor,
      });
    }
  });
  if (options.spacing.padding) {
    underlay.push(
      ...fillRing(
        'layout.padding',
        container.allocationBounds,
        container.contentBounds,
        'backward-diagonal',
        appearance.scopeColor,
      ),
    );
  }
  if (options.spacing.margin) {
    items.forEach(item =>
      underlay.push(
        ...fillRing('layout.margin', item.marginBounds, item.slotBounds, 'forward-diagonal', appearance.scopeColor),
      ),
    );
  }
  return { underlay, boxes, warnings, guides, labels };
};

/** 把单个矩形轮廓转换为普通 Core 路径 */
const lowerOutline = (mark: LayoutInspectionOutlineMark): IRPath => {
  const { x, y, width, height } = mark.rect;
  return {
    type: 'path',
    stroke: mark.color,
    strokeWidth: 1,
    dashPattern: [...LayoutInspectionDashPattern],
    meta: { inspectionRole: mark.role },
    children: [
      { type: 'step', kind: 'move', to: [x, y] },
      { type: 'step', kind: 'line', to: [x + width, y] },
      { type: 'step', kind: 'line', to: [x + width, y + height] },
      { type: 'step', kind: 'line', to: [x, y + height] },
      { type: 'step', kind: 'line', to: [x, y] },
    ],
  };
};

/** 把单个内部辅助标记转为普通 Core 子元素 */
const lowerLayoutInspectionMark = (mark: LayoutInspectionMark): LayoutInspectionChild => {
  if (mark.kind === 'outline') return lowerOutline(mark);
  if (mark.kind === 'line') {
    return {
      type: 'path',
      stroke: mark.color,
      strokeWidth: 1,
      ...(mark.dashed ? { dashPattern: [...LayoutInspectionDashPattern] } : {}),
      meta: { inspectionRole: mark.role },
      children: [
        { type: 'step', kind: 'move', to: [mark.x1, mark.y1] },
        { type: 'step', kind: 'line', to: [mark.x2, mark.y2] },
      ],
    };
  }
  if (mark.kind === 'area') {
    return {
      type: 'node',
      position: [mark.rect.x + mark.rect.width / 2, mark.rect.y + mark.rect.height / 2],
      shape: 'rectangle',
      minimumSize: { width: mark.rect.width, height: mark.rect.height },
      padding: 0,
      fill: mark.fill,
      opacity: mark.opacity,
      strokeWidth: 0,
      meta: { inspectionRole: mark.role },
    };
  }
  return {
    type: 'node',
    position: [mark.x, mark.y],
    text: mark.text,
    textColor: mark.color,
    fill: 'transparent',
    strokeWidth: 0,
    padding: 0,
    font: {
      family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      size: 10,
    },
    meta: { inspectionRole: mark.role },
  };
};

/** 按既有绘制顺序把布局辅助标记下沉为普通 Core 子元素 */
export const lowerLayoutInspectionMarks = (marks: ReadonlyArray<LayoutInspectionMark>): Array<LayoutInspectionChild> =>
  marks.map(lowerLayoutInspectionMark);
