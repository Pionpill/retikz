import type { IRNode, LayoutCompositeCompileContext } from '@retikz/core';
import type { GraphDefinitionOptions } from '@retikz/graph';

import { resolveBoxSpacing } from '@retikz/core';
import {
  measureGroupShell,
  resolveGraphDefinitionOptions,
  resolveRelation,
  resolveRelationAppearance,
} from '@retikz/graph';
import { intrinsicLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';

import type { FlowLayoutDefinition, FlowLayoutElementInput, FlowLayoutRelationInput } from '../../contract';
import type { CanonicalFlowDiagram, CanonicalFlowElement, CanonicalFlowRelation } from '../../resolve';
import type { FlowElementMeasurement, FlowMeasurement } from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { resolveEffectiveFlowLayout } from '../../resolve';

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
      fill: 'none',
      stroke: 'none',
      strokeWidth: 0,
      padding: 0,
      margin: 0,
      minimumSize: 0,
      scale: 1,
      rotate: 0,
      text: relation.source.label,
      textColor: appearance.labelTextForeground,
      ...(appearance.labelFont === undefined ? {} : { font: appearance.labelFont }),
      opacity: appearance.labelOpacity,
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
  ancestorScopeIds: ReadonlyArray<string>,
  state: MeasurementState,
): ReadonlyArray<FlowLayoutElementInput> =>
  elements.map(element => {
    state.scopePaths.set(element.id, ancestorScopeIds);
    if (element.type !== 'entity') {
      try {
        const effectiveLayout = resolveEffectiveFlowLayout(definition, element.layout, inheritedLayout);
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
          [...ancestorScopeIds, element.id],
          state,
        );
        if (element.type === 'layout') {
          return {
            kind: 'layout',
            id: element.id,
            ...(element.rank === undefined ? {} : { rank: element.rank }),
            layout: effectiveLayout,
            align: element.source.align ?? 'center',
            elements: measuredElements,
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
      const child = { ...element.graph, position: [0, 0] as const };
      const probe = requiredLayoutProbe(context, { child, occurrence: 0 }, intrinsicLayoutProposal('natural'));
      const margin = resolveBoxSpacing(element.layout.margin, 0);
      state.elementMeasurements.set(element.id, { element, probe, margin });
      return {
        kind: 'leaf',
        id: element.id,
        ...(element.rank === undefined ? {} : { rank: element.rank }),
        size: { width: probe.allocationBounds.width, height: probe.allocationBounds.height },
        margin,
      };
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
    const routing = resolveEffectiveFlowLayout(definition, relation.layout, scopeLayout).routing;
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
  const rootLayout = resolveEffectiveFlowLayout(definition, diagram.layout);
  const state: MeasurementState = {
    elementMeasurements: new Map(),
    effectiveLayouts: new Map(),
    scopePaths: new Map(),
  };
  const elements = measureElements(diagram.elements, context, definition, graphOptions, rootLayout, [], state);
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
