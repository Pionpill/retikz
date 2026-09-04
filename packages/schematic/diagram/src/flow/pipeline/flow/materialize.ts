import type { IRChild, IRGeometryLabel } from '@retikz/core';
import type { IRGraph, IRGraphRelation } from '@retikz/graph';
import type { BoundsRect, Position } from '@retikz/math';

import { createGroupBodyAllocation, GraphType } from '@retikz/graph';

import type { FlowLayoutOutput } from '../../contract';
import type { CanonicalFlowElement, CanonicalFlowEntity, CanonicalFlowRelation } from '../../resolve';
import type { FlowElementMeasurement, FlowMeasurement } from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

const materializationFailure = (
  label: string,
  path: ReadonlyArray<string | number>,
  reason: string,
  relatedIds: ReadonlyArray<string> = [label],
): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMaterializationFailed,
    message: `Flow geometry for '${label}' could not be materialized through Graph: ${reason}`,
    details: { stage: 'materialize', path, relatedIds, reason },
  });
};

const boundsOf = (
  id: string,
  path: ReadonlyArray<string | number>,
  boundsById: ReadonlyMap<string, Readonly<BoundsRect>>,
): Readonly<BoundsRect> =>
  boundsById.get(id) ?? materializationFailure(id, path, 'layout output omitted element bounds.');

const measurementOf = (
  element: CanonicalFlowElement,
  measurements: ReadonlyMap<string, FlowElementMeasurement>,
): FlowElementMeasurement =>
  measurements.get(element.id) ?? materializationFailure(element.id, element.path, 'measurement record is missing.');

const translatedElement = (
  element: CanonicalFlowEntity,
  parentOrigin: Position,
  bounds: Readonly<BoundsRect>,
  measurement: Extract<FlowElementMeasurement, { probe: unknown }>,
): IRChild => {
  const localX = bounds.x - parentOrigin[0] - measurement.probe.allocationBounds.x;
  const localY = bounds.y - parentOrigin[1] - measurement.probe.allocationBounds.y;
  return { ...element.graph, position: [localX, localY] };
};

const materializeElements = (
  elements: ReadonlyArray<CanonicalFlowElement>,
  parentOrigin: Position,
  boundsById: ReadonlyMap<string, Readonly<BoundsRect>>,
  measurements: ReadonlyMap<string, FlowElementMeasurement>,
): Array<IRChild> =>
  elements.map(element => {
    const bounds = boundsOf(element.id, element.path, boundsById);
    const measurement = measurementOf(element, measurements);
    if (element.type === 'entity') {
      if ('probe' in measurement) return translatedElement(element, parentOrigin, bounds, measurement);
      return materializationFailure(element.id, element.path, 'leaf received Flow scope measurement.');
    }
    if ('probe' in measurement) {
      return materializationFailure(element.id, element.path, 'Flow scope received leaf measurement.');
    }
    const contentWidth = bounds.width - measurement.contentInsets.left - measurement.contentInsets.right;
    const contentHeight = bounds.height - measurement.contentInsets.top - measurement.contentInsets.bottom;
    const contentOrigin: Position = [
      bounds.x + measurement.contentInsets.left,
      bounds.y + measurement.contentInsets.top,
    ];
    const transforms = [
      {
        kind: 'translate' as const,
        x: bounds.x - parentOrigin[0],
        y: bounds.y - parentOrigin[1],
      },
    ];
    if (element.type === 'layout') {
      return {
        type: 'scope',
        transforms,
        children: materializeElements(element.elements, contentOrigin, boundsById, measurements),
      };
    }
    return {
      ...element.graph,
      transforms,
      children: [
        createGroupBodyAllocation({ x: 0, y: 0, width: contentWidth, height: contentHeight }),
        ...materializeElements(element.elements, contentOrigin, boundsById, measurements),
      ],
    };
  });

const distance = (source: Readonly<Position>, target: Readonly<Position>): number =>
  Math.hypot(target[0] - source[0], target[1] - source[1]);

type SegmentProjection = Readonly<{
  index: number;
  ratio: number;
  point: Readonly<Position>;
  distance: number;
}>;

