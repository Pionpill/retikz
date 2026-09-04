import type { IRGraphEntity, IRGraphRelation, IRGroup } from '@retikz/graph';

import {
  EntityRole,
  GraphType,
  RelationRole,
  resolveEntity,
  resolveGraphDefinitionOptions,
  resolveRelation,
} from '@retikz/graph';

import type { IRFlowDiagram, IRFlowEntity, IRFlowGroup, IRFlowLayout, IRFlowRelation } from '../../schemas';
import type {
  CanonicalFlowDiagram,
  CanonicalFlowElement,
  CanonicalFlowEntity,
  CanonicalFlowGroup,
  CanonicalFlowLayout,
  CanonicalFlowRelation,
  FlowResolveContext,
  FlowSourcePath,
} from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { mergeFlowLayoutIntent, mergeFlowTheme, resolveFlowTheme } from '../theme';

type FlowContainmentOwner = Readonly<{
  id?: string;
  path: FlowSourcePath;
}>;

type ResolveState = Readonly<{
  graph: ReturnType<typeof resolveGraphDefinitionOptions>;
  theme: ReturnType<typeof resolveFlowTheme>;
  ids: Map<string, FlowSourcePath>;
  entities: Map<string, IRFlowEntity>;
  groups: Map<string, IRFlowGroup>;
  layouts: Map<string, IRFlowLayout>;
  owners: Map<string, FlowContainmentOwner>;
  elementPaths: Map<string, FlowSourcePath>;
}>;

const registerId = (state: ResolveState, id: string, path: FlowSourcePath): void => {
  if (state.ids.has(id)) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.FlowDuplicateId,
      message: `Flow id '${id}' is duplicated.`,
      details: { path: [...path, 'id'], relatedIds: [id] },
    });
  }
  state.ids.set(id, path);
  state.elementPaths.set(id, path);
};

const registerCatalogs = (source: IRFlowDiagram, state: ResolveState): void => {
  source.entities.forEach((entity, entityIndex) => {
    const path: FlowSourcePath = ['entities', entityIndex];
    registerId(state, entity.id, path);
    state.entities.set(entity.id, entity);
  });
  source.groups.forEach((group, groupIndex) => {
    const path: FlowSourcePath = ['groups', groupIndex];
    registerId(state, group.id, path);
    state.groups.set(group.id, group);
  });
  source.layouts.forEach((layout, layoutIndex) => {
    const path: FlowSourcePath = ['layouts', layoutIndex];
    registerId(state, layout.id, path);
    state.layouts.set(layout.id, layout);
  });
};

const containmentFailure = (
  message: string,
  path: FlowSourcePath,
  id: string,
  reason: 'duplicate-child' | 'multiple-parents' | 'orphan' | 'self-containment' | 'cycle',
): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowContainmentInvalid,
    message,
    details: { path, relatedIds: [id], reason },
  });
};

const registerChildren = (
  state: ResolveState,
  children: ReadonlyArray<string>,
  path: FlowSourcePath,
  ownerId?: string,
): void => {
  children.forEach((childId, childIndex) => {
    const childPath: FlowSourcePath = [...path, childIndex];
    if (!state.ids.has(childId)) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.FlowReferenceNotFound,
        message: `Flow child '${childId}' is not declared in entities, groups or layouts.`,
        details: { path: childPath, relatedIds: [childId] },
      });
    }
    if (ownerId === childId) {
      return containmentFailure(
        `Flow scope '${ownerId}' cannot contain itself.`,
        childPath,
        childId,
        'self-containment',
      );
    }
    const previousOwner = state.owners.get(childId);
    if (previousOwner !== undefined) {
      const reason = previousOwner.id === ownerId ? 'duplicate-child' : 'multiple-parents';
      return containmentFailure(
        reason === 'duplicate-child'
          ? `Flow child '${childId}' is duplicated in one children list.`
          : `Flow child '${childId}' belongs to more than one owner.`,
        childPath,
        childId,
        reason,
      );
    }
    state.owners.set(childId, { ...(ownerId === undefined ? {} : { id: ownerId }), path: childPath });
  });
};

const assertAcyclicScopes = (source: IRFlowDiagram, state: ResolveState): void => {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const scopes = [...source.groups, ...source.layouts];
  const visitScope = (scope: IRFlowGroup | IRFlowLayout): void => {
    if (visited.has(scope.id)) return;
    visiting.add(scope.id);
    const isGroup = state.groups.has(scope.id);
    const scopeIndex = isGroup ? source.groups.indexOf(scope) : source.layouts.indexOf(scope as IRFlowLayout);
    scope.children.forEach((childId, childIndex) => {
      const childScope = state.groups.get(childId) ?? state.layouts.get(childId);
      if (childScope === undefined) return;
      if (visiting.has(childId)) {
        return containmentFailure(
          `Flow containment contains a cycle through '${childId}'.`,
          [isGroup ? 'groups' : 'layouts', scopeIndex, 'children', childIndex],
          childId,
          'cycle',
        );
      }
      visitScope(childScope);
    });
    visiting.delete(scope.id);
    visited.add(scope.id);
  };
  scopes.forEach(visitScope);
};

const assertCompleteContainment = (source: IRFlowDiagram, state: ResolveState): void => {
  registerChildren(state, source.children, ['children']);
  source.groups.forEach((group, groupIndex) => {
    registerChildren(state, group.children, ['groups', groupIndex, 'children'], group.id);
  });
  source.layouts.forEach((layout, layoutIndex) => {
    registerChildren(state, layout.children, ['layouts', layoutIndex, 'children'], layout.id);
  });
  assertAcyclicScopes(source, state);
  for (const [id, path] of state.ids) {
    if (!state.owners.has(id)) {
      containmentFailure(
        `Flow declaration '${id}' is not contained by the root or another Flow scope.`,
        path,
        id,
        'orphan',
      );
    }
  }
};

