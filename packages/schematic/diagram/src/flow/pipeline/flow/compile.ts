import type { IRScope, LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';
import { RetikzCoreError } from '@retikz/core';
import { intrinsicLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';
import type { Position } from '@retikz/math';

import { composeDiagramFoundation, resolveDiagramFoundation } from '../../../_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { ResolvedFlowDiagramDefinitionOptions } from '../../providers';
import {
  evaluateFlowBezierConflicts,
  evaluateFlowOrthogonalConflicts,
  flowPriorLabelReservations,
  isFlowAutomaticRouting,
  flowBendGeometryFailure,
  flowRelationObstacles,
  scoreFlowBendNodes,
  flowSmoothConflicts,
} from '../../providers';
import type { CanonicalFlowDiagram } from '../../resolve';
import { assertFlowLayoutCapabilities, resolveFlowDiagram } from '../../resolve';
import type { FlowDiagramArtifact, IRFlowDiagram } from '../../schemas';
import { createFlowDiagramArtifact, createFlowSpatialHandles } from './artifact';
import { executeFlowLayout } from './layout-output';
import { createFlowLayoutExecutionContext } from './layout-placement';
import { materializeFlowGraph, materializeFlowElements } from './materialize';
import { measureFlowDiagram } from './measure';

const flowScopeProps = (source: IRFlowDiagram): Omit<IRScope, 'type' | 'children'> => {
  const {
    namespace: _namespace,
    type: _type,
    presentation: _presentation,
    frame: _frame,
    diagramDefaults: _diagramDefaults,
    flowDefaults: _flowDefaults,
    graphRules: _graphRules,
    layout: _layout,
    routing: _routing,
    entities: _entities,
    groups: _groups,
    layouts: _layouts,
    children: _children,
    relations: _relations,
    ...scope
  } = source;
  void _namespace;
  void _type;
  void _presentation;
  void _frame;
  void _diagramDefaults;
  void _flowDefaults;
  void _graphRules;
  void _layout;
  void _routing;
  void _entities;
  void _groups;
  void _layouts;
  void _children;
  void _relations;

  return scope;
};

const materializationFailure = (
  definition: string,
  stage: 'materialize' | 'assemble',
  reason: string,
  cause: unknown,
  context: Readonly<{ path: ReadonlyArray<string | number>; relatedIds?: ReadonlyArray<string> }>,
): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMaterializationFailed,
    message: `Flow Diagram could not complete the ${stage} stage: ${reason}`,
    details: {
      stage,
      path: context.path,
      ...(context.relatedIds === undefined ? {} : { relatedIds: context.relatedIds }),
      definition,
      reason,
    },
    cause,
  });
};

/** 为完整 Graph drawing probe 失败选择最窄可证明的 authored Flow 上下文 */
const drawingFailureContext = (
  diagram: CanonicalFlowDiagram,
): Readonly<{ path: ReadonlyArray<string | number>; relatedIds: ReadonlyArray<string> }> => {
  if (diagram.relations.length > 0) {
    return {
      path: diagram.relations.length === 1 ? diagram.relations[0].path : [],
      relatedIds: [
        ...new Set(diagram.relations.flatMap(relation => [relation.source.source.id, relation.source.target.id])),
      ],
    };
  }

  const elements = (
    values: CanonicalFlowDiagram['elements'],
  ): ReadonlyArray<CanonicalFlowDiagram['elements'][number]> =>
    values.flatMap(element => [element, ...(element.type === 'entity' ? [] : elements(element.elements))]);
  const authoredElements = elements(diagram.elements);

  return {
    path: authoredElements.length === 1 ? authoredElements[0].path : [],
    relatedIds: authoredElements.map(element => element.id),
  };
};

