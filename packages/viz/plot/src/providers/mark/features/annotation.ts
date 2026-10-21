import type { IRNode, IRPath, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { Position } from '@retikz/math';

import type { CoordinateFrame, MarkAnnotationCapability } from '../../../contract';
import { annotationPositionsOf, unencodedMarkProperties } from '../../../contract';
import type { AnnotationPositionSources } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import { cellGeometryNode } from '../private/cell';
import { annotationValue, decorateDatum, attachMarkLayer, DEFAULT_FILL, LINE_STROKE_WIDTH } from '../shared';
import {
  pointsToSteps,
  channelValueOf,
  channelDefaultOf,
  applyNodeChannelDeliveries,
  applyPathChannelDeliveries,
  resolveNodeMarkLabels,
  resolveGeometryMarkLabels,
} from '../shared';
import { pointGlyphStyle, POINT_DEFAULT_RADIUS } from './point-glyph';

/** 组装宿主时仅写入有值的可选字段，保持产物可 JSON 序列化 */
const definedProperties = <T extends object>(source: T): T =>
  Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined)) as T;

/** 将显式角色值映射到坐标参数空间，edge 使用最终角色范围 */
const mappedPosition = (
  source: AnnotationPositionSources,
  frame: CoordinateFrame,
  row?: ExternalRow,
): Array<number> => {
  for (const role of new Set([...Object.keys(source.properties), ...Object.keys(source.encodings)])) {
    if (!frame.roles.includes(role)) throw new RetikzPlotError(`Annotation position has unknown role "${role}"`);
  }
  return frame.roles.map(role => {
    const value = source.properties[role];
    const field = source.encodings[role];
    const scale = frame.roleScales?.[role];
    if ((value === undefined && field === undefined) || scale === undefined)
      throw new RetikzPlotError(`Annotation position requires role "${role}" and its scale`);
    const mapped =
      field === undefined && typeof value === 'object' && 'edge' in value
        ? scale.range()[value.edge === 'start' ? 0 : 1]
        : scale.coordinate(annotationValue(value, field, row));
    if (!Number.isFinite(mapped)) throw new RetikzPlotError(`Annotation position cannot map role "${role}"`);
    return mapped;
  });
};

/** 投影显式坐标参数，拒绝无效或不支持的投影 */
const projectPosition = (mapped: Array<number>, frame: CoordinateFrame): Position => {
  const point = frame.projectMappedRoles?.(mapped);
  if (!point || !point.every(Number.isFinite))
    throw new RetikzPlotError(`Annotation requires a valid mapped-role projection on coordinate "${frame.type}"`);
  return point;
};

