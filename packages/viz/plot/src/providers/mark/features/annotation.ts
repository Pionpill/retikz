import type { IRNode, IRPath, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { Position } from '@retikz/math';

import type { CoordinateFrame, MarkAnnotationCapability } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotAnnotationPosition } from '../../../schemas';
import { cellGeometryNode } from '../private/cell';
import { annotationValue, decorateDatum, attachMarkLayer, DEFAULT_FILL, LINE_STROKE_WIDTH } from '../shared';
import { pointsToSteps } from '../shared';
import { pointGlyphStyle, POINT_DEFAULT_RADIUS } from './point-glyph';

/** 组装宿主时仅写入有值的可选字段，保持产物可 JSON 序列化 */
const definedProperties = <T extends object>(source: T): T =>
  Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined)) as T;

/** 将显式角色值映射到坐标参数空间，edge 使用最终角色范围 */
const mappedPosition = (source: IRPlotAnnotationPosition, frame: CoordinateFrame, row?: ExternalRow): Array<number> => {
  for (const role of Object.keys(source)) {
    if (!frame.roles.includes(role)) throw new RetikzPlotError(`Annotation position has unknown role "${role}"`);
  }
  return frame.roles.map(role => {
    const value = source[role];
    const scale = frame.roleScales?.[role];
    if (!Object.hasOwn(source, role) || scale === undefined)
      throw new RetikzPlotError(`Annotation position requires role "${role}" and its scale`);
    const mapped =
      typeof value === 'object' && 'edge' in value
        ? scale.range()[value.edge === 'start' ? 0 : 1]
        : scale.coordinate(annotationValue(value, row));
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
export const lowerAnnotation: MarkAnnotationCapability['lower'] = (mark, frame, color, context, datum) => {
  const {
    kind: _kind,
    transform: _transform,
    id,
    coordinateView: _view,
    layer: _layer,
    defaultColorGroup: _group,
    defaultColorIndex: _colorIndex,
    contributeToDomain: _contribute,
    ...geometry
  } = mark;
  const fill = color ?? DEFAULT_FILL;
  let child: IRNode | IRPath;
  if (geometry.type === 'point') {
    const {
      type: _type,
      position,
      text,
      shape,
      size,
      dx = 0,
      dy = 0,
      orientation,
      rotate,
      scale,
      boundary,
      cornerRadius,
      label,
      zIndex,
      width,
      minimumSize,
      padding,
      margin,
      align,
      lineHeight,
      maxTextWidth,
      ...style
    } = geometry;
    const mapped = mappedPosition(position, frame, datum?.row);
    const projected = projectPosition(mapped, frame);
    let angle = rotate;
    if (orientation?.kind === 'coordinate') {
      if (!frame.roles.includes(orientation.role))
        throw new RetikzPlotError(`Annotation orientation has unknown role "${orientation.role}"`);
      const tangent = frame.tangentAt?.(orientation.role, mapped);
      if (!tangent || !tangent.every(Number.isFinite) || Math.hypot(...tangent) === 0)
        throw new RetikzPlotError(`Annotation orientation is undefined for role "${orientation.role}"`);
      angle =
        (Math.atan2(tangent[1], tangent[0]) * 180) / Math.PI +
        (orientation.align === 'normal' ? 90 : 0) +
        (rotate ?? 0);
    }
    const defaults = pointGlyphStyle(fill, {});
    const node: IRNode = {
      type: 'node',
      id,
      position: [projected[0] + dx, projected[1] + dy],
      text,
      shape: shape ?? (text === undefined ? defaults.shape : undefined),
      rotate: angle,
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
  } else if (geometry.type === 'path') {
    const {
      type: _type,
      from,
      to,
      connection,
      rotate,
      scale,
      roundedCorners,
      label,
      marks,
      zIndex,
      ...style
    } = geometry;
    const start = mappedPosition(from, frame, datum?.row);
    const end = mappedPosition(to, frame, datum?.row);
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
      type: _type,
      bounds,
      connection,
      rotate,
      scale,
      boundary,
      cornerRadius,
      label,
      zIndex,
      ...style
    } = geometry;
    const from = mappedPosition(
      Object.fromEntries(Object.entries(bounds).map(([role, bound]) => [role, bound.from])),
      frame,
      datum?.row,
    );
    const to = mappedPosition(
      Object.fromEntries(Object.entries(bounds).map(([role, bound]) => [role, bound.to])),
      frame,
      datum?.row,
    );
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
  if (datum !== undefined) {
    const { id: _id, ...geometryChild } = definedProperties(child);
    return decorateDatum(geometryChild, datum.row, datum.transformedIndex, mark.type, context?.provenance, undefined);
  }
  return attachMarkLayer({ type: 'scope', children: [definedProperties(child)] } satisfies IRScope, mark, context);
};
