import { type IRChild, type IRNode, type IRNodeDefault, type IRNodeLabel, type IRScope } from '@retikz/core';

import type { ExternalRow, Mark, PointMark } from '../../../schemas';
import type { MarkPaint } from '../shared';

import {
  type CoordinateFrame,
  type FieldCollector,
  type MarkChannels,
  type MarkDefinition,
  type MarkLoweringContext,
} from '../../../contract';
import { PlotMark } from '../../../schemas';
import {
  attachDatumAnchor,
  attachDatumLabel,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectCommonEncodingFields,
  collectNodeChannelFields,
  colorGroupedScope,
  decorateDatum,
  DEFAULT_FILL,
  nodeChannelKinds,
  roleAnchor,
  roleValues,
} from '../shared';

/** 散点 glyph 默认直径（user units，已补偿 circle 外接）。 */
const POINT_SIZE = 10;

/** 散点 node 样式（circle + padding0 + minimumSize；÷√2 补 circle 外接，使 POINT_SIZE 即真实直径）。 */
const pointStyle = (fill: MarkPaint, mark: PointMark): IRNodeDefault => {
  const padding = mark.padding?.kind === 'constant' ? mark.padding.value : undefined;
  const minimumSize = mark.minimumSize?.kind === 'constant' ? mark.minimumSize.value : undefined;
  const stroke = mark.stroke?.kind === 'constant' ? mark.stroke.value : undefined;
  const strokeWidth = mark.strokeWidth?.kind === 'constant' ? mark.strokeWidth.value : undefined;
  const fillOpacity = mark.fillOpacity?.kind === 'constant' ? mark.fillOpacity.value : undefined;
  const strokeOpacity = mark.strokeOpacity?.kind === 'constant' ? mark.strokeOpacity.value : undefined;
  const opacity = mark.opacity?.kind === 'constant' ? mark.opacity.value : undefined;
  const rotate = mark.rotate?.kind === 'constant' ? mark.rotate.value : undefined;
  return {
    shape: 'circle',
    padding: padding ?? 0,
    minimumSize: minimumSize ?? POINT_SIZE / Math.SQRT2,
    ...(typeof fill === 'string' ? { color: fill } : {}),
    fill,
    ...(stroke !== undefined ? { stroke } : {}),
    ...(strokeWidth !== undefined ? { strokeWidth } : {}),
    ...(fillOpacity !== undefined ? { fillOpacity } : {}),
    ...(strokeOpacity !== undefined ? { strokeOpacity } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
  };
};

/** 自由文本 node 样式（无 shape 边框：padding0 + 无描边 + textColor 上提到子 Scope；色走文本而非 fill）。 */
const textStyle = (textColor: string, mark: PointMark): IRNodeDefault => {
  const padding = mark.padding?.kind === 'constant' ? mark.padding.value : undefined;
  const opacity = mark.opacity?.kind === 'constant' ? mark.opacity.value : undefined;
  const rotate = mark.rotate?.kind === 'constant' ? mark.rotate.value : undefined;
  return {
    padding: padding ?? 0,
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    color: textColor,
    textColor,
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
  };
};

/**
 * point mark：每行一个 circle glyph 或无边框文本 Node（坐标系无关，经 frame.projectRoles 投影；吸收旧 text mark）。
 * @description encoding.text 设 → 无边框带 text 的 Node（内容走 labelOf、缺失跳过、dx/dy 微调），样式走 textStyle（textColor）；
 *   否则 → circle glyph（size / opacity / shape 通道 per-datum、datum label 经 attachDatumLabel），样式走 pointStyle（fill）。
 */
export const lowerPoint = (
  mark: Mark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  if (mark.type !== PlotMark.Point) return null;
  const markProvenance = ctx?.provenance;
  const colorOf = channelValueOf<string>(channels, 'color');
  const fillOf = mark.fill?.kind === 'field' && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = mark.stroke?.kind === 'field' ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  const defaultColor = channelDefaultOf<string>(channels, 'color') ?? DEFAULT_FILL;
  const isText = mark.encoding.text !== undefined;
  const textOf = isText ? channelValueOf<NonNullable<IRNode['text']>>(channels, 'label') : undefined;
  const labelOf = !isText ? channelValueOf<IRNodeLabel['text']>(channels, 'label') : undefined;
  const textColorConstant = mark.textColor?.kind === 'constant' ? mark.textColor.value : undefined;
  const dx = mark.dx ?? 0;
  const dy = mark.dy ?? 0;
  const constantZIndex = mark.zIndex?.kind === 'constant' ? mark.zIndex.value : undefined;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const applyChannelDeliveries = (node: IRNode, nodeKind: 'pointGlyph' | 'pointText'): void => {
      if (constantZIndex !== undefined) node.zIndex = constantZIndex;
      for (const entry of channels.nodeDeliveries ?? []) {
        const value = entry.resolver(row);
        if (value !== undefined) entry.deliver(node, value, { mark, row, nodeKind });
      }
    };
    if (isText) {
      // 文本 glyph：投影同 point（roleValues + projectRoles，坐标系无关）；内容缺失跳过；dx/dy 锚点像素微调
      const point = frame.projectRoles(roleValues(mark, row, frame));
      if (!point) continue;
      const text = textOf?.(row);
      if (text === undefined) continue;
      const position: [number, number] = dx === 0 && dy === 0 ? point : [point[0] + dx, point[1] + dy];
      const base: IRNode = { type: 'node', position, text };
      applyChannelDeliveries(base, 'pointText');
      placed.push({
        color: colorOf?.(row),
        node: attachDatumAnchor(
          decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined),
          mark,
          row,
          transformedIndex,
          ctx,
        ),
      });
      continue;
    }
    // 散点 glyph：锚点与 locator 共享同一 role 投影（point → frame.projectRoles），杜绝两套投影漂移
    const point = roleAnchor(mark, row, frame);
    if (!point) continue;
    const base: IRNode = { type: 'node', position: point };
    const fill = fillOf?.(row);
    if (fill !== undefined) base.fill = fill;
    const stroke = strokeOf?.(row);
    if (stroke !== undefined) base.stroke = stroke;
    applyChannelDeliveries(base, 'pointGlyph');
    const node = attachDatumLabel(
      attachDatumAnchor(
        decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined),
        mark,
        row,
        transformedIndex,
        ctx,
      ),
      mark,
      row,
      labelOf,
    );
    placed.push({ color: colorOf?.(row), node });
  }
  if (placed.length === 0) return null;
  const fillConstant =
    channelDefaultOf<MarkPaint>(channels, 'fill') ?? (mark.fill?.kind === 'constant' ? mark.fill.value : undefined);
  const layer: IRScope = !colorOf
    ? {
        type: 'scope',
        nodeDefault: isText
          ? textStyle(textColorConstant ?? (typeof fillConstant === 'string' ? fillConstant : defaultColor), mark)
          : pointStyle(fillConstant ?? defaultColor, mark),
        children: placed.map(p => p.node),
      }
    : colorGroupedScope(placed, fill => (isText ? textStyle(textColorConstant ?? fill, mark) : pointStyle(fill, mark)));
  return attachMarkLayer(layer, mark, markProvenance);
};

/** 收集 point mark 独有的 mark-level 通道字段。 */
const collectPointChannelFields = (mark: PointMark, fields: FieldCollector): void => {
  fields.addChannel(mark.color);
  fields.addChannel(mark.fill);
  fields.addChannel(mark.stroke);
  fields.addChannel(mark.encoding.text);
};

export const pointMarkDefinition: MarkDefinition<PointMark> = {
  type: PlotMark.Point,
  channelKinds: nodeChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectPointChannelFields(mark, fields);
  },
  lower: lowerPoint,
};
