import type { EntityRoleDefinition } from '../../contract';
import { defineEntityRole } from '../../contract';
import { EntityRole } from '../../shared';

/** 以六边形表现主动参与、负责或提供能力的主体 */
export const ParticipantEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Participant,
  description: '主动参与、负责或提供能力的主体',
  shape: { type: 'hexagon' },
  padding: { x: 0, y: 8 },
  minimumSize: { width: 72, height: 36 },
});

/** 以圆角矩形表现工作、动作或转换过程 */
export const ActivityEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Activity,
  description: '发生的工作、动作或转换过程',
  shape: 'rectangle',
  cornerRadius: 6,
  padding: 8,
});

/** 以圆形表现发生点、边界或生命周期事件 */
export const EventEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Event,
  description: '发生点、边界或生命周期事件',
  shape: 'circle',
  padding: 6,
  minimumSize: { width: 32, height: 32 },
});

/** 以胶囊状矩形表现对象或系统持续存在的条件 */
export const StateEntityRoleDefinition = defineEntityRole({
  role: EntityRole.State,
  description: '对象或系统持续存在的条件',
  shape: 'rectangle',
  cornerRadius: 999,
  padding: { x: 12, y: 8 },
  minimumSize: { width: 56, height: 28 },
});

/** 以菱形表现控制分叉、汇合或同步 */
export const GatewayEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Gateway,
  description: '具有语义的控制分叉、汇合或同步',
  shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
  padding: { x: 6, y: 4 },
});

/** 以竖直椭圆端盖形状表现被使用、产生或存储的对象 */
export const ResourceEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Resource,
  description: '被使用、产生或存储的对象',
  shape: { type: 'ellipticCapsule', params: { axis: 'vertical', capDepth: 8 } },
  padding: { x: 10, y: 0 },
  minimumSize: { width: 56, height: 0 },
});

/** 以椭圆表现抽象知识对象 */
export const ConceptEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Concept,
  description: '抽象知识对象',
  shape: 'ellipse',
  padding: { x: 8, y: 6 },
  minimumSize: { width: 56, height: 36 },
});

/** 按固定顺序提供全部内置实体角色的默认几何定义 */
export const BUILTIN_ENTITY_ROLE_DEFINITIONS: ReadonlyArray<EntityRoleDefinition> = Object.freeze([
  ParticipantEntityRoleDefinition,
  ActivityEntityRoleDefinition,
  EventEntityRoleDefinition,
  StateEntityRoleDefinition,
  GatewayEntityRoleDefinition,
  ResourceEntityRoleDefinition,
  ConceptEntityRoleDefinition,
]);
