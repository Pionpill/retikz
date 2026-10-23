import type {
  EntityPredicateDefinition,
  EntityRoleDefinition,
  GraphDefinitionOptions,
  GraphThemeDefinition,
  RelationKindDefinition,
  RelationPredicateDefinition,
  RelationRoleDefinition,
} from '../../contract';
import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import type { EntityKindRegistry } from '../entity';
import { resolveEntityKindRegistry, resolveEntityPredicateRegistry, resolveEntityRoleRegistry } from '../entity';
import {
  resolveRelationKindRegistry,
  resolveRelationPredicateRegistry,
  resolveRelationRoleRegistry,
} from '../relation';
import { resolveGraphThemeRegistry } from '../theme';

/** 按公开 key 与对象 identity 合并一次 provider assembly 的 definition 集合 */
const mergeDefinitionCollection = <TDefinition>(
  collections: ReadonlyArray<ReadonlyArray<TDefinition> | undefined>,
  options: {
    /** 当前合并的能力字段，用于冲突诊断 */
    capability: keyof GraphDefinitionOptions;
    /** 错误消息中的能力名称 */
    label: string;
    /** 定义的稳定注册键 */
    keyOf: (definition: TDefinition) => string;
  },
): ReadonlyArray<TDefinition> => {
  const definitions = new Map<string, TDefinition>();
  const { capability, label, keyOf } = options;

  for (const collection of collections) {
    for (const definition of collection ?? []) {
      const key = keyOf(definition);
      const existing = definitions.get(key);
      if (existing === undefined) {
        definitions.set(key, definition);
        continue;
      }

      if (!Object.is(existing, definition)) {
        throw new RetikzGraphError({
          code: RetikzGraphErrorCode.DefinitionConflict,
          message: `${label} '${key}' received a different definition object in one provider assembly.`,
          details: { capability, key },
        });
      }
    }
  }

  return Object.freeze([...definitions.values()]);
};

/** 一次 Graph definition 装配共享的已解析 registries */
export type ResolvedGraphDefinitionOptions = Readonly<{
  /** 按 role 键索引的实体角色定义 */
  entityRoles: ReadonlyMap<string, EntityRoleDefinition>;
  /** 已解析的实体 kind 定义注册表 */
  entityKinds: EntityKindRegistry;
  /** 按名称索引的实体 predicate 定义 */
  entityPredicates: ReadonlyMap<string, EntityPredicateDefinition>;
  /** 按 role 键索引的关系角色定义 */
  relationRoles: ReadonlyMap<string, RelationRoleDefinition>;
  /** 按 kind 键索引的关系种类定义 */
  relationKinds: ReadonlyMap<string, RelationKindDefinition>;
  /** 按名称索引的关系 predicate 定义 */
  relationPredicates: ReadonlyMap<string, RelationPredicateDefinition>;
  /** 按名称索引的 Graph 主题样式定义 */
  graphThemeDefinitions: ReadonlyMap<string, GraphThemeDefinition>;
}>;

/** 合并一次 provider assembly 内的 Graph options，并按 definition identity 去重 */
export const mergeGraphDefinitionOptions = (
  optionSets: ReadonlyArray<GraphDefinitionOptions>,
): GraphDefinitionOptions => ({
  entityRoles: mergeDefinitionCollection(
    optionSets.map(options => options.entityRoles),
    {
      capability: 'entityRoles',
      label: 'Entity role',
      keyOf: definition => definition.role,
    },
  ),
  entityKinds: mergeDefinitionCollection(
    optionSets.map(options => options.entityKinds),
    {
      capability: 'entityKinds',
      label: 'Entity kind',
      keyOf: definition => JSON.stringify([definition.role, definition.kind]),
    },
  ),
  entityPredicates: mergeDefinitionCollection(
    optionSets.map(options => options.entityPredicates),
    {
      capability: 'entityPredicates',
      label: 'Entity predicate',
      keyOf: definition => definition.name,
    },
  ),
  relationRoles: mergeDefinitionCollection(
    optionSets.map(options => options.relationRoles),
    {
      capability: 'relationRoles',
      label: 'Relation role',
      keyOf: definition => definition.role,
    },
  ),
  relationKinds: mergeDefinitionCollection(
    optionSets.map(options => options.relationKinds),
    {
      capability: 'relationKinds',
      label: 'Relation kind',
      keyOf: definition => definition.kind,
    },
  ),
  relationPredicates: mergeDefinitionCollection(
    optionSets.map(options => options.relationPredicates),
    {
      capability: 'relationPredicates',
      label: 'Relation predicate',
      keyOf: definition => definition.name,
    },
  ),
  graphThemeDefinitions: mergeDefinitionCollection(
    optionSets.map(options => options.graphThemeDefinitions),
    {
      capability: 'graphThemeDefinitions',
      label: 'Graph theme',
      keyOf: definition => definition.name,
    },
  ),
});

/** 一次性校验并解析 Graph definition options */
export const resolveGraphDefinitionOptions = (options: GraphDefinitionOptions = {}): ResolvedGraphDefinitionOptions => {
  const entityRoles = resolveEntityRoleRegistry(options.entityRoles);
  const entityKinds = resolveEntityKindRegistry(options.entityKinds, entityRoles);
  const entityPredicates = resolveEntityPredicateRegistry(options.entityPredicates, entityRoles, entityKinds);
  const relationRoles = resolveRelationRoleRegistry(options.relationRoles);
  const relationKinds = resolveRelationKindRegistry(options.relationKinds, relationRoles);
  const relationPredicates = resolveRelationPredicateRegistry(options.relationPredicates, relationRoles, relationKinds);

  return {
    entityRoles,
    entityKinds,
    entityPredicates,
    relationRoles,
    relationKinds,
    relationPredicates,
    graphThemeDefinitions: resolveGraphThemeRegistry(options.graphThemeDefinitions),
  };
};
