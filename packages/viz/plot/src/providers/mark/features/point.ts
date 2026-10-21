import type { IRAxisScale, IRBoxSize, IRChild, IRNode, IRNodeDefault, IRNodeLabel, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import type {
  CoordinateFrame,
  FieldCollector,
  MarkChannels,
  MarkDefinition,
  MarkLoweringContext,
} from '../../../contract';
import { markProperty, unencodedMarkProperties } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import { PointAnnotationSchema } from '../../../schemas';
import type { IRPlotMark, IRPlotPointMark } from '../../../schemas';
import { BuiltinPlotMark, PointMarkSchema } from '../../../schemas';
import type { MarkPaint } from '../shared';
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
  mapMarkRoles,
  roleValue,
} from '../shared';
import { lowerAnnotation } from './annotation';
import { pointGlyphStyle } from './point-glyph';
import { POINT_DEFAULT_RADIUS } from './point-glyph';

/** 自由文本 node 样式（无 shape 边框：padding0 + 无描边 + textColor 上提到子 Scope；色走文本而非 fill） */
const textStyle = (textColor: string, mark: IRPlotPointMark): IRNodeDefault => {
  const padding = markProperty<NonNullable<IRNodeDefault['layout']>['padding']>(mark, 'padding');
  const opacity = Object.fromEntries(
    (['opacity', 'fillOpacity', 'strokeOpacity'] as const).flatMap((target, index) => {
      const value = markProperty<number>(mark, target);
      return value === undefined ? [] : [[['overall', 'fill', 'stroke'][index], value]];
    }),
  );
  const rotate = markProperty<number>(mark, 'rotate');

  return {
    ...(rotate !== undefined ? { rotate } : {}),
    style: {
      fill: 'none',
      stroke: 'none',
      strokeWidth: 0,
      color: textColor,
      textColor,
      ...(Object.keys(opacity).length === 0 ? {} : { opacity }),
    },
    layout: {
      padding: padding ?? 0,
    },
  };
};

/**
 * point mark：每行一个 circle glyph 或无边框文本 Node（坐标系无关，经 frame.projectRoles 投影；吸收旧 text mark）
 * @description encoding.text 设 → 无边框带 text 的 Node（内容走 labelOf、缺失跳过、dx/dy 微调），样式走 textStyle（textColor）；
 *   否则 → circle glyph（size / opacity / shape 通道 per-datum、datum label 经 attachDatumLabel），样式走 pointStyle（fill）
 */
