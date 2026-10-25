import type { ResolvedArrowEnd, ScenePrimitive } from '../../../contract';
import type { SceneResource } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalPath, StrokePathResolution } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import { materializeScenePrimitives } from '../../resource';
import type { PaintResolver } from '../../resource';
import type { StrokePathGeometry } from './interruption';
import { sampleStrokeMarkGeometry } from './interruption';
import { buildMarkMarkerGroup, placeMarkPrimitives } from './marks';
import type { PathBasePropsWithStrokeWidth } from './output';
import { emitEndpointArrowMark, emitMarkArrow } from './shrink';

/** 端点箭头及主线接触调整 */
export type PathEndpointArrows = {
  /** 起点箭头内容 */
  arrowStart?: ResolvedArrowEnd;
  /** 终点箭头内容 */
  arrowEnd?: ResolvedArrowEnd;
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
export type EmitPathEndpointArrowsContext = {
  /** 箭头声明对应的解析结果 Map */
  arrowResolutions: StrokePathResolution['arrows'];
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** 绘制资源解析函数 */
  resolvePaint: PaintResolver;
  /** 宿主 IR 位置 */
  irPath: string;
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
        `Missing arrow binding at ${context.irPath}.arrow.${endpoint}`,
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
export type EmitPathMarksInput = {
  /** 当前编译资源，用于普通标记的引用诊断 */
  resources?: () => ReadonlyArray<SceneResource>;
  /** 截断前路径几何 */
  geometry: StrokePathGeometry;
  /** 按绘制顺序保存的标记放置列表 */
  placements: NonNullable<CanonicalPath['marks']>;
  /** 箭头声明对应的解析结果 Map */
  arrowResolutions: StrokePathResolution['arrows'];
  /** 按名称索引的普通标记定义 Map */
  markDefinitions: StrokePathResolution['marks'];
  /** 宿主有效外观 */
  baseProps: PathBasePropsWithStrokeWidth;
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** 绘制资源解析函数 */
  resolvePaint: PaintResolver;
  /** 宿主 IR 位置 */
  irPath: string;
};

/** 沿截断前路径的累计弧长放置标记内容 */
export const emitPathMarks = ({
  resources,
  geometry,
  placements,
  arrowResolutions,
  markDefinitions,
  baseProps,
  round,
  resolvePaint,
  irPath,
}: EmitPathMarksInput) => {
  const primitives: Array<ScenePrimitive> = [];
  const boundsPoints: Array<IRPosition> = [];
  for (const [index, placement] of placements.entries()) {
    const { mark } = placement;
    const sample = sampleStrokeMarkGeometry(geometry, placement.pos);
    if (sample === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Cannot locate mark on a zero-length path at ${irPath}.marks[${index}]`,
      );
    const context = {
      strokeWidth: baseProps.strokeWidth,
      round,
      contextStroke: baseProps.stroke ?? 'currentColor',
      hostOpacity: baseProps.opacity,
      rotate: placement.rotate,
      scale: placement.scale,
    };
    if (mark.kind === 'arrow') {
      const resolution = arrowResolutions.get(mark);
      if (resolution === undefined)
        throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Missing arrow binding at ${irPath}.marks[${index}]`);
      const spec = emitMarkArrow(resolution, round, resolvePaint);
      spec.refX = resolution.geometry.tipX;
      primitives.push(buildMarkMarkerGroup(spec, sample, context));
    } else {
      const definition = markDefinitions.get(mark.name);
      if (definition === undefined)
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Missing mark '${mark.name}' at ${irPath}.marks[${index}]`,
        );
      let content: Array<ScenePrimitive>;
      try {
        content = Array.from(definition.emit(mark.params ?? {}, { stroke: context.contextStroke, round }));
      } catch (cause) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Mark '${mark.name}' failed at ${irPath}.marks[${index}]`,
          { cause },
        );
      }
      primitives.push(
        placeMarkPrimitives(
          materializeScenePrimitives(`Mark '${mark.name}' at ${irPath}.marks[${index}]`, content),
          sample,
          context,
          {
            resourceMap: new Map((resources?.() ?? []).map(resource => [resource.id, resource])),
            irPath: `${irPath}.marks[${index}]`,
          },
        ),
      );
    }
    boundsPoints.push(sample.point);
  }
  return { primitives, boundsPoints };
};

/** 提取存在的端点箭头字段 */
export const pathEndpointArrows = (
  arrows: PathEndpointArrows,
): { arrowStart?: ResolvedArrowEnd; arrowEnd?: ResolvedArrowEnd } => ({
  ...(arrows.arrowStart === undefined ? {} : { arrowStart: arrows.arrowStart }),
  ...(arrows.arrowEnd === undefined ? {} : { arrowEnd: arrows.arrowEnd }),
});
