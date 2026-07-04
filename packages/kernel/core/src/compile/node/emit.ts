import type { GroupPrim, ScenePrimitive } from '../../contract';
import type { ResolvedShapeStyle } from '../../contract';
import type { IRJsonObject } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { PaintResolver } from '../resource';
import type { NodeLayout } from './types';

import { toAlphabeticBaselineY } from '../text';
import { labelBorderPoint, labelBoxEdgeToward, labelCenter, resolveLabelRotateDeg } from './labels';
import { DEFAULT_LINE_HEIGHT_FACTOR } from './text';

/** 空 shape params。 */
const EMPTY_SHAPE_PARAMS: IRJsonObject = {};

/** 从 NodeLayout 收敛 shape emit 所需的视觉样式。 */
const toShapeStyle = (layout: NodeLayout, resolvePaint: PaintResolver): ResolvedShapeStyle => ({
  fill: resolvePaint(layout.fill),
  fillOpacity: layout.fillOpacity,
  stroke: resolvePaint(layout.stroke) ?? 'currentColor',
  strokeOpacity: layout.strokeOpacity,
  strokeWidth: layout.strokeWidth,
  dashPattern: layout.dashPattern,
  dashOffset: layout.dashOffset,
  cornerRadius: layout.cornerRadius,
  opacity: layout.opacity,
  shadow: layout.shadow,
  blendMode: layout.blendMode,
});

const cloneScenePrimitive = <T extends ScenePrimitive>(primitive: T): T => ({ ...primitive });

/**
 * NodeLayout → Scene primitives
 * @description shape 主体走 `shapeDef.emit`；文本和 label 追加为附属 primitive。
 */
