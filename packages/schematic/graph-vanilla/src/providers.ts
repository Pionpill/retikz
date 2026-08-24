import type { GraphDefinitionOptions } from '@retikz/graph';

import { createGraphProviders } from '@retikz/graph';

import { RetikzGraphVanillaError, RetikzGraphVanillaErrorCode } from './errors';

type GraphProvider = ReturnType<typeof createGraphProviders>[number];
type GraphProviderKey = GraphProvider['key'];

const sameProviderKey = (left: GraphProviderKey, right: GraphProviderKey): boolean =>
  left.capability === right.capability &&
  ('namespace' in left ? left.namespace : undefined) === ('namespace' in right ? right.namespace : undefined) &&
  ('type' in left ? left.type : undefined) === ('type' in right ? right.type : undefined) &&
  ('name' in left ? left.name : undefined) === ('name' in right ? right.name : undefined);

const providerLabelOf = (key: GraphProviderKey): string =>
  'namespace' in key ? `${key.namespace}.${key.type}` : `${key.capability}.${key.name}`;

const hasDefinitionOptions = (options: GraphDefinitionOptions): boolean =>
  options.entityRoles !== undefined ||
  options.entityKinds !== undefined ||
  options.entityPredicates !== undefined ||
  options.relationRoles !== undefined ||
  options.relationKinds !== undefined ||
  options.relationPredicates !== undefined ||
  options.graphThemeStyles !== undefined;

/** 从 adapter props 提取只供 provider dataset 使用的 Graph definitions */
export const graphDefinitionOptionsOf = (props: GraphDefinitionOptions): GraphDefinitionOptions => ({
  entityRoles: props.entityRoles,
  entityKinds: props.entityKinds,
  entityPredicates: props.entityPredicates,
  relationRoles: props.relationRoles,
  relationKinds: props.relationKinds,
  relationPredicates: props.relationPredicates,
  graphThemeStyles: props.graphThemeStyles,
});

/** 创建以指定 Graph semantic provider 为根的完整依赖贡献 */
export const createGraphProviderDependencies = (rootKey: GraphProviderKey, options: GraphDefinitionOptions) => {
  const providers = hasDefinitionOptions(options) ? createGraphProviders(options) : createGraphProviders();
  const root = providers.find(provider => sameProviderKey(provider.key, rootKey));
  if (root === undefined) {
    const provider = providerLabelOf(rootKey);
    throw new RetikzGraphVanillaError({
      code: RetikzGraphVanillaErrorCode.ProviderMissing,
      message: `Graph provider catalog is missing provider '${provider}'.`,
      details: { provider },
    });
  }

  const output: Array<GraphProvider> = [];
  const visited = new Set<GraphProvider>();
  const visit = (provider: GraphProvider): void => {
    if (visited.has(provider)) return;
    visited.add(provider);
    output.push(provider);
    for (const dependency of provider.dependencies) {
      const candidate = providers.find(entry => sameProviderKey(entry.key, dependency));
      if (candidate === undefined) {
        const label = providerLabelOf(dependency);
        throw new RetikzGraphVanillaError({
          code: RetikzGraphVanillaErrorCode.ProviderDependencyMissing,
          message: `Graph provider catalog is missing dependency '${label}'.`,
          details: { dependency: label },
        });
      }
      visit(candidate);
    }
  };
  visit(root);

  return {
    roots: [root.key],
    providers: output,
  };
};
