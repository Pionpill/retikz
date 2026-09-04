import type { SpatialHandleDeclaration } from '@retikz/core';
import type { BoundsRect, Position } from '@retikz/math';

import type { FlowLayoutOutput } from '../../contract';
import type { CanonicalFlowElement, CanonicalFlowRelation } from '../../resolve';
import type { FlowArtifactBounds, FlowDiagramArtifact, FlowElementArtifact } from '../../schemas';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

const translateBounds = (bounds: Readonly<BoundsRect>, offset: Readonly<Position>): Readonly<BoundsRect> => ({
  x: bounds.x + offset[0],
  y: bounds.y + offset[1],
  width: bounds.width,
  height: bounds.height,
});

const translateArtifactBounds = (
  allocationBounds: Readonly<BoundsRect>,
  visualBounds: Readonly<BoundsRect>,
  offset: Readonly<Position>,
): FlowArtifactBounds => ({
  allocationBounds: translateBounds(allocationBounds, offset),
  visualBounds: translateBounds(visualBounds, offset),
});

const artifactElements = (
  elements: ReadonlyArray<CanonicalFlowElement>,
  boundsById: ReadonlyMap<string, Readonly<BoundsRect>>,
  drawingOffset: Readonly<Position>,
): Array<FlowElementArtifact> =>
  elements.map(element => {
    const bounds = boundsById.get(element.id);
    if (bounds === undefined) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.FlowMaterializationFailed,
        message: `Flow artifact geometry is missing for '${element.id}'.`,
        details: {
          stage: 'materialize',
          path: element.path,
          relatedIds: [element.id],
          reason: 'artifact element geometry is missing',
        },
      });
    }
    if (element.type !== 'entity') {
      return {
        id: element.id,
        kind: element.type,
        bounds: translateBounds(bounds, drawingOffset),
        elements: artifactElements(element.elements, boundsById, drawingOffset),
      };
    }
    return { id: element.id, kind: element.type, bounds: translateBounds(bounds, drawingOffset) };
  });

const artifactRelations = (
  relations: ReadonlyArray<CanonicalFlowRelation>,
  output: FlowLayoutOutput,
  routings: ReadonlyArray<{ kind: 'straight' } | { kind: 'orthogonal'; cornerRadius: number }>,
  drawingOffset: Readonly<Position>,
): FlowDiagramArtifact['relations'] =>
  relations.map((relation, index) => {
    const geometry = output.relations[index];
    const routing = routings[index];
    return {
      source: relation.source.source,
      target: relation.source.target,
      route: {
        ...routing,
        points: geometry.points.map(point => [point[0] + drawingOffset[0], point[1] + drawingOffset[1]]),
      },
      ...(geometry.labelBounds === undefined
        ? {}
        : { labelReservation: translateBounds(geometry.labelBounds, drawingOffset) }),
    };
  });

/** 为 Flow frame、drawing 与全部 authored elements 创建空间声明 */
export const createFlowSpatialHandles = (
  frameBounds: Readonly<BoundsRect>,
  regions: FlowDiagramArtifact['regions'],
  elements: ReadonlyArray<FlowElementArtifact>,
): ReadonlyArray<SpatialHandleDeclaration> => {
  const handles: Array<SpatialHandleDeclaration> = [
    { key: 'frame', role: 'frame', bounds: frameBounds, payload: { kind: 'frame' } },
  ];
  for (const regionKind of ['title', 'description', 'drawing', 'legend'] as const) {
    const region = regions[regionKind];
    if (region !== undefined) {
      handles.push({
        key: `region:${regionKind}`,
        role: 'region',
        bounds: region.allocationBounds,
        payload: { kind: regionKind },
      });
    }
  }
  const appendElements = (values: ReadonlyArray<FlowElementArtifact>): void => {
    for (const element of values) {
      const isScope = element.kind !== 'entity';
      handles.push({
        key: `element:${element.id}`,
        role: element.kind,
        bounds: element.bounds,
        payload: {
          id: element.id,
          kind: element.kind,
        },
      });
      if (isScope) appendElements(element.elements);
    }
  };
  appendElements(elements);
  return handles;
};

/** 组装无重复Source字段的 Flow renderer-neutral artifact */
export const createFlowDiagramArtifact = (options: {
  definitionName: string;
  frameAllocationBounds: Readonly<BoundsRect>;
  frameVisualBounds: Readonly<BoundsRect>;
  regions: FlowDiagramArtifact['regions'];
  drawingOffset: Readonly<Position>;
  elements: ReadonlyArray<CanonicalFlowElement>;
  relations: ReadonlyArray<CanonicalFlowRelation>;
  output: FlowLayoutOutput;
  routings: ReadonlyArray<{ kind: 'straight' } | { kind: 'orthogonal'; cornerRadius: number }>;
}): FlowDiagramArtifact => {
  const boundsById = new Map(options.output.elements.map(element => [element.id, element.bounds]));
  return {
    layout: { definition: options.definitionName },
    frame: translateArtifactBounds(options.frameAllocationBounds, options.frameVisualBounds, [0, 0]),
    regions: options.regions,
    elements: artifactElements(options.elements, boundsById, options.drawingOffset),
    relations: artifactRelations(options.relations, options.output, options.routings, options.drawingOffset),
  };
};
