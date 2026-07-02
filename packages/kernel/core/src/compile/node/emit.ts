import type { GroupPrim, ScenePrimitive } from '../../contract/scene';
import type { ResolvedShapeStyle } from '../../contract/shape';
import type { IRJsonObject } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { PaintResolver } from '../paint';
import type { NodeLayout } from './types';

import { toAlphabeticBaselineY } from '../text-baseline';
import { labelBorderPoint, labelBoxEdgeToward, labelCenter, resolveLabelRotateDeg } from './labels';
import { DEFAULT_LINE_HEIGHT_FACTOR } from './text';

/** 无参 / 合成 layout 的 shape params 兜底（避免每次调用重建空对象） */
const EMPTY_SHAPE_PARAMS: IRJsonObject = {};

/** 从 NodeLayout 收敛 emit 所需的视觉样式子集（ResolvedShapeStyle，不含几何 / 文本）；fill / stroke 经 resolvePaint 转 PaintValue */
const toShapeStyle = (layout: NodeLayout, resolvePaint: PaintResolver): ResolvedShapeStyle => ({
  fill: resolvePaint(layout.fill),
  fillOpacity: layout.fillOpacity,
  stroke: resolvePaint(layout.stroke) ?? 'currentColor',
  strokeOpacity: layout.strokeOpacity,
  strokeWidth: layout.strokeWidth,
  dashPattern: layout.dashPattern,
  cornerRadius: layout.cornerRadius,
  opacity: layout.opacity,
  shadow: layout.shadow,
  blendMode: layout.blendMode,
});

const cloneScenePrimitive = <T extends ScenePrimitive>(primitive: T): T => ({ ...primitive });

/**
 * NodeLayout → Scene primitives
 * @description shape 主体走 `shapeDef.emit`（收轴对齐 rect、可出多 primitive）；text 始终走 TextPrim；
 *   有旋转时外层 GroupPrim 用 `rotate(deg cx cy)` 统一包裹 shape + text（diamond 顶点 / text 都靠 group 旋转）
 */
export const emitNodePrimitives = (
  layout: NodeLayout,
  round: (n: number) => number,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  // shape 主体：emit 收**轴对齐 rect（rotate=0）**，rotate 由末端外层 GroupPrim 统一施加
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
    // 混排块：逐行按 align 求行起点 originX、按 baselineOffset 求基线 y，委托 laid.emit 产 TextPrim / glyph group
    const blockTop = layout.rect.y - layout.textHeight / 2;
    const halfBlockW = layout.textWidth / 2;
    for (const { laid, baselineOffset } of layout.inlineBlock.lines) {
      const originX =
        layout.align === 'start'
          ? layout.rect.x - halfBlockW
          : layout.align === 'end'
            ? layout.rect.x + halfBlockW - laid.width
            : layout.rect.x - laid.width / 2;
      inner.push(...laid.emit(originX, blockTop + baselineOffset, round));
    }
  } else if (layout.lines) {
    // align=start: x=中心-块半宽; align=end: x=中心+块半宽; align=middle: x=中心
    const halfBlockW = layout.textWidth / 2;
    const xOffset = layout.align === 'start' ? -halfBlockW : layout.align === 'end' ? halfBlockW : 0;
    const lineHeight = round(layout.lineHeight);
    inner.push({
      type: 'text',
      x: round(layout.rect.x + xOffset),
      y: round(toAlphabeticBaselineY(layout.rect.y, 'middle', layout.lines.length, lineHeight, layout.fontSize)),
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
  // 每个 label 一个 TextPrim，放在 inner 同组 → 跟 node 旋转一致；rotate 时再包一层绕 label 自身中心的 group
  if (layout.labels) {
    const cx = layout.rect.x;
    const cy = layout.rect.y;
    for (const lab of layout.labels) {
      const [lx, ly] = labelCenter(layout, lab);
      // pin：true 或样式对象都画引线；false / 缺省跳过。从 node 边界画到 label 框近 node 边（textPrim 前 push → 线在文字下层）
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
          opacity: lab.opacity ?? layout.opacity,
        });
      }
      let labelContent: ScenePrimitive;
      if (lab.laid) {
        // 混排 label：以 label 中心 (lx,ly) 横向居中、纵向居中放置 run 序列
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
        // 绕 label 自身中心自旋——位置仍由 position / distance 决定，rotate 只改朝向
        inner.push({
          type: 'group',
          transforms: [{ kind: 'rotate', degrees: round(deg), cx: round(lx), cy: round(ly) }],
          children: [labelContent],
        });
      }
    }
  }
  // 带文本（layout.lines 非空）或有旋转的 Node 包进单层 GroupPrim：给"语义化节点"一个稳定 DOM /
  // stacking 单位边界；纯几何装饰 Node 维持平铺、零额外 DOM 层。无旋转时 group 不带 transforms。
  const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined || layout.inlineBlock !== undefined;
  if (!needsGroup) {
    // 纯几何 Node（不包 group）：把 user id stamp 到每个平铺 shape 图元（多 shape emit 时共享同一 id）；
    // label / pin 等附属图元不 stamp。无 user id 时保持 undefined。
    if (layout.id !== undefined) {
      for (const prim of shapePrims) prim.id = layout.id;
    }
    // meta provenance 与 id 同款：原样复制到每个平铺 shape 图元（label / pin 不 stamp）
    if (layout.meta !== undefined) {
      for (const prim of shapePrims) prim.meta = layout.meta;
    }
    // animations 与 meta 同款：原样复制到每个平铺 shape 图元（transform/opacity 复制后视觉等价于动 group）
    if (layout.animations !== undefined) {
      for (const prim of shapePrims) prim.animations = layout.animations;
    }
    return inner;
  }
  // 带文本 / rotate Node：user id 落到单层 GroupPrim（top-level emit 图元），子图元不重复 stamp。
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
