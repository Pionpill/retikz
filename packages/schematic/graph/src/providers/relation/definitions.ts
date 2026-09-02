import type { RelationKindDefinition, RelationRoleDefinition } from '../../contract';

import { defineRelationKind, defineRelationRole } from '../../contract';
import { RelationDirection } from '../../schemas';
import { RelationKind, RelationRole } from '../../shared';

const noMarker = false as const;
const solid = false as const;

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

export const UmlAggregationRelationKindDefinition = defineRelationKind({
  kind: RelationKind.UmlAggregation,
  role: RelationRole.Association,
  description: '整体端为空心菱形的 UML 聚合关系',
  defaultDirection: RelationDirection.None,
  allowedDirections: [RelationDirection.None],
  directions: {
    [RelationDirection.None]: {
      sourceMarker: { shape: 'openDiamond' },
      targetMarker: noMarker,
      dashPattern: solid,
    },
  },
});

export const UmlCompositionRelationKindDefinition = defineRelationKind({
  kind: RelationKind.UmlComposition,
  role: RelationRole.Association,
  description: '整体端为实心菱形的 UML 组合关系',
  defaultDirection: RelationDirection.None,
  allowedDirections: [RelationDirection.None],
  directions: {
    [RelationDirection.None]: {
      sourceMarker: { shape: 'diamond' },
      targetMarker: noMarker,
      dashPattern: solid,
    },
  },
});

export const UmlRealizationRelationKindDefinition = defineRelationKind({
  kind: RelationKind.UmlRealization,
  role: RelationRole.Generalization,
  description: '实现端指向规范端的 UML 实现关系',
  directions: {
    [RelationDirection.Forward]: { targetMarker: { shape: 'open' } },
  },
});

export const ProvenanceDerivationRelationKindDefinition = defineRelationKind({
  kind: RelationKind.ProvenanceDerivation,
  role: RelationRole.Dependency,
  description: '派生结果指向来源记录的 Provenance 关系',
  directions: {
    [RelationDirection.Forward]: { targetMarker: { shape: 'openStealth' } },
  },
});

export const BUILTIN_RELATION_ROLE_DEFINITIONS: ReadonlyArray<RelationRoleDefinition> = Object.freeze([
  AssociationRelationRoleDefinition,
  DependencyRelationRoleDefinition,
  GeneralizationRelationRoleDefinition,
  FlowRelationRoleDefinition,
  InfluenceRelationRoleDefinition,
]);

export const BUILTIN_RELATION_KIND_DEFINITIONS: ReadonlyArray<RelationKindDefinition> = Object.freeze([
  UmlAggregationRelationKindDefinition,
  UmlCompositionRelationKindDefinition,
  UmlRealizationRelationKindDefinition,
  ProvenanceDerivationRelationKindDefinition,
]);
