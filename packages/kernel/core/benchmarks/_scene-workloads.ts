import type { AxisAlignedBounds, BoundsRect, CurveSegmentSample } from '@retikz/math';

import { createRound } from '../src/compile/scene';
import type { MarkerPlacementContext } from '../src/compile/scene';
import type {
  CompiledArrowEnd,
  GroupPrimitive,
  PathCommand,
  PathPrimitive,
  ScenePrimitive,
  SceneResource,
} from '../src/contract';
import type { CanonicalDropShadow, IRPosition } from '../src/schemas';

/** 可见边界基准的六类代表负载 */
export type SceneBoundsMode = 'polyline' | 'bezier' | 'ellipse' | 'arrows' | 'hidden-arrows' | 'clipped-group';

/** 单次边界求值的完整输入及独立几何预期 */
export type SceneBoundsWorkload = {
  /** 最终Scene图元，不在采样中增长 */
  primitives: Array<ScenePrimitive>;
  /** 配套裁剪资源 */
  resources: Array<SceneResource>;
  /** 按输入构造规则计算的独立轴对齐边界 */
  expectedBounds: BoundsRect;
};

/** 构造单路径或单裁剪组；规模包含首条move命令，不包含固定marker及5条clip命令 */
export const createSceneBoundsWorkload = (count: number, mode: SceneBoundsMode): SceneBoundsWorkload => {
  const commands: Array<PathCommand> = [{ kind: 'move', to: [0, 0] }];
  const hasEllipses = mode === 'ellipse' || mode === 'arrows' || mode === 'hidden-arrows';
  for (let index = 1; index < count; index++) {
    if (hasEllipses) {
      commands.push({
        kind: 'ellipseArc',
        center: [index * 20, 0],
        radiusX: 8,
        radiusY: 4,
        rotation: 30,
        startAngle: 0,
        endAngle: 90,
      });
    } else if (mode === 'bezier') {
      commands.push({
        kind: 'cubic',
        control1: [index - 1, 10],
        control2: [index, -10],
        to: [index, 0],
      });
    } else {
      commands.push({ kind: 'line', to: [index, index % 2 === 0 ? 0 : 10] });
    }
  }

  const path: PathPrimitive = { type: 'path', commands, stroke: '#000', strokeWidth: 2, lineJoin: 'round' };
  let expectedBounds: BoundsRect;
  if (hasEllipses) {
    // 旋转30度、半轴8/4的完整保守包络：半宽sqrt(52)，半高sqrt(28)
    const halfWidth = Math.sqrt(52);
    const halfHeight = Math.sqrt(28);
    expectedBounds = {
      x: -1,
      y: -halfHeight - 1,
      width: (count - 1) * 20 + halfWidth + 2,
      height: halfHeight * 2 + 2,
    };
  } else {
    expectedBounds = {
      x: -1,
      y: mode === 'bezier' ? -11 : -1,
      width: count + 1,
      height: mode === 'bezier' ? 22 : 12,
    };
  }

  if (mode === 'arrows' || mode === 'hidden-arrows') {
    // 2x2实际尺寸的marker完整落在上述含描边包络内，首尾可见箭头仍参与求值
    const arrow: CompiledArrowEnd = {
      shape: 'bounds-benchmark',
      baseSize: 10,
      refX: 0,
      markerWidth: 1,
      markerHeight: 1,
      marker: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#000' }],
      ...(mode === 'hidden-arrows' ? { opacity: 0 } : {}),
    };
    path.arrowStart = arrow;
    path.arrowEnd = arrow;
  }

  if (mode === 'clipped-group') {
    const clipWidth = (count - 1) / 2;
    return {
      primitives: [
        {
          type: 'group',
          clipRef: 'bounds-window',
          transforms: [{ kind: 'translate', x: 3, y: 7 }],
          children: [path],
        },
      ],
      resources: [
        {
          kind: 'clip',
          id: 'bounds-window',
          path: {
            fillRule: 'nonzero',
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [clipWidth, 0] },
              { kind: 'line', to: [clipWidth, 5] },
              { kind: 'line', to: [0, 5] },
              { kind: 'close' },
            ],
          },
        },
      ],
      expectedBounds: { x: 3, y: 7, width: clipWidth, height: 5 },
    };
  }

  return { primitives: [path], resources: [], expectedBounds };
};

