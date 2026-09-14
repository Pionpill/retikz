import type { IRNode, LayoutCompositeCompileContext } from '@retikz/core';
import { resolveBoxSpacing } from '@retikz/core';
import type { GraphDefinitionOptions } from '@retikz/graph';
import {
  measureGroupShell,
  resolveGraphDefinitionOptions,
  resolveRelation,
  resolveRelationAppearance,
} from '@retikz/graph';
import { intrinsicLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { FlowLayoutDefinition, FlowLayoutElementInput, FlowLayoutRelationInput } from '../../contract';
import type { CanonicalFlowDiagram, CanonicalFlowElement, CanonicalFlowRelation } from '../../resolve';
import { mergeFlowLayoutIntent, resolveEffectiveFlowLayout, resolveEffectiveFlowPlacement } from '../../resolve';
import type { IRFlowLayoutIntent } from '../../schemas';
import type { FlowElementMeasurement, FlowMeasurement } from './types';

/** 用当前 Graph Source 测量一个 Flow Entity，并把唯一最终 Source 记录在 measurement 中 */
const measureEntity = (
  element: Extract<CanonicalFlowElement, { type: 'entity' }>,
  graph: Extract<CanonicalFlowElement, { type: 'entity' }>['graph'],
  context: LayoutCompositeCompileContext,
  state: MeasurementState,
): FlowLayoutElementInput => {
  const child = { ...graph, position: [0, 0] as const };
  const probe = requiredLayoutProbe(context, { child, occurrence: 0 }, intrinsicLayoutProposal('natural'));
  const margin = resolveBoxSpacing(element.layout.margin, 0);
  state.elementMeasurements.set(element.id, { element, graph, probe, margin });
  return {
    kind: 'leaf',
    id: element.id,
    ...(element.rank === undefined ? {} : { rank: element.rank }),
    size: { width: probe.allocationBounds.width, height: probe.allocationBounds.height },
    margin,
  };
};

/** 在一个无外壳 Layout scope 内，把直接 Entity 重测为同一可见外框宽度 */
const applyLayoutItemWidth = (
  source: Extract<CanonicalFlowElement, { type: 'layout' }>['source'],
  elements: ReadonlyArray<CanonicalFlowElement>,
  measuredElements: ReadonlyArray<FlowLayoutElementInput>,
  context: LayoutCompositeCompileContext,
  state: MeasurementState,
): ReadonlyArray<FlowLayoutElementInput> => {
  const itemWidth = source.itemWidth;
  if (itemWidth === undefined) return measuredElements;
  const leafMeasurements = elements.flatMap(element => {
    if (element.type !== 'entity') return [];
    const measurement = state.elementMeasurements.get(element.id);
    return measurement !== undefined && 'probe' in measurement ? [{ element, measurement }] : [];
  });
  const targetWidth =
    typeof itemWidth === 'number'
      ? itemWidth
      : Math.max(...leafMeasurements.map(({ measurement }) => measurement.probe.visualBounds.width), 0);
  if (leafMeasurements.length === 0) return measuredElements;
  return measuredElements.map((measured, index) => {
    const element = elements[index];
    if (element.type !== 'entity') return measured;
    const graph = {
      ...element.graph,
      layout: { ...element.graph.layout, width: targetWidth },
    };
    return measureEntity(element, graph, context, state);
  });
};

const measureFailure = (element: CanonicalFlowElement | CanonicalFlowRelation, cause: unknown): never => {
  const isElement = 'type' in element;
  const relatedIds = isElement ? [element.id] : [element.source.source, element.source.target];
  const label = isElement ? `${element.type} '${element.id}'` : `relation at ${element.path.join('.')}`;
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMeasurementFailed,
    message: `Flow ${label} could not be measured by its Graph pipeline.`,
    details: {
      stage: 'measure',
      path: element.path,
      relatedIds,
      providerKey: `graph.${isElement ? element.type : 'relation'}`,
    },
    cause,
  });
};

const measureRelationLabel = (
  relation: CanonicalFlowRelation,
  context: LayoutCompositeCompileContext,
  graphOptions: GraphDefinitionOptions,
): Readonly<{ width: number; height: number }> | undefined => {
  if (relation.source.label === undefined) return undefined;
  try {
    const resolvedGraphOptions = resolveGraphDefinitionOptions(graphOptions);
    const canonicalRelation = resolveRelation(relation.graph, resolvedGraphOptions);
    const appearance = resolveRelationAppearance(canonicalRelation, {
      ...resolvedGraphOptions,
      theme: context.theme,
    });
    const labelNode: IRNode = {
      type: 'node',
      position: [0, 0],
      shape: 'rectangle',
      scale: 1,
      rotate: 0,
      text: relation.source.label,
      style: {
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        ...(appearance.labelTextForeground === undefined ? {} : { textColor: appearance.labelTextForeground }),
        ...(appearance.labelFont === undefined ? {} : { font: appearance.labelFont }),
        opacity: appearance.labelOpacity,
      },
      layout: { padding: 0, margin: 0, minimumSize: 0 },
    };
    return requiredLayoutProbe(context, { child: labelNode, occurrence: 0 }, intrinsicLayoutProposal('natural'))
      .slotSize;
  } catch (cause) {
    return measureFailure(relation, cause);
  }
};

