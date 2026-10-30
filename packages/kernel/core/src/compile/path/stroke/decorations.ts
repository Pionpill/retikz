import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompiledArrowEnd, ScenePrimitive } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalPath, StrokePathResolution } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { PaintRegistry, PaintResolver } from '../../resource';
import type { StrokePathGeometry } from './interruption';
import { sampleStrokeMarkGeometry } from './interruption';
import { emitMarkPrimitives, placeMarkPrimitives } from './marks';
import type { PathBasePropsWithStrokeWidth } from './output';
import { emitEndpointArrowMark } from './shrink';

/** 端点箭头及主线接触调整 */
type PathEndpointArrows = {
  /** 起点箭头内容 */
  arrowStart?: CompiledArrowEnd;
  /** 终点箭头内容 */
  arrowEnd?: CompiledArrowEnd;
  /** 起点接触截短量 */
  shrinkStart: number;
  /** 终点接触截短量 */
  shrinkEnd: number;
  /** 起点边界外轮廓补偿 */
  boundaryOuterInsetStart: number;
  /** 终点边界外轮廓补偿 */
  boundaryOuterInsetEnd: number;
};

/** 端点箭头生成上下文 */
type EmitPathEndpointArrowsContext = {
  /** 箭头声明对应的解析结果 Map */
  arrowResolutions: StrokePathResolution['arrows'];
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** 绘制资源解析函数 */
  resolvePaint: PaintResolver;
  /** 宿主 IR 位置 */
  irPath: PropertyPath;
};

/** 仅消费显式端点箭头，标记位置不影响截断 */
export const emitPathEndpointArrows = (
  path: Pick<CanonicalPath, 'arrow'>,
  context: EmitPathEndpointArrowsContext,
): PathEndpointArrows => {
  const arrows: PathEndpointArrows = {
    shrinkStart: 0,
    shrinkEnd: 0,
    boundaryOuterInsetStart: 0,
    boundaryOuterInsetEnd: 0,
  };
  for (const endpoint of ['start', 'end'] as const) {
    const arrow = path.arrow?.[endpoint];
    if (arrow === undefined) continue;
    const resolution = context.arrowResolutions.get(arrow);
    if (resolution === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Missing arrow binding at ${formatPropertyPath(context.irPath)}.arrow.${endpoint}`,
      );
    const emitted = emitEndpointArrowMark(resolution, arrow.endpointOverlap ?? 0, context.round, context.resolvePaint);
    if (endpoint === 'start') {
      arrows.arrowStart = emitted.spec;
      arrows.shrinkStart = emitted.shrink;
      arrows.boundaryOuterInsetStart = emitted.boundaryOuterInset;
    } else {
      arrows.arrowEnd = emitted.spec;
      arrows.shrinkEnd = emitted.shrink;
      arrows.boundaryOuterInsetEnd = emitted.boundaryOuterInset;
    }
  }
  return arrows;
};

/** 沿线标记生成上下文 */
type InputPathMarkEmission = {
  /** 记录标记引用的原始位置，资源完整后再校验 */
  collectResourceReferences?: PaintRegistry['collectReferences'];
  /** 截断前路径几何 */
  geometry: StrokePathGeometry;
  /** 按绘制顺序保存的标记放置列表 */
  placements: NonNullable<CanonicalPath['marks']>;
  /** 按标记声明索引的解析结果 Map */
  markResolutions: StrokePathResolution['marks'];
  /** 宿主有效外观 */
  baseProps: PathBasePropsWithStrokeWidth;
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** 绘制资源解析函数 */
  resolvePaint: PaintResolver;
  /** 宿主 IR 位置 */
  irPath: PropertyPath;
};

/** 沿截断前路径的累计弧长放置标记内容 */
export const emitPathMarks = ({
  collectResourceReferences,
  geometry,
  placements,
  markResolutions,
  baseProps,
  round,
  resolvePaint,
  irPath,
}: InputPathMarkEmission) => {
  const primitives: Array<ScenePrimitive> = [];
  const boundsPoints: Array<IRPosition> = [];
  for (const [index, placement] of placements.entries()) {
    const sample = sampleStrokeMarkGeometry(geometry, placement.pos);
    if (sample === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Cannot locate mark on a zero-length path at ${formatPropertyPath(irPath)}.marks[${index}]`,
      );
    const context = {
      strokeWidth: baseProps.strokeWidth,
      round,
      contextStroke: baseProps.stroke ?? 'currentColor',
      hostOpacity: baseProps.opacity,
      rotate: placement.rotate,
    };
    const resolution = markResolutions.get(placement);
    const location = [...irPath, 'marks', index];
    if (resolution === undefined)
      throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Missing mark binding at ${formatPropertyPath(location)}`);
    const content = emitMarkPrimitives(resolution, round, resolvePaint, {
      label: `Mark '${resolution.definition.name}' at ${formatPropertyPath(location)}`,
      providerKey: `mark:${resolution.definition.name}`,
    });
    collectResourceReferences?.(content, `Mark at ${formatPropertyPath(location)}`);
    primitives.push(placeMarkPrimitives(content, resolution, sample, context));
    boundsPoints.push(sample.point);
  }
  return { primitives, boundsPoints };
};

/** 提取存在的端点箭头字段 */
export const pathEndpointArrows = (
  arrows: PathEndpointArrows,
): { arrowStart?: CompiledArrowEnd; arrowEnd?: CompiledArrowEnd } => ({
  ...(arrows.arrowStart === undefined ? {} : { arrowStart: arrows.arrowStart }),
  ...(arrows.arrowEnd === undefined ? {} : { arrowEnd: arrows.arrowEnd }),
});
