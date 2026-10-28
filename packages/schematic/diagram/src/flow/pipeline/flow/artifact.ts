import type { BoundsRect, Position } from '@retikz/math';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { FlowLayoutOutput } from '../../contract';
import type { CanonicalFlowElement, CanonicalFlowRelation } from '../../resolve';
import type { FlowArtifactBounds, FlowDiagramArtifact, FlowElementArtifact } from '../../schemas';

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
  drawingOffset: Readonly<Position>,
): FlowDiagramArtifact['relations'] =>
  relations.map((relation, index) => {
    const geometry = output.relations[index];
    const routing = geometry.route;
    const translatePoint = (point: Readonly<Position>): Position => [
      point[0] + drawingOffset[0],
      point[1] + drawingOffset[1],
    ];
    const route: FlowDiagramArtifact['relations'][number]['route'] =
      routing.kind === 'curve'
        ? {
            ...routing,
            points: [translatePoint(routing.points[0]), translatePoint(routing.points[1])],
            control: translatePoint(routing.control),
          }
        : routing.kind === 'cubic'
          ? {
              ...routing,
              points: [translatePoint(routing.points[0]), translatePoint(routing.points[1])],
              control1: translatePoint(routing.control1),
              control2: translatePoint(routing.control2),
            }
          : routing.kind === 'bend'
            ? {
                ...routing,
                points: [translatePoint(routing.points[0]), translatePoint(routing.points[1])] as [Position, Position],
              }
            : { ...routing, points: routing.points.map(translatePoint) };

    return {
      source: geometry.source,
      target: geometry.target,
      route,
      ...(geometry.labelBounds === undefined
        ? {}
        : { labelReservation: translateBounds(geometry.labelBounds, drawingOffset) }),
    };
  });

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
}): FlowDiagramArtifact => {
  const boundsById = new Map(options.output.elements.map(element => [element.id, element.bounds]));
  return {
    layout: { definition: options.definitionName },
    frame: translateArtifactBounds(options.frameAllocationBounds, options.frameVisualBounds, [0, 0]),
    regions: options.regions,
    elements: artifactElements(options.elements, boundsById, options.drawingOffset),
    relations: artifactRelations(options.relations, options.output, options.drawingOffset),
  };
};
