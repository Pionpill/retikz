import type { IRChild, IRPath, IRStep, IRTarget, IRPaintValue } from '@retikz/core';

import type { CoordinateFrame, MarkChannels, MarkInstanceInput, MarkLoweringContext } from '../../../contract';
import { mapPositionInput, markInstances, unencodedMarkProperties } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotPathMark, IRPlotPositionInput, IRPlotPathEndpoint } from '../../../schemas';
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
import { lowerPathSteps } from './path-steps';

/** 按实例生成完整步骤或端点连接，共享路径宿主外观与追溯 */
export const lowerPathInstances = (
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
    const properties = unencodedMarkProperties(mark) ?? {};
    const {
      connection,
      rotate,
      scale,
      cornerRadius,
      label,
      marks,
      arrow,
      zIndex,
      anchorId: _anchorId,
      curve: _curve,
      closure: _closure,
      closed: _closed,
      connectNulls: _connectNulls,
      interpolation: _interpolation,
      kind: _kind,
      ribbon: _ribbon,
      ...style
    } = properties;
    let steps: Array<IRStep>;
    if (mark.encodings.steps !== undefined) {
      steps = lowerPathSteps(mark, instance, frame, context);
    } else if (mark.encodings.from === undefined) {
      throw new RetikzPlotError('Instance path requires steps or endpoints');
    } else if ('mark' in mark.encodings.from || 'mark' in mark.encodings.to) {
      if (connection === 'coordinate')
        throw new RetikzPlotError(
          `Path mark "${mark.id ?? context?.markIndex}" cannot use coordinate connection with mark targets`,
        );
      const endpointTarget = (endpoint: IRPlotPathEndpoint, role: string): IRTarget => {
        if ('mark' in endpoint) {
          if (context?.targets === undefined) throw new RetikzPlotError('Mark target resolution requires a plot view');
          return context.targets.reference(endpoint, instance, {
            markType: mark.type,
            markId: mark.id,
            markIndex: context.markIndex,
            role,
            ...(instance.kind === 'row'
              ? { kind: 'row', transformedIndex: instance.transformedIndex }
              : { kind: 'single' }),
          });
        }
        const projected = frame.projectMappedRoles?.(mapEndpoint(endpoint));
        if (projected == null || !projected.every(Number.isFinite))
          throw new RetikzPlotError('Path endpoint requires valid mapped-role projection');
        return projected;
      };
      steps = [
        { type: 'step', kind: 'move', to: endpointTarget(mark.encodings.from, 'from') },
        { type: 'step', kind: 'line', to: endpointTarget(mark.encodings.to, 'to') },
      ];
    } else {
      const start = mapEndpoint(mark.encodings.from),
        end = mapEndpoint(mark.encodings.to);
      if (connection !== 'straight' && frame.projectSegment === undefined)
        throw new RetikzPlotError('Coordinate connection requires projectSegment');
      const points =
        connection === 'straight'
          ? [frame.projectMappedRoles?.(start), frame.projectMappedRoles?.(end)]
          : frame.projectSegment!(start, end);
      if (!points || points.length < 2 || points.some(point => !point || !point.every(Number.isFinite)))
        throw new RetikzPlotError('Path endpoints require valid mapped-role projection');
      const projected = points.filter((point): point is [number, number] => point != null);
      steps = pointsToSteps(projected, false) ?? [];
    }
    const color =
      (row === undefined ? undefined : channelValueOf<string>(channels, 'color')?.(row)) ??
      channelDefaultOf<string>(channels, 'color') ??
      DEFAULT_FILL;
    const resolvedLabels = resolveGeometryMarkLabels(label, row, undefined, mark.encodings.label, channels);
    const fill =
      (row === undefined ? undefined : channelValueOf<IRPaintValue>(channels, 'fill')?.(row)) ??
      channelDefaultOf<IRPaintValue>(channels, 'fill');
    const stroke =
      (row === undefined ? undefined : channelValueOf<IRPaintValue>(channels, 'stroke')?.(row)) ??
      channelDefaultOf<IRPaintValue>(channels, 'stroke') ??
      color;
    let child: IRPath = {
      type: 'path',
      ...(rotate === undefined ? {} : { rotate }),
      ...(scale === undefined ? {} : { scale }),
      ...(cornerRadius === undefined ? {} : { cornerRadius }),
      ...(marks === undefined ? {} : { marks }),
      ...(arrow === undefined ? {} : { arrow }),
      ...(zIndex === undefined ? {} : { zIndex }),
      ...(resolvedLabels === undefined ? {} : { label: resolvedLabels }),
      style: { stroke, ...(fill === undefined ? {} : { fill }), strokeWidth: LINE_STROKE_WIDTH, ...style },
      children: steps,
    };
    child = applyPathChannelDeliveries(child, mark, row, channels);
    if (instance.kind === 'row') {
      child = decorateDatum(child, instance.row, instance.transformedIndex, mark.type, context?.provenance, undefined);
    }
    children.push(attachMarkAnchor(child, mark, instance, context));
  }
  return children.length === 0 ? null : attachMarkLayer({ type: 'scope', children }, mark, context);
};