const mergeEntityStyle = (state: ResolveState, source: IRFlowEntity) => ({
  ...state.theme.entity?.style,
  ...source.style,
  font: { ...state.theme.entity?.style?.font, ...source.style?.font },
});

const resolveEntityRecord = (source: IRFlowEntity, path: FlowSourcePath, state: ResolveState): CanonicalFlowEntity => {
  const style = mergeEntityStyle(state, source);
  const layout = { ...state.theme.entity?.layout, ...source.layout };
  const graph: IRGraphEntity = {
    namespace: 'graph',
    type: GraphType.Entity,
    id: source.id,
    text: source.text,
    role: source.role ?? EntityRole.Concept,
    ...(source.kind === undefined ? {} : { kind: source.kind }),
    ...(source.status === undefined ? {} : { status: source.status }),
    ...style,
    ...layout,
  };
  resolveEntity(graph, state.graph);
  return {
    type: 'entity',
    id: source.id,
    source,
    graph,
    ...(source.rank === undefined ? {} : { rank: source.rank }),
    style,
    layout,
    path,
  };
};

const resolveElementRecord = (id: string, state: ResolveState): CanonicalFlowElement => {
  const entity = state.entities.get(id);
  const path = state.elementPaths.get(id)!;
  if (entity !== undefined) return resolveEntityRecord(entity, path, state);

  const layoutSource = state.layouts.get(id);
  if (layoutSource !== undefined) {
    const layout: CanonicalFlowLayout = {
      type: 'layout',
      id: layoutSource.id,
      source: layoutSource,
      ...(layoutSource.rank === undefined ? {} : { rank: layoutSource.rank }),
      layout: mergeFlowLayoutIntent(state.theme.layout, {
        direction: layoutSource.direction,
        ...(layoutSource.gap === undefined ? {} : { nodeGap: layoutSource.gap }),
      }),
      elements: layoutSource.children.map(childId => resolveElementRecord(childId, state)),
      path,
    };
    return layout;
  }

  const source = state.groups.get(id)!;
  const layout = mergeFlowLayoutIntent(state.theme.layout, source.layout);
  const elements = source.children.map(childId => resolveElementRecord(childId, state));
  const style =
    mergeFlowTheme({ group: { style: state.theme.group?.style } }, { group: { style: source.style } }).group?.style ??
    {};
  const { label: labelStyle, ...surface } = style;
  const graph: IRGroup = {
    namespace: 'graph',
    type: GraphType.Group,
    id: source.id,
    ...surface,
    ...(source.label === undefined ? {} : { caption: { title: { text: source.label, ...labelStyle } } }),
    children: [],
  };
  const group: CanonicalFlowGroup = {
    type: 'group',
    id: source.id,
    source,
    graph,
    ...(source.rank === undefined ? {} : { rank: source.rank }),
    style,
    layout,
    elements,
    path,
  };
  return group;
};

const resolveRelationRecord = (source: IRFlowRelation, index: number, state: ResolveState): CanonicalFlowRelation => {
  const path: FlowSourcePath = ['relations', index];
  for (const endpoint of ['source', 'target'] as const) {
    const id = source[endpoint];
    if (!state.ids.has(id)) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.FlowReferenceNotFound,
        message: `Flow Relation at relations[${index}] ${endpoint} references unknown element '${id}'.`,
        details: { path: [...path, endpoint], relatedIds: [id] },
      });
    }
    if (state.layouts.has(id)) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.FlowEndpointInvalid,
        message: `Flow Relation at relations[${index}] ${endpoint} cannot reference Layout '${id}'.`,
        details: {
          path: [...path, endpoint],
          relatedIds: [id],
          reason: 'layout-endpoint',
        },
      });
    }
  }
  const style =
    mergeFlowTheme({ relation: { style: state.theme.relation?.style } }, { relation: { style: source.style } }).relation
      ?.style ?? {};
  const layout = mergeFlowLayoutIntent(state.theme.relation?.layout, source.layout);
  const graphSource: IRGraphRelation = {
    namespace: 'graph',
    type: GraphType.Relation,
    source: { id: source.source },
    target: { id: source.target },
    role: source.role ?? RelationRole.Flow,
    ...(source.kind === undefined ? {} : { kind: source.kind }),
    ...(source.status === undefined ? {} : { status: source.status }),
    ...(source.direction === undefined ? {} : { direction: source.direction }),
    ...style,
  };
  const canonicalGraph = resolveRelation(graphSource, state.graph);
  const graph: IRGraphRelation = { ...graphSource, direction: canonicalGraph.effectiveDirection };
  return { source, graph, style, layout, path };
};

/** 把 Flow Source 与 definitions 确定为唯一 Canonical Flow */
export const resolveFlowDiagram = (source: IRFlowDiagram, context: FlowResolveContext): CanonicalFlowDiagram => {
  const state: ResolveState = {
    graph: resolveGraphDefinitionOptions(context.graph),
    theme: resolveFlowTheme(context.theme, context.flowThemeStyles, source.flowThemeTokens, source.flowTheme),
    ids: new Map(),
    entities: new Map(),
    groups: new Map(),
    layouts: new Map(),
    owners: new Map(),
    elementPaths: new Map(),
  };
  registerCatalogs(source, state);
  assertCompleteContainment(source, state);
  const elements = source.children.map(id => resolveElementRecord(id, state));
  const relations = (source.relations ?? []).map((relation, index) => resolveRelationRecord(relation, index, state));
  return {
    source,
    layout: state.theme.layout ?? {},
    elements,
    relations,
    elementPaths: state.elementPaths,
  };
};
