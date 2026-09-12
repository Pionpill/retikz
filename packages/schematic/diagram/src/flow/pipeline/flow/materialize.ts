import type { IRChild } from '@retikz/core';
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
  return { ...measurement.graph, position: [localX, localY] };
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

const materializeRelation = (
  relation: CanonicalFlowRelation,
  output: FlowLayoutOutput['relations'][number],
  routing: FlowMeasurement['input']['relations'][number]['routing'],
): IRGraphRelation => {
  const innerPoints = output.points.slice(1, -1);
  const label = relation.source.label === undefined ? undefined : { text: relation.source.label };
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
    ...(routing.kind !== 'straight' && routing.cornerRadius > 0 ? { roundedCorners: routing.cornerRadius } : {}),
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