export const lowerPoint = (
  mark: IRPlotMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  if (mark.type !== BuiltinPlotMark.Point) return null;

  const markProvenance = ctx?.provenance;
  const orientation = mark.properties?.orientation;
  if (orientation?.kind === 'coordinate') {
    if (!frame.roles.includes(orientation.role)) {
      throw new RetikzPlotError(
        `PointMark orientation role "${orientation.role}" is not supported by coordinate "${frame.type}"`,
      );
    }
    if (!frame.tangentAt || !frame.mapRoles || !frame.projectMappedRoles) {
      throw new RetikzPlotError(
        `PointMark orientation role "${orientation.role}" requires tangentAt and mapped-role projection on coordinate "${frame.type}"`,
      );
    }
  }
  const colorOf = channelValueOf<string>(channels, 'color');
  const fillOf =
    mark.encodings?.fill !== undefined && !colorOf ? channelValueOf<MarkPaint>(channels, 'fill') : undefined;
  const strokeOf = mark.encodings?.stroke !== undefined ? channelValueOf<MarkPaint>(channels, 'stroke') : undefined;
  const defaultColor = channelDefaultOf<string>(channels, 'color') ?? DEFAULT_FILL;
  const isText = mark.encodings?.text !== undefined || mark.properties?.text !== undefined;
  const textOf = isText ? channelValueOf<NonNullable<IRNode['text']>>(channels, 'label') : undefined;
  const labelOf = !isText ? channelValueOf<IRNodeLabel['text']>(channels, 'label') : undefined;
  const textColorConstant = markProperty<string>(mark, 'textColor');
  const dx = mark.properties?.dx ?? 0;
  const dy = mark.properties?.dy ?? 0;
  const constantZIndex = markProperty<number>(mark, 'zIndex');
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];

  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const resolveChannelDeliveries = () =>
      (channels.nodeDeliveries ?? []).map(entry => ({ entry, value: entry.resolver(row) }));

    const applyChannelDeliveries = (
      node: IRNode,
      nodeKind: 'pointGlyph' | 'pointText',
      deliveries: ReturnType<typeof resolveChannelDeliveries>,
    ): void => {
      if (constantZIndex !== undefined) node.zIndex = constantZIndex;

      for (const { entry, value } of deliveries) {
        if (value !== undefined) entry.deliver(node, value, { mark, row, nodeKind });
      }
      if (orientation?.kind === 'coordinate') {
        const key = String(transformedIndex);
        const mapped = ctx?.positions
          ? ctx.positions.targetFor(key)?.mappedRoles
          : mapMarkRoles(mark, roleValues(mark, row, frame), frame);
        let tangent;
        try {
          tangent = mapped ? frame.tangentAt?.(orientation.role, mapped) : null;
        } catch (cause) {
          throw new RetikzPlotError(`PointMark orientation role "${orientation.role}" failed for target "${key}"`, {
            cause,
          });
        }
        if (!tangent || !tangent.every(Number.isFinite) || Math.hypot(tangent[0], tangent[1]) === 0) {
          throw new RetikzPlotError(
            `PointMark orientation role "${orientation.role}" is undefined for target "${key}"`,
          );
        }
        const offset = node.rotate ?? markProperty<number>(mark, 'rotate') ?? 0;
        node.rotate =
          (Math.atan2(tangent[1], tangent[0]) * 180) / Math.PI + (orientation.align === 'normal' ? 90 : 0) + offset;
      }
    };

    if (isText) {
      // 文本 glyph：投影同 point（roleValues + projectRoles，坐标系无关）；内容缺失跳过；dx/dy 锚点像素微调
      const point = ctx?.positions ? ctx.positions.positionFor(String(transformedIndex)) : roleAnchor(mark, row, frame);
      if (!point) continue;

      const text = textOf?.(row);
      if (text === undefined) continue;

      const deliveries = resolveChannelDeliveries();
      const position: [number, number] = dx === 0 && dy === 0 ? point : [point[0] + dx, point[1] + dy];
      const base: IRNode = { type: 'node', position, text };
      applyChannelDeliveries(base, 'pointText', deliveries);
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
    const point = ctx?.positions ? ctx.positions.positionFor(String(transformedIndex)) : roleAnchor(mark, row, frame);
    if (!point) continue;

    const deliveries = resolveChannelDeliveries();
    if (deliveries.some(({ entry, value }) => entry.channel === 'size' && value === undefined)) continue;

    const base: IRNode = { type: 'node', position: point };
    const fill = fillOf?.(row);
    if (fill !== undefined) base.style = { ...base.style, fill };
    const stroke = strokeOf?.(row);
    if (stroke !== undefined) base.style = { ...base.style, stroke };
    applyChannelDeliveries(base, 'pointGlyph', deliveries);
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

  const fillConstant = channelDefaultOf<MarkPaint>(channels, 'fill') ?? markProperty<MarkPaint>(mark, 'fill');
  const layer: IRScope = !colorOf
    ? {
        type: 'scope',
        children: placed.map(p => p.node),
        defaults: {
          node: isText
            ? textStyle(textColorConstant ?? (typeof fillConstant === 'string' ? fillConstant : defaultColor), mark)
            : pointGlyphStyle(fillConstant ?? defaultColor, unencodedMarkProperties(mark) ?? {}),
        },
      }
    : colorGroupedScope(placed, fill =>
        isText
          ? textStyle(textColorConstant ?? fill, mark)
          : pointGlyphStyle(fillConstant ?? fill, unencodedMarkProperties(mark) ?? {}),
      );

  return attachMarkLayer(layer, mark, ctx);
};

