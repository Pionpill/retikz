import type { IRChild } from '@retikz/core';
import type { IRGraph, IRGraphEntity, IRGraphRelation, IRGroup } from '@retikz/graph';

import {
  EntityRole,
  GraphType,
  mergeGraphDefaults,
  projectEntityGraphLayers,
  projectRelationGraphLayers,
  RelationRole,
  resolveEntity,
  resolveGraph,
  resolveGraphDefinitionOptions,
  resolveRelation,
} from '@retikz/graph';

import type {
  IRFlowDefaults,
  IRFlowDiagram,
  IRFlowEntity,
  IRFlowGroup,
  IRFlowLayout,
  IRFlowRelation,
} from '../../schemas';
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
import { mergeFlowDefaults, mergeFlowLayoutIntent, resolveFlowTheme } from '../theme';

type FlowContainmentOwner = Readonly<{
  id?: string;
  path: FlowSourcePath;
}>;

type ResolveState = Readonly<{
  graph: ReturnType<typeof resolveGraphDefinitionOptions>;
  graphLayers: ReadonlyArray<Readonly<{ rules?: IRFlowDiagram['graphRules'] }>>;
  defaults: IRFlowDefaults;
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

const definedFields = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;

const entityDefaultsOf = (defaults: IRFlowDefaults['entity'], source: IRFlowEntity) => {
  const sourceOverride =
    source.style === undefined && source.layout === undefined
      ? undefined
      : {
          entity: {
            ...(source.style === undefined ? {} : { style: source.style }),
            ...(source.layout === undefined ? {} : { layout: source.layout }),
          },
        };
  return mergeGraphDefaults(defaults === undefined ? undefined : { entity: defaults }, sourceOverride)?.entity;
};

const resolveEntityRecord = (source: IRFlowEntity, path: FlowSourcePath, state: ResolveState): CanonicalFlowEntity => {
  const defaults = entityDefaultsOf(state.defaults.entity, source);
  const style = defaults?.style ?? {};
  const layout = defaults?.layout ?? {};
  const graph: IRGraphEntity = {
    namespace: 'graph',
    type: GraphType.Entity,
    id: source.id,
    text: source.text,
    role: source.role ?? EntityRole.Concept,
    ...(source.kind === undefined ? {} : { kind: source.kind }),
    ...(source.group === undefined ? {} : { group: source.group }),
    ...(source.status === undefined ? {} : { status: source.status }),
    ...(Object.keys(style).length === 0 ? {} : { style }),
    ...(Object.keys(layout).length === 0 ? {} : { layout }),
  };
  const projectedGraph = projectEntityGraphLayers(resolveEntity(graph, state.graph), {
    ...state.graph,
    layers: state.graphLayers,
  });
  return {
    type: 'entity',
    id: source.id,
    source,
    graph: projectedGraph,
    ...(source.rank === undefined ? {} : { rank: source.rank }),
    style,
    layout,
    path,
  };
};

const groupDefaultsOverrideOf = (source: IRFlowGroup): IRFlowDefaults => {
  const title = source.caption?.title;
  const caption =
    title === undefined
      ? undefined
      : (() => {
          const { text: _text, ...formatting } = title;
          void _text;
          return { title: formatting };
        })();
  return {
    group: {
      ...(source.padding === undefined ? {} : { padding: source.padding }),
      ...(source.background === undefined ? {} : { background: source.background }),
      ...(source.border === undefined ? {} : { border: source.border }),
      ...(source.cornerRadius === undefined ? {} : { cornerRadius: source.cornerRadius }),
      ...(caption === undefined ? {} : { caption }),
    },
  };
};

const resolveGroupRecord = (source: IRFlowGroup, path: FlowSourcePath, state: ResolveState): CanonicalFlowGroup => {
  const groupDefaults = mergeFlowDefaults(state.defaults, groupDefaultsOverrideOf(source)).group ?? {};
  const sourceCaption = source.caption?.title;
  const titleDefaults = groupDefaults.caption?.title;
  const caption =
    sourceCaption === undefined
      ? undefined
      : {
          title: {
            text: sourceCaption.text,
            ...definedFields(titleDefaults ?? {}),
          },
        };
  const { caption: _caption, ...groupSurface } = groupDefaults;
  void _caption;
  const surface = {
    ...definedFields(groupSurface),
    ...(source.overflow === undefined ? {} : { overflow: source.overflow }),
  };
  const graph: IRGroup = {
    namespace: 'graph',
    type: GraphType.Group,
    id: source.id,
    ...surface,
    ...(caption === undefined ? {} : { caption }),
    children: [],
  };
  const layout = mergeFlowLayoutIntent(undefined, source.layout);
  const elements = source.children.map(childId => resolveElementRecord(childId, state));
  return {
    type: 'group',
    id: source.id,
    source,
    graph,
    ...(source.rank === undefined ? {} : { rank: source.rank }),
    layout,
    ...(source.routing === undefined ? {} : { routing: source.routing }),
    elements,
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
      layout: mergeFlowLayoutIntent(undefined, {
        direction: layoutSource.direction,
        ...(layoutSource.gap === undefined ? {} : { nodeGap: layoutSource.gap }),
      }),
      elements: layoutSource.children.map(childId => resolveElementRecord(childId, state)),
      path,
    };
    return layout;
  }

  return resolveGroupRecord(state.groups.get(id)!, path, state);
};

