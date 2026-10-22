import type { IRChild, IRPath } from '@retikz/core';

import type { CoordinateFrame, MarkChannels, MarkInstanceInput, MarkLoweringContext } from '../../../contract';
import { mapPositionInput, markInstances, unencodedMarkProperties } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotPathMark, IRPlotPositionInput } from '../../../schemas';
import {
  attachMarkLayer,
  attachMarkAnchor,
  decorateDatum,
  pointsToSteps,
  channelValueOf,
  channelDefaultOf,
  applyPathChannelDeliveries,
  resolveGeometryMarkLabels,
  DEFAULT_FILL,
  LINE_STROKE_WIDTH,
} from '../shared';

/** 按实例将两个完整端点连接为路径，共享坐标连接能力 */
export const lowerPathEndpoints = (
  mark: IRPlotPathMark,
  input: MarkInstanceInput,
  frame: CoordinateFrame,
  channels: MarkChannels,
  context?: MarkLoweringContext,
): IRChild | null => {
  const children: Array<IRChild> = [];
  for (const instance of markInstances(input)) {
    const row = instance.kind === 'row' ? instance.row : undefined;
    const mapEndpoint = (position: Partial<Record<string, IRPlotPositionInput>>): Array<number> =>
      frame.roles.map(role => {
        const scale = frame.roleScales?.[role];
        if (scale === undefined || position[role] === undefined)
          throw new RetikzPlotError('Path endpoint requires role ' + role);
        const mapped = mapPositionInput(position[role], scale, row);
        if (!Number.isFinite(mapped)) throw new RetikzPlotError('Path endpoint cannot map role ' + role);
        return mapped;
      });
    if (mark.encodings.from === undefined) throw new RetikzPlotError('Endpoint path requires from and to');
    const start = mapEndpoint(mark.encodings.from),
      end = mapEndpoint(mark.encodings.to);
    const properties = unencodedMarkProperties(mark) ?? {};
    const {
      connection,
      rotate,
      scale,
      roundedCorners,
      label,
      marks,
      zIndex,
      anchorId: _anchorId,
      curve: _curve,
      closure: _closure,
      closed: _closed,
      connectNulls: _connectNulls,
      interpolation: _interpolation,
      ...style
    } = properties;
    if (connection !== 'straight' && frame.projectSegment === undefined)
      throw new RetikzPlotError('Coordinate connection requires projectSegment');
    const points =
      connection === 'straight'
        ? [frame.projectMappedRoles?.(start), frame.projectMappedRoles?.(end)]
        : frame.projectSegment!(start, end);
    if (!points || points.length < 2 || points.some(point => !point || !point.every(Number.isFinite)))
      throw new RetikzPlotError('Path endpoints require valid mapped-role projection');
    const projected = points.filter((point): point is [number, number] => point != null);
    const color =
      (row === undefined ? undefined : channelValueOf<string>(channels, 'color')?.(row)) ??
      channelDefaultOf<string>(channels, 'color') ??
      DEFAULT_FILL;
    const resolvedLabels = resolveGeometryMarkLabels(label, row, undefined, mark.encodings.label, channels);
    let child: IRPath = {
      type: 'path',
      ...(rotate === undefined ? {} : { rotate }),
      ...(scale === undefined ? {} : { scale }),
      ...(roundedCorners === undefined ? {} : { roundedCorners }),
      ...(marks === undefined ? {} : { marks }),
      ...(zIndex === undefined ? {} : { zIndex }),
      ...(resolvedLabels === undefined ? {} : { label: resolvedLabels }),
      style: { stroke: color, strokeWidth: LINE_STROKE_WIDTH, ...style },
      children: pointsToSteps(projected, false) ?? [],
    };
    if (instance.kind === 'row') {
      applyPathChannelDeliveries(child, mark, instance.row, channels);
      child = decorateDatum(child, instance.row, instance.transformedIndex, mark.type, context?.provenance, undefined);
    }
    children.push(attachMarkAnchor(child, mark, instance, context));
  }
  return children.length === 0 ? null : attachMarkLayer({ type: 'scope', children }, mark, context);
};