/** 收集 point mark 独有的 mark-level 通道字段 */
const collectPointChannelFields = (mark: IRPlotPointMark, fields: FieldCollector): void => {
  fields.addChannel(mark.encodings?.color);
  fields.addChannel(mark.encodings?.fill);
  fields.addChannel(mark.encodings?.stroke);
  fields.addChannel(mark.encodings?.text);
};

/** Core minimumSize 在任意法向上的保守半径；旋转不会扩大其外接圆 */
const minimumSizeRadiusOf = (minimumSize: number | IRBoxSize): number => {
  if (typeof minimumSize === 'number') return minimumSize / Math.SQRT2;
  const fallback = minimumSize.default ?? 0;
  return Math.hypot(minimumSize.width ?? fallback, minimumSize.height ?? fallback) / 2;
};

/** Core axis scale 在任意法向上的保守放大倍数 */
const maximumScaleOf = (scale: number | IRAxisScale | undefined): number => {
  if (scale === undefined) return 1;
  if (typeof scale === 'number') return Math.abs(scale);

  const fallback = scale.default ?? 1;

  return Math.max(Math.abs(scale.x ?? fallback), Math.abs(scale.y ?? fallback));
};

/** 内置 point mark definition */
export const pointMarkDefinition: MarkDefinition<IRPlotPointMark> = {
  schema: PointMarkSchema,
  annotation: { schema: PointAnnotationSchema, lower: lowerAnnotation },
  domainPadding: (mark, rows, roles, channels) => {
    if (mark.encodings?.text !== undefined || mark.properties?.text !== undefined)
      throw new RetikzPlotError('Text points do not provide size-only domain padding');

    const size = channels.nodeDeliveries?.find(delivery => delivery.channel === 'size');

    return rows.flatMap((row, index) => {
      const radius =
        size === undefined
          ? (mark.properties?.size ?? POINT_DEFAULT_RADIUS)
          : (size.resolver(row) as number | undefined);
      if (radius === undefined) return [];

      return [
        {
          key: String(index),
          values: roles.map(role => roleValue(mark, role, row)),
          extent: roles.map(() => radius),
        },
      ];
    });
  },
  channelKinds: nodeChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectNodeChannelFields(mark, fields);
    collectPointChannelFields(mark, fields);
  },
  placement: {
    targets: (mark, rows, frame) =>
      rows.map((row, index) => ({ key: String(index), row, roleValues: roleValues(mark, row, frame) })),
    normalExtent: (mark, target, _unitNormal, channels) => {
      if (mark.encodings?.text !== undefined || mark.properties?.text !== undefined) return undefined;

      const sizeDelivery = channels.nodeDeliveries?.find(delivery => delivery.channel === 'size');
      const minimumSizeDelivery = channels.nodeDeliveries?.find(delivery => delivery.channel === 'minimumSize');
      const scaleDelivery = channels.nodeDeliveries?.find(delivery => delivery.channel === 'scale');
      const strokeDelivery = channels.nodeDeliveries?.find(delivery => delivery.channel === 'strokeWidth');
      const size = (sizeDelivery?.resolver(target.row) as number | undefined) ?? markProperty<number>(mark, 'size');
      const minimumSize =
        (minimumSizeDelivery?.resolver(target.row) as number | IRBoxSize | undefined) ??
        markProperty<number | IRBoxSize>(mark, 'minimumSize');
      const radius = size ?? (minimumSize === undefined ? POINT_DEFAULT_RADIUS : minimumSizeRadiusOf(minimumSize));
      const scale =
        (scaleDelivery?.resolver(target.row) as number | IRAxisScale | undefined) ??
        markProperty<number | IRAxisScale>(mark, 'scale');
      const strokeWidth =
        (strokeDelivery?.resolver(target.row) as number | undefined) ?? markProperty<number>(mark, 'strokeWidth') ?? 0;

      return radius * maximumScaleOf(scale) + strokeWidth / 2;
    },
  },
  lower: lowerPoint,
};