/** 创建一次 Flow Source 到 Graph、Foundation、artifact 与spatial handles的原子compile */
export const createCompileFlowDiagram =
  (options: ResolvedFlowDiagramDefinitionOptions) =>
  (
    source: IRFlowDiagram,
    context: LayoutCompositeCompileContext,
  ): LayoutCompositeCompileResult<FlowDiagramArtifact> => {
    const definition = options.flowLayouts.defaultLayout;
    const diagram = resolveFlowDiagram(source, {
      theme: context.theme,
      flowThemeStyles: options.flowThemeStyles,
      graph: options.graph,
    });
    assertFlowLayoutCapabilities(definition, diagram);

    const measurement = measureFlowDiagram(diagram, context, definition, options.graph);
    const output = executeFlowLayout(definition, measurement.input, {
      ...createFlowLayoutExecutionContext(context, measurement.input),
      resolveEndpoint: query => {
        try {
          return context.resolvePathTargets({
            child: {
              type: 'scope',
              localNamespace: true,
              ...(source.transforms === undefined ? {} : { transforms: source.transforms }),
              children: [materializeFlowElements(measurement, query.elements)],
            },
            source: query.target,
            points: [],
          }).source;
        } catch (cause) {
          const relationIndex = measurement.input.relations.findIndex(
            relation => relation.source.id === query.target.id || relation.target.id === query.target.id,
          );
          const end =
            relationIndex >= 0 && measurement.input.relations[relationIndex].source.id === query.target.id
              ? 'source'
              : 'target';

          return materializationFailure(definition.name, 'materialize', 'Endpoint boundary query failed.', cause, {
            path: relationIndex < 0 ? [] : ['relations', relationIndex, end],
            relatedIds: [query.target.id],
          });
        }
      },
      resolveRoutePoints: query => {
        try {
          const resolved = context.resolvePathTargets({
            child: {
              type: 'scope',
              ...(source.transforms === undefined ? {} : { transforms: source.transforms }),
              localNamespace: true,
              children: [materializeFlowElements(measurement, query.elements)],
            },
            source: query.source,
            points: [...query.points, query.target],
          });
          return [resolved.source, ...resolved.points];
        } catch (cause) {
          const index = measurement.input.relations.findIndex(
            relation =>
              relation.source.id === query.source.id &&
              relation.target.id === query.target.id &&
              relation.routing.kind === 'smooth' &&
              JSON.stringify(relation.routing.points) === JSON.stringify(query.points),
          );
          const queryPath = cause instanceof RetikzCoreError ? cause.details?.path : undefined;
          const pointMatch = typeof queryPath === 'string' ? /^points\[(\d+)\]$/.exec(queryPath) : null;
          const pointIndex = pointMatch === null ? undefined : Number(pointMatch[1]);

          return materializationFailure(definition.name, 'materialize', 'Smooth waypoint query failed.', cause, {
            path:
              index < 0
                ? []
                : queryPath === 'source'
                  ? ['relations', index, 'source']
                  : pointIndex === query.points.length
                    ? ['relations', index, 'target']
                    : ['relations', index, 'routing', 'points', ...(pointIndex === undefined ? [] : [pointIndex])],
            relatedIds: [query.source.id, query.target.id],
          });
        }
      },
    });

    for (const [index, geometry] of output.relations.entries()) {
      if (geometry.route.kind === 'smooth') {
        const relation = measurement.input.relations[index];
        const conflicts = flowSmoothConflicts(
          geometry.route,
          relation,
          flowRelationObstacles(measurement.input, output, relation),
        );
        if (conflicts.length > 0)
          context.warn(
            'FlowSmoothObstacleConflict',
            `Smooth reference curve conflicts with ${conflicts.join(', ')}; keep authored waypoints and inspect the final drawing.`,
            `relations[${index}].routing.points`,
          );
        continue;
      }

      if (geometry.route.kind === 'curve' || geometry.route.kind === 'cubic') {
        const relation = measurement.input.relations[index];
        const conflicts = evaluateFlowBezierConflicts(
          geometry.route,
          relation,
          flowRelationObstacles(measurement.input, output, relation),
          flowPriorLabelReservations(measurement.input.relations, output.relations, index),
        );
        if (conflicts.nodes > 0 || conflicts.labelConflicts > 0)
          context.warn(
            isFlowAutomaticRouting(relation.routing) ? 'FlowBezierSearchExhausted' : 'FlowBezierObstacleConflict',
            `Bezier reference geometry conflicts with ${conflicts.relatedIds.join(', ')}; inspect the final drawing.`,
            `relations[${index}]`,
          );
        continue;
      }

      if (geometry.route.kind === 'orthogonal') {
        if (geometry.route.points.length === 2) continue;

        const relation = measurement.input.relations[index];
        const { score } = evaluateFlowOrthogonalConflicts(
          geometry.route,
          relation,
          flowRelationObstacles(measurement.input, output, relation),
          flowPriorLabelReservations(measurement.input.relations, output.relations, index),
        );
        if (score[0] > 0 || score[2] > 0)
          context.warn(
            'FlowOrthogonalObstacleConflict',
            'Orthogonal reference route conflicts with nodes or labels; the best available route is retained.',
            `relations[${index}]`,
          );
        continue;
      }

      if (geometry.route.kind !== 'bend') continue;

      const relation = measurement.input.relations[index];
      let conflictCount: number;

      try {
        [conflictCount] = scoreFlowBendNodes(
          geometry.route,
          relation,
          flowRelationObstacles(measurement.input, output, relation),
        );
      } catch (cause) {
        return flowBendGeometryFailure(index, relation, cause);
      }

      if (conflictCount > 0)
        context.warn(
          'FlowBendObstacleConflict',
          'Bend reference curve may intersect node bounds; inspect the drawing and adjust routing if needed.',
          diagram.relations[index].path
            .map(part => (typeof part === 'number' ? `[${part}]` : `.${part}`))
            .join('')
            .replace(/^\./, ''),
        );
    }

    const drawing = materializeFlowGraph(measurement, output);

    try {
      requiredLayoutProbe(context, { child: drawing, occurrence: 0 }, intrinsicLayoutProposal('natural'));
    } catch (cause) {
      return materializationFailure(
        definition.name,
        'materialize',
        'Render-ready Graph probe failed.',
        cause,
        drawingFailureContext(diagram),
      );
    }

    const foundationResolution = resolveDiagramFoundation(
      {
        ...(source.presentation === undefined ? {} : { presentation: source.presentation }),
        ...(source.frame === undefined ? {} : { frame: source.frame }),
        ...(source.diagramDefaults === undefined ? {} : { diagramDefaults: source.diagramDefaults }),
      },
      { theme: context.theme, diagramThemeStyles: options.diagramThemeStyles },
    );
    let foundation;

    try {
      foundation = composeDiagramFoundation(foundationResolution, drawing, context);
    } catch (cause) {
      return materializationFailure(definition.name, 'assemble', 'Diagram Foundation probe failed.', cause, {
        path: [],
      });
    }

    const drawingOffset: Position = [foundation.drawingOffset[0], foundation.drawingOffset[1]];
    const artifact = createFlowDiagramArtifact({
      definitionName: definition.name,
      frameAllocationBounds: foundation.frame.allocationBounds,
      frameVisualBounds: foundation.frame.visualBounds,
      regions: { ...foundation.regions, drawing: { ...foundation.regions.drawing, origin: drawingOffset } },
      drawingOffset,
      elements: diagram.elements,
      relations: diagram.relations,
      output,
    });
    const spatialHandles = createFlowSpatialHandles(
      foundation.frame.allocationBounds,
      artifact.regions,
      artifact.elements,
    );

    return {
      allocationBounds: foundation.frame.allocationBounds,
      children: [context.scope(flowScopeProps(source), [context.replay(foundation.frame)], spatialHandles)],
      artifact,
    };
  };