type MeasurementState = {
  elementMeasurements: Map<string, FlowElementMeasurement>;
  effectiveLayouts: Map<string, ReturnType<typeof resolveEffectiveFlowLayout>>;
  scopePaths: Map<string, ReadonlyArray<string>>;
};

const measureElements = (
  elements: ReadonlyArray<CanonicalFlowElement>,
  context: LayoutCompositeCompileContext,
  definition: FlowLayoutDefinition,
  graphOptions: GraphDefinitionOptions,
  inheritedLayout: ReturnType<typeof resolveEffectiveFlowLayout>,
  inheritedLayoutIntent: IRFlowLayoutIntent,
  ancestorScopeIds: ReadonlyArray<string>,
  state: MeasurementState,
): ReadonlyArray<FlowLayoutElementInput> =>
  elements.map(element => {
    state.scopePaths.set(element.id, ancestorScopeIds);
    if (element.type !== 'entity') {
      try {
        const layoutIntent = mergeFlowLayoutIntent(inheritedLayoutIntent, element.layout);
        const effectiveLayout = resolveEffectiveFlowLayout(
          definition,
          element.layout,
          inheritedLayout,
          element.type === 'group' ? element.routing : undefined,
        );
        const shell =
          element.type === 'group'
            ? measureGroupShell(element.graph, context, graphOptions)
            : {
                minimumSize: { width: 0, height: 0 },
                contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
              };
        state.effectiveLayouts.set(element.id, effectiveLayout);
        if (element.type === 'group') {
          state.elementMeasurements.set(element.id, { element, contentInsets: shell.contentInsets });
        } else {
          state.elementMeasurements.set(element.id, { element, contentInsets: shell.contentInsets });
        }
        const measuredElements = measureElements(
          element.elements,
          context,
          definition,
          graphOptions,
          effectiveLayout,
          layoutIntent,
          [...ancestorScopeIds, element.id],
          state,
        );
        if (element.type === 'layout') {
          const finalElements = applyLayoutItemWidth(
            element.source,
            element.elements,
            measuredElements,
            context,
            state,
          );
          return {
            kind: 'layout',
            id: element.id,
            ...(element.rank === undefined ? {} : { rank: element.rank }),
            layout: effectiveLayout,
            placement: resolveEffectiveFlowPlacement(element.source, layoutIntent, definition),
            elements: finalElements,
          };
        }
        return {
          kind: 'group',
          id: element.id,
          ...(element.rank === undefined ? {} : { rank: element.rank }),
          minimumSize: shell.minimumSize,
          contentInsets: shell.contentInsets,
          layout: effectiveLayout,
          elements: measuredElements,
        };
      } catch (cause) {
        return measureFailure(element, cause);
      }
    }
    try {
      return measureEntity(element, element.graph, context, state);
    } catch (cause) {
      return measureFailure(element, cause);
    }
  });

const commonScopeId = (
  sourceScopes: ReadonlyArray<string>,
  targetScopes: ReadonlyArray<string>,
): string | undefined => {
  let scopeId: string | undefined;
  const sharedLength = Math.min(sourceScopes.length, targetScopes.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (sourceScopes[index] !== targetScopes[index]) break;
    scopeId = sourceScopes[index];
  }
  return scopeId;
};

const relationInputs = (
  diagram: CanonicalFlowDiagram,
  context: LayoutCompositeCompileContext,
  graphOptions: GraphDefinitionOptions,
  definition: FlowLayoutDefinition,
  rootLayout: ReturnType<typeof resolveEffectiveFlowLayout>,
  state: MeasurementState,
): ReadonlyArray<FlowLayoutRelationInput> =>
  diagram.relations.map(relation => {
    const sourceScopes = state.scopePaths.get(relation.source.source) ?? [];
    const targetScopes = state.scopePaths.get(relation.source.target) ?? [];
    const scopeId = commonScopeId(sourceScopes, targetScopes);
    const scopeLayout = scopeId === undefined ? rootLayout : (state.effectiveLayouts.get(scopeId) ?? rootLayout);
    const routing = resolveEffectiveFlowLayout(definition, {}, scopeLayout, relation.routing).routing;
    const labelSize = measureRelationLabel(relation, context, graphOptions);
    return {
      source: relation.source.source,
      target: relation.source.target,
      direction: relation.graph.direction ?? 'forward',
      routing,
      ...(labelSize === undefined ? {} : { labelSize }),
    };
  });

/** 使用最终 Graph definitions 构造一次 detached Flow layout 输入 */
export const measureFlowDiagram = (
  diagram: CanonicalFlowDiagram,
  context: LayoutCompositeCompileContext,
  definition: FlowLayoutDefinition,
  graphOptions: GraphDefinitionOptions,
): FlowMeasurement => {
  const rootLayout = resolveEffectiveFlowLayout(definition, diagram.layout, undefined, diagram.routing);
  const state: MeasurementState = {
    elementMeasurements: new Map(),
    effectiveLayouts: new Map(),
    scopePaths: new Map(),
  };
  const elements = measureElements(
    diagram.elements,
    context,
    definition,
    graphOptions,
    rootLayout,
    diagram.layout,
    [],
    state,
  );
  return {
    diagram,
    input: {
      layout: rootLayout,
      elements,
      relations: relationInputs(diagram, context, graphOptions, definition, rootLayout, state),
    },
    elementMeasurements: state.elementMeasurements,
    effectiveLayouts: state.effectiveLayouts,
  };
};