/** 一次布局贡献合并的输入及独立min/max预期 */
export type SceneMergeWorkload = {
  /** 已有贡献 */
  current: AxisAlignedBounds;
  /** 新贡献点集 */
  points: Array<IRPosition>;
  /** 可选方向性阴影 */
  shadow?: CanonicalDropShadow;
  /** 合并后预期范围 */
  expectedBounds: AxisAlignedBounds;
};

/** 构造一份可扩容点集，不通过重复合并调用制造负载 */
export const createSceneMergeWorkload = (count: number, shadowed: boolean): SceneMergeWorkload => ({
  current: { minX: -10, minY: -2, maxX: -5, maxY: 2 },
  points: Array.from({ length: count }, (_, index): IRPosition => [index, index % 2 === 0 ? -5 : 5]),
  ...(shadowed ? { shadow: { offsetX: 3, offsetY: -4, blur: 2, color: '#000' } } : {}),
  expectedBounds: {
    minX: -10,
    minY: shadowed ? -11 : -5,
    maxX: count - 1 + (shadowed ? 5 : 0),
    maxY: shadowed ? 7 : 5,
  },
});

/** 一次完整标记放置及递归物化的输入和独立输出树 */
export type SceneMarkerWorkload = {
  /** 已编译标记 */
  spec: CompiledArrowEnd;
  /** 预置路径位置与切线，不计入曲线采样成本 */
  sample: CurveSegmentSample;
  /** 已准备的宿主外观与取整能力 */
  context: MarkerPlacementContext;
  /** 预期放置变换和物化后的图元 */
  expectedGroup: GroupPrimitive;
};

/** 构造固定三层组的标记；count只表示绘制叶图元数，不包含组节点 */
export const createSceneMarkerWorkload = (count: number, fixedRotation: boolean): SceneMarkerWorkload => {
  let sourceChildren: Array<ScenePrimitive> = [];
  let expectedChildren: Array<ScenePrimitive> = [];
  for (let index = 0; index < count; index++) {
    if (index % 2 === 0) {
      sourceChildren.push({
        type: 'rect',
        id: `rect-${index}`,
        meta: { index },
        x: index,
        y: 0,
        width: 2,
        height: 3,
        fill: { kind: 'contextStroke' },
        stroke: { kind: 'contextStroke' },
        opacity: 0.5,
      });
      expectedChildren.push({
        type: 'rect',
        x: index,
        y: 0,
        width: 2,
        height: 3,
        fill: '#147',
        stroke: '#147',
        opacity: 0.2,
      });
    } else {
      sourceChildren.push({
        type: 'text',
        id: `text-${index}`,
        meta: { index },
        x: index,
        y: 0,
        lines: [{ text: 'm' }],
        fontSize: 10,
        lineHeight: 12,
        measuredWidth: 4,
        measuredHeight: 12,
        align: 'start',
        baseline: 'alphabetic',
        fill: '#222',
        opacity: 0.25,
      });
      expectedChildren.push({
        type: 'text',
        x: index,
        y: 0,
        lines: [{ text: 'm' }],
        fontSize: 10,
        lineHeight: 12,
        measuredWidth: 4,
        measuredHeight: 12,
        align: 'start',
        baseline: 'alphabetic',
        fill: '#222',
        opacity: 0.1,
      });
    }
  }
  for (let depth = 0; depth < 3; depth++) {
    sourceChildren = [
      {
        type: 'group',
        id: `group-${depth}`,
        meta: { depth },
        transforms: [{ kind: 'translate', x: 1, y: 2 }],
        children: sourceChildren,
      },
    ];
    expectedChildren = [
      {
        type: 'group',
        transforms: [{ kind: 'translate', x: 1, y: 2 }],
        children: expectedChildren,
      },
    ];
  }
  return {
    spec: {
      shape: 'nested-benchmark',
      baseSize: 10,
      refX: 6,
      markerWidth: 2,
      markerHeight: 3,
      opacity: 0.5,
      marker: sourceChildren,
    },
    sample: { point: [30.125, 40.375], tangent: [0, 1] },
    context: {
      strokeWidth: 2,
      scale: 1.5,
      rotate: fixedRotation ? 30 : 'auto',
      round: createRound(2),
      contextStroke: '#147',
      hostOpacity: 0.8,
    },
    expectedGroup: {
      type: 'group',
      transforms: [
        { kind: 'translate', x: 30.13, y: 40.38 },
        { kind: 'rotate', degrees: fixedRotation ? 30 : 90 },
        { kind: 'scale', x: 0.6, y: 0.9 },
        { kind: 'translate', x: -6, y: -5 },
      ],
      children: expectedChildren,
    },
  };
};