const relationDefaultsOf = (defaults: IRFlowDefaults['relation'], source: IRFlowRelation) => {
  const sourceOverride = {
    relation: {
      ...(source.style === undefined ? {} : { style: source.style }),
      ...(source.sourceMarker === undefined ? {} : { sourceMarker: source.sourceMarker }),
      ...(source.targetMarker === undefined ? {} : { targetMarker: source.targetMarker }),
      ...(source.labelTextForeground === undefined ? {} : { labelTextForeground: source.labelTextForeground }),
      ...(source.labelFont === undefined ? {} : { labelFont: source.labelFont }),
      ...(source.labelOpacity === undefined ? {} : { labelOpacity: source.labelOpacity }),
    },
  };
  return mergeGraphDefaults(defaults === undefined ? undefined : { relation: defaults }, sourceOverride)?.relation;
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
        details: { path: [...path, endpoint], relatedIds: [id], reason: 'layout-endpoint' },
      });
    }
  }
  const defaults = relationDefaultsOf(state.defaults.relation, source);
  const graph: IRGraphRelation = {
    namespace: 'graph',
    type: GraphType.Relation,
    source: { id: source.source },
    target: { id: source.target },
    role: source.role ?? RelationRole.Flow,
    ...(source.kind === undefined ? {} : { kind: source.kind }),
    ...(source.status === undefined ? {} : { status: source.status }),
    ...(source.direction === undefined ? {} : { direction: source.direction }),
    ...(source.group === undefined ? {} : { group: source.group }),
    ...(source.label === undefined ? {} : { labels: [{ text: source.label }] }),
    ...(defaults?.style === undefined ? {} : { style: defaults.style }),
    ...(defaults?.sourceMarker === undefined ? {} : { sourceMarker: defaults.sourceMarker }),
    ...(defaults?.targetMarker === undefined ? {} : { targetMarker: defaults.targetMarker }),
    ...(defaults?.labelTextForeground === undefined ? {} : { labelTextForeground: defaults.labelTextForeground }),
    ...(defaults?.labelFont === undefined ? {} : { labelFont: defaults.labelFont }),
    ...(defaults?.labelOpacity === undefined ? {} : { labelOpacity: defaults.labelOpacity }),
  };
  const canonical = resolveRelation(graph, state.graph);
  const projectedGraph = projectRelationGraphLayers(canonical, {
    ...state.graph,
    layers: state.graphLayers,
  });
  return {
    source,
    graph: { ...projectedGraph, direction: canonical.effectiveDirection },
    ...(source.routing === undefined ? {} : { routing: source.routing }),
    path,
  };
};

const isGraphRelation = (child: IRChild): child is IRGraphRelation =>
  'namespace' in child && child.namespace === 'graph' && child.type === GraphType.Relation;

const isGraphEntity = (child: IRChild): child is IRGraphEntity =>
  'namespace' in child && child.namespace === 'graph' && child.type === GraphType.Entity;

const projectFlowElementGroupColors = (
  elements: ReadonlyArray<CanonicalFlowElement>,
  graphByEntityId: ReadonlyMap<string, IRGraphEntity>,
): Array<CanonicalFlowElement> =>
  elements.map(element => {
    if (element.type === 'entity') return { ...element, graph: graphByEntityId.get(element.id)! };
    return { ...element, elements: projectFlowElementGroupColors(element.elements, graphByEntityId) };
  });

/** 通过 Graph root 的唯一投影为 Flow Entity 与 Relation 应用自动分组颜色 */
const projectFlowGroups = (
  elements: ReadonlyArray<CanonicalFlowElement>,
  relations: ReadonlyArray<CanonicalFlowRelation>,
  state: ResolveState,
  theme: FlowResolveContext['theme'],
): Readonly<{ elements: Array<CanonicalFlowElement>; relations: Array<CanonicalFlowRelation> }> => {
  const entities: Array<CanonicalFlowEntity> = [];
  const collectEntities = (candidates: ReadonlyArray<CanonicalFlowElement>): void => {
    candidates.forEach(candidate => {
      if (candidate.type === 'entity') {
        entities.push(candidate);
        return;
      }
      collectEntities(candidate.elements);
    });
  };
  collectEntities(elements);
  const graph: IRGraph = {
    namespace: 'graph',
    type: GraphType.Graph,
    children: [...entities.map(entity => entity.graph), ...relations.map(relation => relation.graph)],
  };
  const projected = resolveGraph(graph, state.graph, theme);
  const graphByEntityId = new Map(projected.filter(isGraphEntity).map(entity => [entity.id!, entity] as const));
  const projectedRelations = projected.filter(isGraphRelation);
  return {
    elements: projectFlowElementGroupColors(elements, graphByEntityId),
    relations: relations.map((relation, relationIndex) => ({
      ...relation,
      graph: projectedRelations[relationIndex],
    })),
  };
};

/** 把 Flow Source 与 definitions 确定为唯一 Canonical Flow */
export const resolveFlowDiagram = (source: IRFlowDiagram, context: FlowResolveContext): CanonicalFlowDiagram => {
  const defaults = resolveFlowTheme(context.theme, context.flowThemeStyles, source.flowDefaults);
  const state: ResolveState = {
    graph: resolveGraphDefinitionOptions(context.graph),
    graphLayers: source.graphRules === undefined ? [] : [{ rules: source.graphRules }],
    defaults,
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
  const groups = projectFlowGroups(
    elements,
    (source.relations ?? []).map((relation, index) => resolveRelationRecord(relation, index, state)),
    state,
    context.theme,
  );
  return {
    source,
    defaults,
    layout: mergeFlowLayoutIntent(defaults.layout, source.layout),
    ...(source.routing === undefined ? {} : { routing: source.routing }),
    elements: groups.elements,
    relations: groups.relations,
    elementPaths: state.elementPaths,
  };
};
