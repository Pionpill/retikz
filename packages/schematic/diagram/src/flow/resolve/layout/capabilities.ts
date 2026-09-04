import type { FlowLayoutDefinition } from '../../contract';
import type { CanonicalFlowDiagram, CanonicalFlowElement } from '../flow';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

type CapabilityEvidence = Readonly<{
  name: string;
  relatedIds: ReadonlyArray<string>;
}>;

type ElementScopeIndex = Readonly<{
  scopes: ReadonlyMap<string, ReadonlyArray<string>>;
  elementsById: ReadonlyMap<string, CanonicalFlowElement>;
}>;

const indexElementScopes = (diagram: CanonicalFlowDiagram): ElementScopeIndex => {
  const scopes = new Map<string, ReadonlyArray<string>>();
  const elementsById = new Map<string, CanonicalFlowElement>();
  const visit = (elements: ReadonlyArray<CanonicalFlowElement>, ancestors: ReadonlyArray<string>): void => {
    for (const element of elements) {
      scopes.set(element.id, ancestors);
      elementsById.set(element.id, element);
      if (element.type !== 'entity') visit(element.elements, [...ancestors, element.id]);
    }
  };
  visit(diagram.elements, []);
  return { scopes, elementsById };
};

const commonScope = (sourceScopes: ReadonlyArray<string>, targetScopes: ReadonlyArray<string>): string | undefined => {
  let result: string | undefined;
  const length = Math.min(sourceScopes.length, targetScopes.length);
  for (let index = 0; index < length; index += 1) {
    if (sourceScopes[index] !== targetScopes[index]) break;
    result = sourceScopes[index];
  }
  return result;
};

const hasDirectedCycle = (diagram: CanonicalFlowDiagram): boolean => {
  const edges = new Map<string, Array<string>>();
  const addEdge = (source: string, target: string): void => {
    const targets = edges.get(source) ?? [];
    targets.push(target);
    edges.set(source, targets);
  };
  for (const relation of diagram.relations) {
    const direction = relation.graph.direction;
    if (direction === 'forward') addEdge(relation.source.source, relation.source.target);
    if (direction === 'reverse') addEdge(relation.source.target, relation.source.source);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const target of edges.get(id) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...edges.keys()].some(visit);
};

const pushEvidence = (evidence: Array<CapabilityEvidence>, name: string, relatedIds: ReadonlyArray<string>): void => {
  if (evidence.some(item => item.name === name)) return;
  evidence.push({ name, relatedIds });
};

/** 从 Canonical Flow 推导当前调用真正需要的布局能力 */
export const deriveFlowLayoutCapabilities = (
  definition: FlowLayoutDefinition,
  diagram: CanonicalFlowDiagram,
): ReadonlyArray<CapabilityEvidence> => {
  const evidence: Array<CapabilityEvidence> = [];
  const index = indexElementScopes(diagram);
  const scopeIds = [...index.elementsById].filter(([, element]) => element.type !== 'entity').map(([id]) => id);
  if (scopeIds.length > 0) pushEvidence(evidence, 'compoundScopes', scopeIds);

  const unorderedPairs = new Map<string, Readonly<{ count: number; relatedIds: ReadonlyArray<string> }>>();
  for (const relation of diagram.relations) {
    const relationEndpointIds = [relation.source.source, relation.source.target];
    const sourceScopes = index.scopes.get(relation.source.source) ?? [];
    const targetScopes = index.scopes.get(relation.source.target) ?? [];
    const sourceElement = index.elementsById.get(relation.source.source);
    const targetElement = index.elementsById.get(relation.source.target);
    if (sourceElement?.type === 'group' || targetElement?.type === 'group') {
      pushEvidence(evidence, 'groupEndpoints', relationEndpointIds);
    }
    const sourceOwner = sourceScopes.at(-1);
    const targetOwner = targetScopes.at(-1);
    if (sourceOwner !== targetOwner) {
      pushEvidence(evidence, 'crossScopeRelations', relationEndpointIds);
    }
    if (relation.source.source === relation.source.target) {
      pushEvidence(evidence, 'selfLoops', relationEndpointIds);
    }
    if (relation.source.label !== undefined) pushEvidence(evidence, 'relationLabels', relationEndpointIds);
    const direction = relation.graph.direction ?? 'forward';
    if (!definition.capabilities.relationDirections.includes(direction)) {
      pushEvidence(evidence, `direction:${direction}`, relationEndpointIds);
    }
    const scopeId = commonScope(sourceScopes, targetScopes);
    const scopeElement = scopeId === undefined ? undefined : index.elementsById.get(scopeId);
    const scopeRouting =
      scopeElement !== undefined && scopeElement.type !== 'entity'
        ? scopeElement.layout.routing
        : diagram.layout.routing;
    const routingKind = relation.layout.routing?.kind ?? scopeRouting?.kind ?? definition.defaults.routing.kind;
    if (!definition.capabilities.routingKinds.includes(routingKind)) {
      pushEvidence(evidence, `routing:${routingKind}`, relationEndpointIds);
    }
    const pair = [relation.source.source, relation.source.target].sort().join('\u0000');
    const pairRelations = unorderedPairs.get(pair);
    unorderedPairs.set(pair, { count: (pairRelations?.count ?? 0) + 1, relatedIds: relationEndpointIds });
  }

  const parallel = [...unorderedPairs.values()].find(item => item.count > 1);
  if (parallel !== undefined) pushEvidence(evidence, 'parallelRelations', parallel.relatedIds);
  if (hasDirectedCycle(diagram)) {
    pushEvidence(
      evidence,
      'cycles',
      diagram.relations
        .filter(relation => relation.graph.direction === 'forward' || relation.graph.direction === 'reverse')
        .flatMap(relation => [relation.source.source, relation.source.target]),
    );
  }
  return evidence;
};

/** 在 callback 前验证选中 Definition 覆盖全部实际能力 */
export const assertFlowLayoutCapabilities = (definition: FlowLayoutDefinition, diagram: CanonicalFlowDiagram): void => {
  const required = deriveFlowLayoutCapabilities(definition, diagram);
  const unsupported = required.filter(requirement => {
    const capability = requirement.name;
    if (capability.startsWith('direction:') || capability.startsWith('routing:')) return true;
    return !definition.capabilities[
      capability as keyof Omit<typeof definition.capabilities, 'relationDirections' | 'routingKinds'>
    ];
  });
  if (unsupported.length === 0) return;
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowLayoutCapabilityUnsupported,
    message: `Flow Layout '${definition.name}' does not support the required capabilities.`,
    details: {
      capability: 'flow-layout',
      definition: definition.name,
      missingCapabilities: unsupported.map(item => item.name),
      relatedIds: [...new Set(unsupported.flatMap(item => item.relatedIds))],
    },
  });
};