/** 三种独立几何通过既有坐标能力生成 Kernel 宿主 */
export const lowerAnnotation: MarkAnnotationCapability['lower'] = (mark, frame, channels, context, datum) => {
  const id = mark.id;
  const row = datum?.row ?? {};
  const positions = annotationPositionsOf(mark);
  const fill =
    channelValueOf<string>(channels, 'color')?.(row) ?? channelDefaultOf<string>(channels, 'color') ?? DEFAULT_FILL;
  let child: IRNode | IRPath;
  if (mark.type === 'point') {
    const {
      position: _position,
      displayFormat: _displayFormat,
      text: _text,
      shape,
      size,
      dx = 0,
      dy = 0,
      orientation: _orientation,
      rotate,
      scale,
      boundary,
      cornerRadius,
      label: _label,
      zIndex,
      width,
      minimumSize,
      padding,
      margin,
      align,
      lineHeight,
      maxTextWidth,
      ...style
    } = unencodedMarkProperties(mark) ?? {};
    const mapped = mappedPosition(positions[0], frame, row);
    const text =
      channelValueOf<NonNullable<IRNode['text']>>(channels, 'label')?.(row) ??
      (mark.encodings?.text === undefined ? _text : undefined);
    const label = resolveNodeMarkLabels(_label, row, undefined, mark.encodings?.label);
    const projected = projectPosition(mapped, frame);
    const defaults = pointGlyphStyle(fill, {});
    const node: IRNode = {
      type: 'node',
      id,
      position: [projected[0] + dx, projected[1] + dy],
      text,
      shape: shape ?? (text === undefined ? defaults.shape : undefined),
      rotate,
      scale,
      boundary,
      cornerRadius,
      label,
      zIndex,
      style: {
        ...(text === undefined ? defaults.style : { fill: 'none', stroke: 'none', strokeWidth: 0, textColor: fill }),
        ...style,
      },
      layout: {
        ...defaults.layout,
        width,
        padding: padding ?? 0,
        margin,
        align,
        lineHeight,
        maxTextWidth,
        minimumSize:
          text === undefined ? (minimumSize ?? ((size ?? POINT_DEFAULT_RADIUS) * 2) / Math.SQRT2) : minimumSize,
      },
    };
    node.style = definedProperties(node.style!);
    node.layout = definedProperties(node.layout!);
    child = definedProperties(node);
  } else if (mark.type === 'path') {
    const {
      from: _from,
      to: _to,
      connection,
      rotate,
      scale,
      roundedCorners,
      label: _label,
      marks,
      zIndex,
      ...style
    } = unencodedMarkProperties(mark) ?? {};
    const label = resolveGeometryMarkLabels(_label, row, undefined, mark.encodings?.label);
    const start = mappedPosition(positions[0], frame, row);
    const end = mappedPosition(positions[1], frame, row);
    if (connection !== 'straight' && !frame.projectSegment)
      throw new RetikzPlotError(
        `Annotation coordinate connection requires projectSegment on coordinate "${frame.type}"`,
      );
    const points =
      connection === 'straight'
        ? [projectPosition(start, frame), projectPosition(end, frame)]
        : frame.projectSegment!(start, end);
    if (!points || points.length < 2 || points.some(point => !point.every(Number.isFinite)))
      throw new RetikzPlotError(
        `Annotation coordinate connection cannot project segment on coordinate "${frame.type}"`,
      );
    child = {
      type: 'path',
      id,
      rotate,
      scale,
      roundedCorners,
      label,
      marks,
      zIndex,
      style: { stroke: fill, strokeWidth: LINE_STROKE_WIDTH, ...style },
      children: pointsToSteps(points, false) ?? [],
    };
  } else {
    const {
      bounds: _bounds,
      connection,
      rotate,
      scale,
      boundary,
      cornerRadius,
      label: _label,
      zIndex,
      ...style
    } = unencodedMarkProperties(mark) ?? {};
    const from = mappedPosition(positions[0], frame, row);
    const to = mappedPosition(positions[1], frame, row);
    const label = resolveNodeMarkLabels(_label, row, undefined, mark.encodings?.label);
    if (!frame.projectCell)
      throw new RetikzPlotError(`Annotation interval requires projectCell on coordinate "${frame.type}"`);
    const cell = {
      intervals: Object.fromEntries(
        frame.roles.map((role, index) => [role, [from[index], to[index]] as [number, number]]),
      ),
    };
    const projected = frame.projectCell(cell, { connection });
    const node = cellGeometryNode(projected);
    if (!node) throw new RetikzPlotError('Annotation interval cannot produce a valid region');
    child = {
      ...node,
      id,
      rotate,
      scale,
      boundary,
      cornerRadius,
      label,
      zIndex,
      shape: node.shape ?? 'rectangle',
      layout: { padding: 0, ...node.layout },
      style: { fill, strokeWidth: 0, ...style },
    };
  }
  if (child.type === 'node')
    applyNodeChannelDeliveries(
      child,
      mark,
      row,
      channels,
      mark.type === 'point' && (mark.properties?.text !== undefined || mark.encodings?.text !== undefined)
        ? 'pointText'
        : mark.type === 'point'
          ? 'pointGlyph'
          : 'cell',
    );
  else applyPathChannelDeliveries(child, mark, row, channels);
  if (mark.type === 'point' && child.type === 'node' && mark.properties?.orientation?.kind === 'coordinate') {
    const orientation = mark.properties.orientation;
    if (!frame.roles.includes(orientation.role))
      throw new RetikzPlotError(`Annotation orientation has unknown role "${orientation.role}"`);
    const tangent = frame.tangentAt?.(orientation.role, mappedPosition(positions[0], frame, row));
    if (!tangent || !tangent.every(Number.isFinite) || Math.hypot(...tangent) === 0)
      throw new RetikzPlotError(`Annotation orientation is undefined for role "${orientation.role}"`);
    child.rotate =
      (Math.atan2(tangent[1], tangent[0]) * 180) / Math.PI +
      (orientation.align === 'normal' ? 90 : 0) +
      (child.rotate ?? 0);
  }
  if (datum !== undefined) {
    const { id: _id, ...geometryChild } = definedProperties(child);
    return decorateDatum(geometryChild, datum.row, datum.transformedIndex, mark.type, context?.provenance, undefined);
  }
  return attachMarkLayer({ type: 'scope', children: [definedProperties(child)] } satisfies IRScope, mark, context);
};
