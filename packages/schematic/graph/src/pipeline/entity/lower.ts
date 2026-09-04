import type { IRNode } from '@retikz/core';

import type { CanonicalEntity, EffectiveEntityAppearance } from '../../resolve';
import type { IRGraphEntity } from '../../schemas';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';

type NodeMinimumSize = IRNode['minimumSize'];

const sizeAxis = (size: NodeMinimumSize | undefined, axis: 'width' | 'height'): number | undefined =>
  typeof size === 'number' ? size : (size?.[axis] ?? size?.default);

const mergeMinimumSize = (
  roleMinimumSize: NodeMinimumSize | undefined,
  sourceMinimumSize: NodeMinimumSize | undefined,
): NodeMinimumSize | undefined => {
  const roleWidth = sizeAxis(roleMinimumSize, 'width');
  const roleHeight = sizeAxis(roleMinimumSize, 'height');
  const sourceWidth = sizeAxis(sourceMinimumSize, 'width');
  const sourceHeight = sizeAxis(sourceMinimumSize, 'height');
  const width =
    roleWidth === undefined && sourceWidth === undefined ? undefined : Math.max(roleWidth ?? 0, sourceWidth ?? 0);
  const height =
    roleHeight === undefined && sourceHeight === undefined ? undefined : Math.max(roleHeight ?? 0, sourceHeight ?? 0);
  if (width === undefined && height === undefined) return undefined;
  return {
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  };
};

const ENTITY_SEMANTIC_FIELDS = new Set<keyof IRGraphEntity>([
  'namespace',
  'type',
  'role',
  'kind',
  'predicate',
  'status',
]);

const isDefinedNodeField = ([key, value]: [string, unknown]): boolean =>
  !ENTITY_SEMANTIC_FIELDS.has(key as keyof IRGraphEntity) && value !== undefined;

/** 从 Graph Entity 中移除领域字段，并只保留作者实际定义的 Core Node 字段 */
const definedNodeFields = (source: IRGraphEntity): Partial<IRNode> =>
  Object.fromEntries(Object.entries(source).filter(isDefinedNodeField));

/** 把 Canonical Entity、role structure 与 Theme appearance 下沉为一个 Core Node */
export const lowerEntity = (entity: CanonicalEntity, appearance: EffectiveEntityAppearance): IRNode => {
  const source = entity.source;
  if (source.position === undefined) {
    const label = source.id === undefined ? 'Entity' : `Entity '${source.id}'`;
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.CompileInvariant,
      message: `${label} requires position before lowering.`,
      details: {
        capability: 'entity-position',
        ...(source.id === undefined ? {} : { key: source.id, nodeId: source.id }),
      },
    });
  }
  const minimumSize = mergeMinimumSize(entity.roleDefinition.minimumSize, source.minimumSize);
  return {
    type: 'node',
    ...appearance,
    ...definedNodeFields(source),
    position: source.position,
    shape: entity.roleDefinition.shape,
    ...(entity.roleDefinition.boundary === undefined ? {} : { boundary: entity.roleDefinition.boundary }),
    padding: entity.roleDefinition.padding,
    ...(entity.roleDefinition.cornerRadius === undefined ? {} : { cornerRadius: entity.roleDefinition.cornerRadius }),
    ...(minimumSize === undefined ? {} : { minimumSize }),
  };
};
