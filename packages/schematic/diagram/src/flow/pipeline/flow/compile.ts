import type { IRScope, LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';
import type { Position } from '@retikz/math';

import { intrinsicLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';

import type { ResolvedFlowDiagramDefinitionOptions } from '../../providers';
import type { CanonicalFlowDiagram } from '../../resolve';
import type { FlowDiagramArtifact, IRFlowDiagram } from '../../schemas';

import { composeDiagramFoundation, resolveDiagramFoundation } from '../../../_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { assertFlowLayoutCapabilities, resolveFlowDiagram } from '../../resolve';
import { createFlowDiagramArtifact, createFlowSpatialHandles } from './artifact';
import { executeFlowLayout } from './layout-output';
import { createFlowLayoutExecutionContext } from './layout-placement';
import { materializeFlowGraph } from './materialize';
import { measureFlowDiagram } from './measure';

const flowScopeProps = (source: IRFlowDiagram): Omit<IRScope, 'type' | 'children'> => {
  const {
    namespace: _namespace,
    type: _type,
    presentation: _presentation,
    frame: _frame,
    diagramTheme: _diagramTheme,
    entities: _entities,
    groups: _groups,
    layouts: _layouts,
    children: _children,
    relations: _relations,
    flowThemeTokens: _flowThemeTokens,
    flowTheme: _flowTheme,
    ...scope
  } = source;
  void _namespace;
  void _type;
  void _presentation;
  void _frame;
  void _diagramTheme;
  void _entities;
  void _groups;
  void _layouts;
  void _children;
  void _relations;
  void _flowThemeTokens;
  void _flowTheme;
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
      relatedIds: [...new Set(diagram.relations.flatMap(relation => [relation.source.source, relation.source.target]))],
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
    const output = executeFlowLayout(definition, measurement.input, createFlowLayoutExecutionContext(context));
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
        ...(source.diagramTheme === undefined ? {} : { diagramTheme: source.diagramTheme }),
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
    const routings = measurement.input.relations.map(relation => relation.routing);
    const artifact = createFlowDiagramArtifact({
      definitionName: definition.name,
      frameAllocationBounds: foundation.frame.allocationBounds,
      frameVisualBounds: foundation.frame.visualBounds,
      regions: foundation.regions,
      drawingOffset,
      elements: diagram.elements,
      relations: diagram.relations,
      output,
      routings,
    });
    const spatialHandles = createFlowSpatialHandles(
      foundation.frame.allocationBounds,
      foundation.regions,
      artifact.elements,
    );
    return {
      allocationBounds: foundation.frame.allocationBounds,
      children: [context.scope(flowScopeProps(source), [context.replay(foundation.frame)], spatialHandles)],
      artifact,
    };
  };
