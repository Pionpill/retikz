import type { FlowDiagramDefinitionOptions } from '@retikz/diagram/flow';
import type {
  FlowDiagramInputEmbedProps,
  InputFlowDiagram,
  InputFlowEntity,
  InputFlowGroup,
  InputFlowLayout,
  InputFlowRelation,
} from '@retikz/diagram-vanilla/flow';
import type { LayoutProps, ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactElement, ReactNode } from 'react';

import { Children, Fragment, isValidElement } from 'react';

import type { FlowEntitiesProps, FlowEntityItem } from './FlowEntities';
import type { FlowRelationItem, FlowRelationsProps } from './FlowRelations';

import { RetikzDiagramReactFlowError, RetikzDiagramReactFlowErrorCode } from './errors';

/** Flow standalone 模式承接的完整 Layout 宿主属性 */
export type FlowDiagramLayoutHostProps = Pick<
  LayoutProps,
  | 'authoring'
  | 'compileDriver'
  | 'handlers'
  | 'runtime'
  | 'width'
  | 'height'
  | 'viewBox'
  | 'className'
  | 'style'
  | 'renderer'
  | 'animate'
  | 'snapshotAt'
  | 'animationRef'
  | 'easings'
  | 'animationProperties'
  | 'idPrefix'
  | 'nodeDistance'
  | 'fontSize'
  | 'shapes'
  | 'boundaries'
  | 'clips'
  | 'arrows'
  | 'patterns'
  | 'pathGenerators'
  | 'pathKinds'
  | 'composites'
  | 'themeStyles'
  | 'lowerTex'
  | 'artifacts'
  | 'onArtifacts'
  | 'onCompileResult'
>;

/** Flow standalone-only Layout props 的完整字段表 */
export const flowDiagramLayoutHostPropKeys = [
  'authoring',
  'compileDriver',
  'handlers',
  'runtime',
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'renderer',
  'animate',
  'snapshotAt',
  'animationRef',
  'easings',
  'animationProperties',
  'idPrefix',
  'nodeDistance',
  'fontSize',
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'composites',
  'themeStyles',
  'lowerTex',
  'artifacts',
  'onArtifacts',
  'onCompileResult',
] as const satisfies ReadonlyArray<keyof FlowDiagramLayoutHostProps>;

type AssertEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;

type FlowDiagramLayoutHostPropKeysCheck = AssertEqual<
  (typeof flowDiagramLayoutHostPropKeys)[number],
  keyof FlowDiagramLayoutHostProps
>;

const flowDiagramLayoutHostPropKeysCheck: FlowDiagramLayoutHostPropKeysCheck = true;
void flowDiagramLayoutHostPropKeysCheck;

/** 按 own-property 语义提取 Flow standalone Layout 宿主属性 */
export const flowDiagramLayoutHostPropsOf = (props: FlowDiagramLayoutHostProps): FlowDiagramLayoutHostProps => {
  const output: FlowDiagramLayoutHostProps = {};
  for (const key of flowDiagramLayoutHostPropKeys) {
    if (Object.hasOwn(props, key)) Object.assign(output, { [key]: props[key] });
  }
  return output;
};

/** Flow JSX marker 的稳定语义类别 */
export type FlowMarkerKind = 'entity' | 'entities' | 'group' | 'layout' | 'relation' | 'relations';

/** 只参与 FlowDiagram authoring 收集的 JSX marker */
export type FlowMarkerComponent<TProps> = FC<TProps> & { flowMarkerKind: FlowMarkerKind };

type FlowGroupMarkerProps<TGroup extends InputFlowGroup = InputFlowGroup> = TGroup extends InputFlowGroup
  ? Omit<TGroup, 'children'>
  : never;

type FlowLayoutMarkerProps<TLayout extends InputFlowLayout = InputFlowLayout> = TLayout extends InputFlowLayout
  ? Omit<TLayout, 'children'>
  : never;

const markerKindOf = (element: ReactElement): FlowMarkerKind | undefined => {
  if (typeof element.type !== 'function') return undefined;
  return (element.type as Partial<FlowMarkerComponent<unknown>>).flowMarkerKind;
};

const childLabelOf = (child: ReactNode): string => {
  if (!isValidElement(child)) return typeof child;
  if (typeof child.type === 'string') return child.type;
  if (typeof child.type === 'function') {
    const component = child.type as { displayName?: string; name?: string };
    return component.displayName ?? component.name ?? 'anonymous';
  }
  return 'unknown';
};

