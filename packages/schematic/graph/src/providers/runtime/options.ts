import type {
  EntityRoleDefinition,
  EntityVariantDefinition,
  GraphDefinitionOptions,
  GraphThemeStyleDefinition,
} from '../../contract';

import { resolveEntityRoleRegistry, resolveEntityVariantRegistry } from '../entity';
import { resolveGraphThemeStyleRegistry } from '../theme';

type GraphDefinitionCollectionKey = keyof GraphDefinitionOptions;

const definitionKeyOf = {
  entityRoles: (definition: EntityRoleDefinition) => definition.role,
  entityVariants: (definition: EntityVariantDefinition) => definition.variant,
  graphThemeStyles: (definition: GraphThemeStyleDefinition) => definition.name,
} as const;

const definitionLabelOf = {
  entityRoles: 'Entity role',
  entityVariants: 'Entity variant',
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
        throw new Error(
          `${definitionLabelOf[collectionKey]} '${key}' received a different definition object in one provider assembly.`,
        );
      }
    }
  }
  return Object.freeze([...definitions.values()]) as NonNullable<GraphDefinitionOptions[TKey]>;
};

/** 一次 Graph definition 装配共享的已解析 registries */
export type ResolvedGraphDefinitionOptions = Readonly<{
  entityRoles: ReadonlyMap<string, EntityRoleDefinition>;
  entityVariants: ReadonlyMap<string, EntityVariantDefinition>;
  graphThemeStyles: ReadonlyMap<string, GraphThemeStyleDefinition>;
}>;

/** 合并一次 provider assembly 内的 Graph options，并按 definition identity 去重 */
export const mergeGraphDefinitionOptions = (
  optionSets: ReadonlyArray<GraphDefinitionOptions>,
): GraphDefinitionOptions => ({
  entityRoles: mergeDefinitionCollection(optionSets, 'entityRoles'),
  entityVariants: mergeDefinitionCollection(optionSets, 'entityVariants'),
  graphThemeStyles: mergeDefinitionCollection(optionSets, 'graphThemeStyles'),
});

/** 一次性校验并解析 Graph definition options */
export const resolveGraphDefinitionOptions = (
  options: GraphDefinitionOptions = {},
): ResolvedGraphDefinitionOptions => ({
  entityRoles: resolveEntityRoleRegistry(options.entityRoles),
  entityVariants: resolveEntityVariantRegistry(options.entityVariants),
  graphThemeStyles: resolveGraphThemeStyleRegistry(options.graphThemeStyles),
});
