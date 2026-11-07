import type { WithRequiredProperties } from '@retikz/foundation';
import { DEG_TO_RAD } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNode } from '../../resolve';
import type { IRPosition } from '../../schemas';
import type { CompiledBoundaryGeometry } from '../boundary';
import { evaluatePosition } from '../reference';
import { measureNodeLabel, placeNodeLabel } from './label';
import { measureNodeBody } from './measure';
import { placeNode } from './placement';
import type {
  CompiledNode,
  CompiledNodeLayout,
  NodeCompileContext,
  NodeLayoutGeometry,
  PreparedNodeLayout,
} from './types';

/** 按需组合当前能力绑定与布局几何，供统一边界查询和坐标投影消费，不复制几何或修改编译产物 */
export const projectNodeGeometry = (
  compiled: Pick<CompiledNode, 'shape' | 'boundary' | 'layout'>,
): CompiledBoundaryGeometry & { geometry: NodeLayoutGeometry } => ({
  shape: compiled.shape,
  boundary: compiled.boundary,
  geometry: compiled.layout.overall.geometry,
});

/** 消费有效阶段产物并补齐布局，不判断跨次有效性或保存执行状态 */
export const layoutNode = (
  canon: CanonicalNode,
  context: Omit<NodeCompileContext, 'round' | 'registerPaint'>,
  prepared?: PreparedNodeLayout,
): WithRequiredProperties<PreparedNodeLayout, 'overall'> => {
  if (prepared?.overall !== undefined) {
    return { ...prepared, overall: prepared.overall };
  }

  const { shape, boundary } = canon;
  const { positionContext } = context;
  const measured = measureNodeBody(canon, context, prepared);
  const { content: contentLayout } = measured;
  const { size, offset } = measured.shape;
  const { margin, padding } = canon.layout;
  const paddingOffsetX = (padding.right - padding.left) / 2;
  const paddingOffsetY = (padding.bottom - padding.top) / 2;
  const { textWidth, textHeight, textBaselineOffsets, lines, inlineBlock } = contentLayout;
  const lineHeight = canon.text?.lineHeight ?? 0;
  const align = canon.text?.textAlign ?? 'middle';
  const rotateDeg = canon.layout.rotate;

  const { position } = canon.layout;
  const anchorPosition = !Array.isArray(position) && 'kind' in position;
  // 锚点定位的标签仍在初始主体上采样，最后随主体一起平移
  const initialPlacement = anchorPosition ? undefined : prepared?.placement;
  const center: IRPosition | null =
    anchorPosition || initialPlacement !== undefined
      ? [0, 0]
      : (evaluatePosition(position, positionContext)?.localPoint ?? null);

  if (!center) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve position for node ${canon.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }

  // shape 可声明 AABB 中心相对 position 的偏移。
  const aabbOffset = offset;
  const rectCenterX = initialPlacement?.rect.x ?? center[0] + paddingOffsetX + (aabbOffset?.[0] ?? 0);
  const rectCenterY = initialPlacement?.rect.y ?? center[1] + paddingOffsetY + (aabbOffset?.[1] ?? 0);
  const contentCenter: [number, number] = initialPlacement?.contentCenter ?? [
    rectCenterX - paddingOffsetX,
    rectCenterY - paddingOffsetY,
  ];
  const measuredLabels = canon.labels.map(
    (label, index) => prepared?.labels?.[index]?.measurement ?? measureNodeLabel(label, context),
  );

  const provisional: CompiledNodeLayout = {
    geometry: {
      rect: {
        // x, y 是外接 AABB 几何中心。
        x: rectCenterX,
        y: rectCenterY,
        width: size.width,
        height: size.height,
        // geometry 用弧度。
        rotate: rotateDeg * DEG_TO_RAD,
      },
      contentCenter,
      margin,
      contentSize: { width: textWidth, height: textHeight },
    },
    text:
      inlineBlock !== undefined
        ? {
            kind: 'inline',
            lines: inlineBlock.lines,
            align,
            lineHeight,
            baselineOffsets: textBaselineOffsets,
            font: canon.text!.font,
          }
        : lines === undefined
          ? undefined
          : {
              kind: 'plain',
              lines,
              align,
              lineHeight,
              baselineOffsets: textBaselineOffsets,
              font: canon.text!.font,
            },
  };
  const labels = measuredLabels.map((measurement, index) => ({
    measurement,
    placement:
      prepared?.labels?.[index]?.placement ??
      placeNodeLabel({ shape, boundary, geometry: provisional.geometry }, measurement, canon.labels[index]),
  }));
  const placement = prepared?.placement ?? placeNode(canon, provisional, context);
  return {
    content: measured.content,
    shape: measured.shape,
    placement,
    labels,
    overall: {
      ...provisional,
      geometry: { ...provisional.geometry, ...placement },
      labels: labels.length === 0 ? undefined : labels.map(label => ({ ...label.measurement, ...label.placement })),
    },
  };
};