const invalidChild = (label: string, child: ReactNode, reason: string): never => {
  const received = childLabelOf(child);
  throw new RetikzDiagramReactFlowError({
    code: RetikzDiagramReactFlowErrorCode.ChildInvalid,
    message: `${label} received unsupported child '${received}'.`,
    details: { label, reason, received: [received] },
  });
};

/** 当前 owner 下同类单项与批量 marker 的完整清单约束状态 */
type FlowCollectionMarkerState = {
  hasDeclaration: boolean;
  hasCompleteDeclaration: boolean;
};

/** 登记同类 marker，并拒绝完整清单与其它声明共存 */
const registerFlowCollectionMarker = (
  state: FlowCollectionMarkerState,
  isComplete: boolean,
  label: string,
  child: ReactNode,
  reason: 'complete-entities-conflict' | 'complete-relations-conflict',
): void => {
  if (state.hasCompleteDeclaration || (isComplete && state.hasDeclaration)) invalidChild(label, child, reason);
  state.hasDeclaration = true;
  if (isComplete) state.hasCompleteDeclaration = true;
};

/** 判断批量 Relation 单项是否为 endpoint tuple */
const isFlowRelationTuple = (relationItem: FlowRelationItem): relationItem is readonly [string, string] =>
  Array.isArray(relationItem);

/** 将批量 Entity 单项投影为现有 Vanilla Input */
const flowEntityInputOf = (entityItem: FlowEntityItem): InputFlowEntity =>
  typeof entityItem === 'string' ? { id: entityItem, text: entityItem } : entityItem;

/** 将批量 Relation 单项投影为现有 Vanilla Input */
const flowRelationInputOf = (relationItem: FlowRelationItem): InputFlowRelation =>
  isFlowRelationTuple(relationItem) ? { source: relationItem[0], target: relationItem[1] } : relationItem;

const collectFlowElements = (
  children: ReactNode,
  label: string,
  allowRelations: boolean,
): Readonly<{
  entities: Array<InputFlowEntity>;
  groups: Array<InputFlowGroup>;
  layouts: Array<InputFlowLayout>;
  children: Array<string>;
  relations: Array<InputFlowRelation>;
}> => {
  const entities: Array<InputFlowEntity> = [];
  const groups: Array<InputFlowGroup> = [];
  const layouts: Array<InputFlowLayout> = [];
  const childIds: Array<string> = [];
  const relations: Array<InputFlowRelation> = [];
  const entityMarkerState: FlowCollectionMarkerState = {
    hasDeclaration: false,
    hasCompleteDeclaration: false,
  };
  const relationMarkerState: FlowCollectionMarkerState = {
    hasDeclaration: false,
    hasCompleteDeclaration: false,
  };
  const visit = (nodes: ReactNode): void => {
    Children.forEach(nodes, child => {
      if (child === null || child === undefined || typeof child === 'boolean') return;
      if (!isValidElement(child)) return invalidChild(label, child, 'non-element-child');
      if (child.type === Fragment) {
        visit((child.props as Readonly<{ children?: ReactNode }>).children);
        return;
      }
      const markerKind = markerKindOf(child);
      if (markerKind === 'entity') {
        registerFlowCollectionMarker(entityMarkerState, false, label, child, 'complete-entities-conflict');
        const entity = child.props as InputFlowEntity;
        entities.push(entity);
        childIds.push(entity.id);
        return;
      }
      if (markerKind === 'entities') {
        const { items, complete = false } = child.props as FlowEntitiesProps;
        registerFlowCollectionMarker(entityMarkerState, complete, label, child, 'complete-entities-conflict');
        for (const entityItem of items) {
          const entity = flowEntityInputOf(entityItem);
          entities.push(entity);
          childIds.push(entity.id);
        }
        return;
      }
      if (markerKind === 'group') {
        const { children: groupChildren, ...group } = child.props as FlowGroupMarkerProps &
          Readonly<{ children?: ReactNode }>;
        const collected = collectFlowElements(groupChildren, 'FlowGroup', false);
        groups.push({ ...group, children: collected.children }, ...collected.groups);
        layouts.push(...collected.layouts);
        entities.push(...collected.entities);
        childIds.push(group.id);
        return;
      }
      if (markerKind === 'layout') {
        const { children: layoutChildren, ...layout } = child.props as FlowLayoutMarkerProps &
          Readonly<{ children?: ReactNode }>;
        const collected = collectFlowElements(layoutChildren, 'FlowLayout', false);
        layouts.push({ ...layout, children: collected.children }, ...collected.layouts);
        groups.push(...collected.groups);
        entities.push(...collected.entities);
        childIds.push(layout.id);
        return;
      }
      if (markerKind === 'relation') {
        if (!allowRelations) invalidChild(label, child, 'relation-outside-root');
        registerFlowCollectionMarker(relationMarkerState, false, label, child, 'complete-relations-conflict');
        relations.push(child.props as InputFlowRelation);
        return;
      }
      if (markerKind === 'relations') {
        if (!allowRelations) invalidChild(label, child, 'relation-outside-root');
        const { items, complete = false } = child.props as FlowRelationsProps;
        registerFlowCollectionMarker(relationMarkerState, complete, label, child, 'complete-relations-conflict');
        relations.push(...items.map(flowRelationInputOf));
        return;
      }
      invalidChild(label, child, 'unknown-flow-marker');
    });
  };
  visit(children);
  return { entities, groups, layouts, children: childIds, relations };
};

