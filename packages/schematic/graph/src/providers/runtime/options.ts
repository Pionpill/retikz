import type {
  EntityKindDefinition,
  EntityPredicateDefinition,
  EntityRoleDefinition,
  GraphDefinitionOptions,
  GraphThemeStyleDefinition,
  RelationKindDefinition,
  RelationPredicateDefinition,
  RelationRoleDefinition,
} from '../../contract';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { resolveEntityKindRegistry, resolveEntityPredicateRegistry, resolveEntityRoleRegistry } from '../entity';
import {
  resolveRelationKindRegistry,
  resolveRelationPredicateRegistry,
  resolveRelationRoleRegistry,
} from '../relation';
import { resolveGraphThemeStyleRegistry } from '../theme';

type GraphDefinitionCollectionKey = keyof GraphDefinitionOptions;

const definitionKeyOf = {
  entityRoles: (definition: EntityRoleDefinition) => definition.role,
  entityKinds: (definition: EntityKindDefinition) => definition.kind,
  entityPredicates: (definition: EntityPredicateDefinition) => definition.name,
  relationRoles: (definition: RelationRoleDefinition) => definition.role,
  relationKinds: (definition: RelationKindDefinition) => definition.kind,
  relationPredicates: (definition: RelationPredicateDefinition) => definition.name,
  graphThemeStyles: (definition: GraphThemeStyleDefinition) => definition.name,
} as const;

const definitionLabelOf = {
  entityRoles: 'Entity role',
  entityKinds: 'Entity kind',
  entityPredicates: 'Entity predicate',
  relationRoles: 'Relation role',
  relationKinds: 'Relation kind',
  relationPredicates: 'Relation predicate',
  graphThemeStyles: 'Graph theme style',
} as const;

/** 按公开 key 与对象 identity 合并一次 provider assembly 的 definition 集合 */
const mergeDefinitionCollection = <TKey extends GraphDefinitionCollectionKey>(
  optionSets: ReadonlyArray<GraphDefinitionOptions>,
  collectionKey: TKey,
): NonNullable<GraphDefinitionOptions[TKey]> => {
  type Definition = NonNullable<GraphDefinitionOptions[TKey]>[number];
  const definitions = new Map<string, Definition>();
  const keyOf = definitionKeyOf[collectionKey] as (definition: Definition) => string;
  for (const options of optionSets) {
    for (const definition of options[collectionKey] ?? []) {
      const key = keyOf(definition);
      const existing = definitions.get(key);
      if (existing === undefined) {
        definitions.set(key, definition);
        continue;
      }
      if (!Object.is(existing, definition)) {
        throw new RetikzGraphError({
          code: RetikzGraphErrorCode.DefinitionConflict,
          message: `${definitionLabelOf[collectionKey]} '${key}' received a different definition object in one provider assembly.`,
          details: { capability: collectionKey, key },
        });
      }
    }
  }
  return Object.freeze([...definitions.values()]) as NonNullable<GraphDefinitionOptions[TKey]>;
};

/** 一次 Graph definition 装配共享的已解析 registries */
export type ResolvedGraphDefinitionOptions = Readonly<{
  entityRoles: ReadonlyMap<string, EntityRoleDefinition>;
  entityKinds: ReadonlyMap<string, EntityKindDefinition>;
  entityPredicates: ReadonlyMap<string, EntityPredicateDefinition>;
  relationRoles: ReadonlyMap<string, RelationRoleDefinition>;
  relationKinds: ReadonlyMap<string, RelationKindDefinition>;
  relationPredicates: ReadonlyMap<string, RelationPredicateDefinition>;
  graphThemeStyles: ReadonlyMap<string, GraphThemeStyleDefinition>;
}>;

/** 合并一次 provider assembly 内的 Graph options，并按 definition identity 去重 */
export const mergeGraphDefinitionOptions = (
  optionSets: ReadonlyArray<GraphDefinitionOptions>,
): GraphDefinitionOptions => ({
  entityRoles: mergeDefinitionCollection(optionSets, 'entityRoles'),
  entityKinds: mergeDefinitionCollection(optionSets, 'entityKinds'),
  entityPredicates: mergeDefinitionCollection(optionSets, 'entityPredicates'),
  relationRoles: mergeDefinitionCollection(optionSets, 'relationRoles'),
  relationKinds: mergeDefinitionCollection(optionSets, 'relationKinds'),
  relationPredicates: mergeDefinitionCollection(optionSets, 'relationPredicates'),
  graphThemeStyles: mergeDefinitionCollection(optionSets, 'graphThemeStyles'),
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
    graphThemeStyles: resolveGraphThemeStyleRegistry(options.graphThemeStyles),
  };
};
