import type { RelationRoleDefinition } from '../../contract';
import { defineRelationRole } from '../../contract';
import { RelationDirection } from '../../schemas';
import { RelationRole } from '../../shared';

const noMarker = false as const;

const solid = false as const;

/** 以菱形端标表现一般关联，支持无向、正向、反向与双向 */
export const AssociationRelationRoleDefinition = defineRelationRole({
  role: RelationRole.Association,
  description: '两个对象之间的一般关联',
  defaultDirection: RelationDirection.Forward,
  allowedDirections: [
    RelationDirection.None,
    RelationDirection.Forward,
    RelationDirection.Reverse,
    RelationDirection.Both,
  ],
  directions: {
    [RelationDirection.None]: { sourceMarker: noMarker, targetMarker: noMarker, dashPattern: solid },
    [RelationDirection.Forward]: {
      sourceMarker: noMarker,
      targetMarker: { shape: 'diamond' },
      dashPattern: solid,
    },
    [RelationDirection.Reverse]: {
      sourceMarker: { shape: 'diamond' },
      targetMarker: noMarker,
      dashPattern: solid,
    },
    [RelationDirection.Both]: {
      sourceMarker: { shape: 'diamond' },
      targetMarker: { shape: 'diamond' },
      dashPattern: solid,
    },
  },
});

/** 以正向直线箭头表现依赖方指向被依赖方的关系 */
export const DependencyRelationRoleDefinition = defineRelationRole({
  role: RelationRole.Dependency,
  description: '依赖方指向被依赖方的依赖关系',
  defaultDirection: RelationDirection.Forward,
  allowedDirections: [RelationDirection.Forward],
  directions: {
    [RelationDirection.Forward]: {
      sourceMarker: noMarker,
      targetMarker: { shape: 'straightBarb' },
      dashPattern: solid,
    },
  },
});

/** 以正向三角箭头表现子类型指向父类型的关系 */
export const GeneralizationRelationRoleDefinition = defineRelationRole({
  role: RelationRole.Generalization,
  description: '子类型指向父类型的泛化关系',
  defaultDirection: RelationDirection.Forward,
  allowedDirections: [RelationDirection.Forward],
  directions: {
    [RelationDirection.Forward]: {
      sourceMarker: noMarker,
      targetMarker: { shape: 'normal' },
      dashPattern: solid,
    },
  },
});

/** 以 stealth 箭头表现流动关系，支持正向、反向与双向 */
export const FlowRelationRoleDefinition = defineRelationRole({
  role: RelationRole.Flow,
  description: '对象、活动或状态之间的流动关系',
  defaultDirection: RelationDirection.Forward,
  allowedDirections: [RelationDirection.Forward, RelationDirection.Reverse, RelationDirection.Both],
  directions: {
    [RelationDirection.Forward]: {
      sourceMarker: noMarker,
      targetMarker: { shape: 'stealth' },
      dashPattern: solid,
    },
    [RelationDirection.Reverse]: {
      sourceMarker: { shape: 'stealth' },
      targetMarker: noMarker,
      dashPattern: solid,
    },
    [RelationDirection.Both]: {
      sourceMarker: { shape: 'stealth' },
      targetMarker: { shape: 'stealth' },
      dashPattern: solid,
    },
  },
});

/** 以圆形端标表现作用关系，支持正向、反向与双向 */
export const InfluenceRelationRoleDefinition = defineRelationRole({
  role: RelationRole.Influence,
  description: '一个对象对另一个对象产生作用的影响关系',
  defaultDirection: RelationDirection.Forward,
  allowedDirections: [RelationDirection.Forward, RelationDirection.Reverse, RelationDirection.Both],
  directions: {
    [RelationDirection.Forward]: {
      sourceMarker: noMarker,
      targetMarker: { shape: 'circle' },
      dashPattern: solid,
    },
    [RelationDirection.Reverse]: {
      sourceMarker: { shape: 'circle' },
      targetMarker: noMarker,
      dashPattern: solid,
    },
    [RelationDirection.Both]: {
      sourceMarker: { shape: 'circle' },
      targetMarker: { shape: 'circle' },
      dashPattern: solid,
    },
  },
});

/** 按固定顺序提供全部内置关系角色的方向约束及端标默认值 */
export const BUILTIN_RELATION_ROLE_DEFINITIONS: ReadonlyArray<RelationRoleDefinition> = Object.freeze([
  AssociationRelationRoleDefinition,
  DependencyRelationRoleDefinition,
  GeneralizationRelationRoleDefinition,
  FlowRelationRoleDefinition,
  InfluenceRelationRoleDefinition,
]);