/** FlowDiagram React 编写参数 */
export type FlowDiagramProps = Omit<InputFlowDiagram, 'entities' | 'groups' | 'layouts' | 'children' | 'relations'> &
  FlowDiagramDefinitionOptions &
  FlowDiagramLayoutHostProps &
  Readonly<{
    /** 根级 Flow Entity、Group、Layout 与 Relation markers */
    children?: ReactNode;
  }>;

/** 将 FlowDiagram JSX props 收集为唯一 Vanilla Input */
export const collectFlowDiagramInput = (
  props: FlowDiagramProps,
  rejectHostProps: boolean,
): FlowDiagramInputEmbedProps => {
  const unsupported = flowDiagramLayoutHostPropKeys.filter(key => Object.hasOwn(props, key));
  if (rejectHostProps && unsupported.length > 0) {
    throw new RetikzDiagramReactFlowError({
      code: RetikzDiagramReactFlowErrorCode.HostPropsInvalid,
      message: `embedded FlowDiagram does not support standalone Layout props: ${unsupported.join(', ')}; move them to the outer <Layout>`,
      details: { label: 'FlowDiagram', reason: 'standalone-host-props-in-embedded-mode', received: unsupported },
    });
  }

  const {
    children,
    authoring: _authoring,
    compileDriver: _compileDriver,
    handlers: _handlers,
    runtime: _runtime,
    width: _width,
    height: _height,
    viewBox: _viewBox,
    className: _className,
    style: _style,
    renderer: _renderer,
    animate: _animate,
    snapshotAt: _snapshotAt,
    animationRef: _animationRef,
    easings: _easings,
    animationProperties: _animationProperties,
    idPrefix: _idPrefix,
    nodeDistance: _nodeDistance,
    fontSize: _fontSize,
    shapes: _shapes,
    boundaries: _boundaries,
    clips: _clips,
    arrows: _arrows,
    patterns: _patterns,
    pathGenerators: _pathGenerators,
    pathKinds: _pathKinds,
    composites: _composites,
    themeStyles: _themeStyles,
    lowerTex: _lowerTex,
    artifacts: _artifacts,
    onArtifacts: _onArtifacts,
    onCompileResult: _onCompileResult,
    ...input
  } = props;
  void _authoring;
  void _compileDriver;
  void _handlers;
  void _runtime;
  void _width;
  void _height;
  void _viewBox;
  void _className;
  void _style;
  void _renderer;
  void _animate;
  void _snapshotAt;
  void _animationRef;
  void _easings;
  void _animationProperties;
  void _idPrefix;
  void _nodeDistance;
  void _fontSize;
  void _shapes;
  void _boundaries;
  void _clips;
  void _arrows;
  void _patterns;
  void _pathGenerators;
  void _pathKinds;
  void _composites;
  void _themeStyles;
  void _lowerTex;
  void _artifacts;
  void _onArtifacts;
  void _onCompileResult;

  const collected = collectFlowElements(children, 'FlowDiagram', true);
  return {
    ...input,
    entities: collected.entities,
    groups: collected.groups,
    layouts: collected.layouts,
    children: collected.children,
    ...(collected.relations.length === 0 ? {} : { relations: collected.relations }),
  };
};

/** 将 public FlowDiagram props 转为外层 Layout 可消费的 embed props */
export const createFlowDiagramInput = (
  props: Readonly<Record<string, unknown>>,
  _context: ReactInputEmbedContext,
): FlowDiagramInputEmbedProps => {
  void _context;
  return collectFlowDiagramInput(props, true);
};