export const emitNodePrimitives = (
  layout: NodeLayout,
  round: (n: number) => number,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  // shape 主体按轴对齐 rect emit。
  const axisAlignedRect: Rect = { ...layout.rect, rotate: 0 };
  const shapePrims: Array<ScenePrimitive> = [
    ...layout.shapeDef.emit(
      axisAlignedRect,
      toShapeStyle(layout, resolvePaint),
      round,
      layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    ),
  ].map(cloneScenePrimitive);
  const inner: Array<ScenePrimitive> = [...shapePrims];
  if (layout.inlineBlock) {
    // 混排块逐行 emit。
    const blockTop = layout.contentCenter[1] - layout.textHeight / 2;
    const halfBlockW = layout.textWidth / 2;
    for (const { laid, baselineOffset } of layout.inlineBlock.lines) {
      const originX =
        layout.align === 'start'
          ? layout.contentCenter[0] - halfBlockW
          : layout.align === 'end'
            ? layout.contentCenter[0] + halfBlockW - laid.width
            : layout.contentCenter[0] - laid.width / 2;
      inner.push(...laid.emit(originX, blockTop + baselineOffset, round));
    }
  } else if (layout.lines) {
    // 对齐换算：start 取块左侧，end 取块右侧，middle 取块中心。
    const halfBlockW = layout.textWidth / 2;
    const xOffset = layout.align === 'start' ? -halfBlockW : layout.align === 'end' ? halfBlockW : 0;
    const lineHeight = round(layout.lineHeight);
    inner.push({
      type: 'text',
      x: round(layout.contentCenter[0] + xOffset),
      y: round(toAlphabeticBaselineY(layout.contentCenter[1], 'middle', layout.lines.length, lineHeight, layout.fontSize)),
      lines: layout.lines,
      fontSize: layout.fontSize,
      fontFamily: layout.fontFamily,
      fontWeight: layout.fontWeight,
      fontStyle: layout.fontStyle,
      align: layout.align,
      baseline: 'alphabetic',
      lineHeight,
      fill: layout.textColor ?? 'currentColor',
      opacity: layout.opacity,
      measuredWidth: round(layout.textWidth),
      measuredHeight: round(layout.textHeight),
    });
  }
  // 每个 label 一个附属 primitive。
  if (layout.labels) {
    const cx = layout.rect.x;
    const cy = layout.rect.y;
    for (const lab of layout.labels) {
      const [lx, ly] = labelCenter(layout, lab);
      // pin 引线放在 label 内容下层。
      if (lab.pin) {
        const style = typeof lab.pin === 'object' ? lab.pin : undefined;
        const [bx, by] = labelBorderPoint(layout, lab);
        const pad = 2;
        const [nx, ny] = labelBoxEdgeToward([lx, ly], [bx, by], lab.measuredWidth / 2 + pad, lab.fontSize / 2 + pad);
        inner.push({
          type: 'path',
          commands: [
            { kind: 'move', to: [round(bx), round(by)] },
            { kind: 'line', to: [round(nx), round(ny)] },
          ],
          stroke: style?.stroke ?? lab.textColor ?? 'currentColor',
          strokeWidth: style?.strokeWidth ?? 1,
          dashPattern: style?.dashPattern,
          dashOffset: style?.dashOffset,
          opacity: lab.opacity ?? layout.opacity,
        });
      }
      let labelContent: ScenePrimitive;
      if (lab.laid) {
        // 混排 label 按中心放置。
        const laid = lab.laid;
        const originX = lx - laid.width / 2;
        const baselineY = ly + (laid.ascent - laid.descent) / 2;
        labelContent = { type: 'group', children: laid.emit(originX, baselineY, round) };
      } else {
        const labLineHeight = round(lab.fontSize * DEFAULT_LINE_HEIGHT_FACTOR);
        labelContent = {
          type: 'text',
          x: round(lx),
          y: round(toAlphabeticBaselineY(ly, 'middle', 1, labLineHeight, lab.fontSize)),
          lines: [{ text: lab.text }],
          fontSize: lab.fontSize,
          fontFamily: lab.fontFamily,
          fontWeight: lab.fontWeight,
          fontStyle: lab.fontStyle,
          align: 'middle',
          baseline: 'alphabetic',
          lineHeight: labLineHeight,
          fill: lab.textColor ?? 'currentColor',
          opacity: lab.opacity ?? layout.opacity,
          measuredWidth: round(lab.measuredWidth),
          measuredHeight: round(lab.fontSize),
        };
      }
      const deg = resolveLabelRotateDeg(lab, lx, ly, cx, cy);
      if (deg === 0) {
        inner.push(labelContent);
      } else {
        // 绕 label 自身中心自旋。
        inner.push({
          type: 'group',
          transforms: [{ kind: 'rotate', degrees: round(deg), cx: round(lx), cy: round(ly) }],
          children: [labelContent],
        });
      }
    }
  }
  // 带文本或旋转的 Node 包进单层 GroupPrim。
  const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined || layout.inlineBlock !== undefined;
  if (!needsGroup) {
    // 纯几何 Node 不包 group，id stamp 到 shape 图元。
    if (layout.id !== undefined) {
      for (const prim of shapePrims) prim.id = layout.id;
    }
    // meta stamp 到 shape 图元。
    if (layout.meta !== undefined) {
      for (const prim of shapePrims) prim.meta = layout.meta;
    }
    // animations stamp 到 shape 图元。
    if (layout.animations !== undefined) {
      for (const prim of shapePrims) prim.animations = layout.animations;
    }
    return inner;
  }
  // 带文本或旋转时，id / meta / animations 落到外层 group。
  const group: GroupPrim = { type: 'group', children: inner };
  if (layout.id !== undefined) group.id = layout.id;
  if (layout.meta !== undefined) group.meta = layout.meta;
  if (layout.animations !== undefined) group.animations = layout.animations;
  if (layout.rotateDeg !== 0) {
    group.transforms = [
      {
        kind: 'rotate',
        degrees: round(layout.rotateDeg),
        cx: round(layout.rect.x),
        cy: round(layout.rect.y),
      },
    ];
  }
  return [group];
};