/** 把 reservation 中心投影到最近 route segment，并在等距时保留较早 segment */
const nearestSegmentProjection = (
  points: ReadonlyArray<Readonly<Position>>,
  center: Readonly<Position>,
): SegmentProjection => {
  let selected: SegmentProjection | undefined;
  points.slice(1).forEach((target, index) => {
    const source = points[index];
    const deltaX = target[0] - source[0];
    const deltaY = target[1] - source[1];
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const ratio =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((center[0] - source[0]) * deltaX + (center[1] - source[1]) * deltaY) / lengthSquared),
          );
    const point: Position = [source[0] + deltaX * ratio, source[1] + deltaY * ratio];
    const projection: SegmentProjection = {
      index,
      ratio,
      point,
      distance: distance(point, center),
    };
    if (selected === undefined || projection.distance < selected.distance) selected = projection;
  });
  return selected ?? { index: 0, ratio: 0, point: points[0] ?? [0, 0], distance: 0 };
};

/** 从 projection 到 reservation 中心的稳定法向方向导出 Core Geometry Label side */
const labelSide = (
  points: ReadonlyArray<Readonly<Position>>,
  projection: SegmentProjection,
  center: Readonly<Position>,
): IRGeometryLabel['side'] => {
  const offsetX = center[0] - projection.point[0];
  const offsetY = center[1] - projection.point[1];
  if (offsetX !== 0 || offsetY !== 0) {
    if (Math.abs(offsetX) > Math.abs(offsetY)) return offsetX < 0 ? 'left' : 'right';
    return offsetY < 0 ? 'top' : 'bottom';
  }
  const source = points[projection.index] ?? projection.point;
  const target = points[projection.index + 1] ?? projection.point;
  return Math.abs(target[0] - source[0]) >= Math.abs(target[1] - source[1]) ? 'top' : 'right';
};

const labelPlacement = (
  relation: CanonicalFlowRelation,
  points: ReadonlyArray<Readonly<Position>>,
  labelBounds: Readonly<BoundsRect> | undefined,
): IRGeometryLabel | undefined => {
  if (relation.source.label === undefined) return undefined;
  if (labelBounds === undefined) {
    return materializationFailure(
      relation.path.join('.'),
      relation.path,
      'labeled relation received no label reservation.',
      [relation.source.source, relation.source.target],
    );
  }
  const center: Position = [labelBounds.x + labelBounds.width / 2, labelBounds.y + labelBounds.height / 2];
  const projection = nearestSegmentProjection(points, center);
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const precedingLength = lengths.slice(0, projection.index).reduce((sum, length) => sum + length, 0);
  const selectedLength = lengths[projection.index] ?? 0;
  const position = totalLength === 0 ? 0.5 : (precedingLength + selectedLength * projection.ratio) / totalLength;
  return {
    text: relation.source.label,
    position,
    side: labelSide(points, projection, center),
    distance: projection.distance,
    sloped: true,
  };
};

const materializeRelation = (
  relation: CanonicalFlowRelation,
  output: FlowLayoutOutput['relations'][number],
  routing: FlowMeasurement['input']['relations'][number]['routing'],
): IRGraphRelation => {
  const innerPoints = output.points.slice(1, -1);
  const label = labelPlacement(relation, output.points, output.labelBounds);
  return {
    ...relation.graph,
    source: { id: relation.source.source },
    target: { id: relation.source.target },
    route: [
      { type: 'step', kind: 'move', to: { id: relation.source.source } },
      ...innerPoints.map(point => ({
        type: 'step' as const,
        kind: 'line' as const,
        to: [point[0], point[1]] as [number, number],
      })),
      { type: 'step', kind: 'line', to: { id: relation.source.target } },
    ],
    ...(routing.kind === 'orthogonal' && routing.cornerRadius > 0 ? { roundedCorners: routing.cornerRadius } : {}),
    ...(label === undefined ? {} : { labels: [label] }),
  };
};

/** 把已验证 Flow geometry 投影为唯一 Graph drawing Source */
export const materializeFlowGraph = (measurement: FlowMeasurement, output: FlowLayoutOutput): IRGraph => {
  const boundsById = new Map(output.elements.map(element => [element.id, element.bounds]));
  const relations = measurement.diagram.relations.map((relation, relationIndex) => {
    const relationOutput = output.relations[relationIndex];
    const relationInput = measurement.input.relations[relationIndex];
    return materializeRelation(relation, relationOutput, relationInput.routing);
  });
  return {
    namespace: 'graph',
    type: GraphType.Graph,
    children: [
      ...materializeElements(measurement.diagram.elements, [0, 0], boundsById, measurement.elementMeasurements),
      ...relations,
    ],
  };
};
