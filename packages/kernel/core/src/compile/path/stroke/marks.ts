import { RAD_TO_DEG } from '@retikz/math';
import type { CurveSegmentSample } from '@retikz/math';

import type { GroupPrimitive, PaintValue, ScenePrimitive, ResolvedArrowEnd, Transform } from '../../../contract';
import type { SceneResource } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { MarkResolution } from '../../../resolve';
import { createLayoutProbeRecoverableError, safeThrownDetail } from '../../../resolve/diagnostics';
import { materializeScenePrimitives } from '../../resource';
import type { PaintResolver } from '../../resource';
import { combineOpacity } from '../../text';

/** 标记输出的资源引用及诊断位置 */
type MarkResourceContext = {
  /** 按 id 索引的资源 Map */
  resourceMap: ReadonlyMap<string, SceneResource>;
  /** 宿主路径与标记下标 */
  irPath: string;
};

/** 在放置内容的同一轮递归中检查资源引用 */
const assertMarkResource = (
  context: MarkResourceContext | undefined,
  id: string,
  kind: SceneResource['kind'],
): void => {
  if (context !== undefined && context.resourceMap.get(id)?.kind !== kind)
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Expected ${kind} resource '${id}' at ${context.irPath}`);
};

const resolveMarkerContextFill = (value: PaintValue, contextStroke: PaintValue): PaintValue =>
  typeof value === 'object' && value.kind === 'contextStroke' ? contextStroke : value;

/** marker 放置所需上下文 */
type BuildMarkMarkerGroupContext = {
  /** 标记的固定角度或切线定向 */
  rotate?: 'auto' | number;
  /** 标记放置缩放 */
  scale?: number;
  /** 用于将标记宽高倍率换算为场景尺寸的路径线宽 */
  strokeWidth: number;
  /** 舍入标记放置变换中的数值 */
  round: (n: number) => number;
  /** 替换标记内部继承描边色占位的 CSS 颜色 */
  contextStroke: PaintValue;
  /** 与标记自身及其绘制图元透明度相乘的宿主因子 */
  hostOpacity?: number;
};

/** 保留标记结构，递归解析宿主描边色并将透明度因子应用到绘制图元 */
const markerPrimToScene = (
  prim: ScenePrimitive,
  contextStroke: PaintValue,
  hostOpacity?: number,
  resources?: MarkResourceContext,
): ScenePrimitive => {
  const content = { ...prim };
  delete content.id;
  delete content.meta;
  if (content.type === 'group') {
    if (content.clipRef !== undefined) assertMarkResource(resources, content.clipRef, 'clip');
    return {
      ...content,
      children: content.children.map(c => markerPrimToScene(c, contextStroke, hostOpacity, resources)),
    };
  }

  const opacity = combineOpacity(content.opacity, hostOpacity);
  const appearance = opacity === undefined ? {} : { opacity };
  if (content.type === 'text') return { ...content, ...appearance };

  for (const paint of [content.fill, content.stroke]) {
    if (typeof paint === 'object' && paint.kind === 'resourceRef') assertMarkResource(resources, paint.id, 'paint');
  }

  return {
    ...content,
    ...appearance,
    ...(content.fill !== undefined && { fill: resolveMarkerContextFill(content.fill, contextStroke) }),
    ...(content.stroke !== undefined && { stroke: resolveMarkerContextFill(content.stroke, contextStroke) }),
  };
};

/**
 * 把已物化的 arrow marker（局部 baseSize 坐标系，尖端 +x）按路径切线定向放到采样点
 * @description marker 局部系：viewBox `0 0 baseSize baseSize`，参考点 (refX, baseSize/2)，尖端朝 +x
 */
export const buildMarkMarkerGroup = (
  spec: ResolvedArrowEnd,
  sample: CurveSegmentSample,
  context: BuildMarkMarkerGroupContext,
): GroupPrimitive => {
  const { strokeWidth, round, contextStroke } = context;
  const angleDeg =
    typeof context.rotate === 'number' ? context.rotate : Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
  const sx = (spec.markerWidth * strokeWidth * (context.scale ?? 1)) / spec.baseSize;
  const sy = (spec.markerHeight * strokeWidth * (context.scale ?? 1)) / spec.baseSize;
  const refY = spec.baseSize / 2;
  const transforms: Array<Transform> = [
    { kind: 'translate', x: round(sample.point[0]), y: round(sample.point[1]) },
    { kind: 'rotate', degrees: round(angleDeg) },
    { kind: 'scale', x: round(sx), y: round(sy) },
    { kind: 'translate', x: round(-spec.refX), y: round(-refY) },
  ];

  return {
    type: 'group',
    transforms,
    children: spec.marker.map(p =>
      markerPrimToScene(p, contextStroke, combineOpacity(spec.opacity, context.hostOpacity)),
    ),
  };
};

/** 按统一尺寸和局部锚点放置标记图元 */
export const placeMarkPrimitives = (
  primitives: Array<ScenePrimitive>,
  resolution: MarkResolution,
  sample: CurveSegmentSample,
  context: BuildMarkMarkerGroupContext,
  resources: MarkResourceContext,
): GroupPrimitive => ({
  type: 'group',
  transforms: [
    { kind: 'translate', x: context.round(sample.point[0]), y: context.round(sample.point[1]) },
    {
      kind: 'rotate',
      degrees: context.round(
        typeof context.rotate === 'number'
          ? context.rotate
          : Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG,
      ),
    },
    {
      kind: 'scale',
      x: context.round((resolution.geometry.resolvedLength * context.strokeWidth) / resolution.geometry.baseSize),
      y: context.round((resolution.geometry.resolvedWidth * context.strokeWidth) / resolution.geometry.baseSize),
    },
    {
      kind: 'translate',
      x: context.round(-resolution.geometry.anchor[0]),
      y: context.round(-resolution.geometry.anchor[1]),
    },
  ],
  children: primitives.map(primitive =>
    markerPrimToScene(
      primitive,
      context.contextStroke,
      combineOpacity(resolution.visual.opacity, context.hostOpacity),
      resources,
    ),
  ),
});

/** 由共同定义生成箭头或沿线标记的局部图元 */
export const emitMarkPrimitives = (
  resolution: Pick<MarkResolution, 'mark' | 'visual' | 'definition'>,
  round: (value: number) => number,
  resolvePaint: PaintResolver,
  owner: { label: string; providerKey: string },
): Array<ScenePrimitive> => {
  const { mark, visual, definition } = resolution;
  const contextStroke: PaintValue = { kind: 'contextStroke' };
  let emitted: Array<ScenePrimitive>;
  try {
    emitted = Array.from(
      definition.emit({
        params: mark.params ?? {},
        stroke: resolvePaint(visual.stroke) ?? contextStroke,
        fill: definition.hollow ? contextStroke : (resolvePaint(visual.fill) ?? contextStroke),
        lineWidth: visual.lineWidth,
        dashPattern: visual.dashPattern,
        dashOffset: visual.dashOffset,
        lineCap: visual.lineCap,
        lineJoin: visual.lineJoin,
        round,
      }),
    );
  } catch (cause) {
    throw createLayoutProbeRecoverableError(`${owner.label} emit failed: ${safeThrownDetail(cause)}`, {
      cause,
      providerKey: owner.providerKey,
    });
  }
  return materializeScenePrimitives(owner.label, emitted);
};
