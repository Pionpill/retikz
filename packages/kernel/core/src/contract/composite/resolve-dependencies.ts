import type {
  CompositeDependencyProvider,
  CompositeProviderKey,
  ResolveCompositeDependenciesOptions,
} from './dependency-provider';
import type { AnyCompositeDefinition } from './types';

type ProviderEntry = {
  key: CompositeProviderKey;
  dependencies: ReadonlyArray<CompositeProviderKey>;
  datasets: Map<string, unknown>;
  makeDefinition: CompositeDependencyProvider['makeDefinition'];
};

type ProviderIndex = Map<string, Map<string, ProviderEntry>>;

/** 把完整 key 格式化为面向作者的诊断名称 */
const keyName = (key: CompositeProviderKey): string => `${key.namespace}.${key.type}`;

/** 校验公开 provider graph key */
const assertProviderKey = (key: CompositeProviderKey, path: string): void => {
  if (key.namespace.length === 0 || key.type.length === 0) {
    throw new Error(`resolveCompositeDependencies: ${path} must have a non-empty namespace and type`);
  }
};

/** 按两个独立字段读取 provider，避免可逆字符串编码歧义 */
const providerAt = (index: ProviderIndex, key: CompositeProviderKey): ProviderEntry | undefined =>
  index.get(key.namespace)?.get(key.type);

/** 写入完整 qualified key 对应的 provider */
const setProvider = (index: ProviderIndex, entry: ProviderEntry): void => {
  const namespaceProviders = index.get(entry.key.namespace);
  if (namespaceProviders === undefined) {
    index.set(entry.key.namespace, new Map([[entry.key.type, entry]]));
    return;
  }
  namespaceProviders.set(entry.key.type, entry);
};

/** 判断两组有序依赖是否逐项使用相同完整 key */
const sameDependencies = (
  left: ReadonlyArray<CompositeProviderKey>,
  right: ReadonlyArray<CompositeProviderKey>,
): boolean =>
  left.length === right.length &&
  left.every(
    (dependency, index) => dependency.namespace === right[index]?.namespace && dependency.type === right[index]?.type,
  );

/** 合并同一 provider key 的 dataset references */
const mergeDatasets = (entry: ProviderEntry, provider: CompositeDependencyProvider, path: string): void => {
  for (const [reference, value] of Object.entries(provider.datasets)) {
    if (reference.length === 0) {
      throw new Error(`resolveCompositeDependencies: ${path}.datasets contains an empty reference`);
    }
    if (!entry.datasets.has(reference)) {
      entry.datasets.set(reference, value);
      continue;
    }
    if (!Object.is(entry.datasets.get(reference), value)) {
      throw new Error(
        `resolveCompositeDependencies: provider ${keyName(entry.key)} dataset "${reference}" conflicts by identity`,
      );
    }
  }
};

/** 建立完整 provider index，并在 maker 执行前完成声明与 dataset 合并 */
const buildProviderIndex = (
  options: ResolveCompositeDependenciesOptions,
): {
  index: ProviderIndex;
  roots: Array<CompositeProviderKey>;
  composites: Array<AnyCompositeDefinition>;
} => {
  const index: ProviderIndex = new Map();
  const roots: Array<CompositeProviderKey> = [];
  const contributions = [...options.contributions];
  const composites = [...(options.composites ?? [])];

  for (const [contributionIndex, contribution] of contributions.entries()) {
    for (const [rootIndex, root] of [...contribution.roots].entries()) {
      assertProviderKey(root, `contributions[${contributionIndex}].roots[${rootIndex}]`);
      roots.push({ namespace: root.namespace, type: root.type });
    }
    for (const [providerIndex, provider] of [...contribution.providers].entries()) {
      const path = `contributions[${contributionIndex}].providers[${providerIndex}]`;
      assertProviderKey(provider.key, `${path}.key`);
      const dependencies = [...provider.dependencies].map((dependency, dependencyIndex) => {
        assertProviderKey(dependency, `${path}.dependencies[${dependencyIndex}]`);
        return { namespace: dependency.namespace, type: dependency.type };
      });
      const existing = providerAt(index, provider.key);
      if (existing === undefined) {
        const entry: ProviderEntry = {
          key: { namespace: provider.key.namespace, type: provider.key.type },
          dependencies,
          datasets: new Map(),
          makeDefinition: provider.makeDefinition,
        };
        mergeDatasets(entry, provider, path);
        setProvider(index, entry);
        continue;
      }
      if (existing.makeDefinition !== provider.makeDefinition) {
        throw new Error(
          `resolveCompositeDependencies: provider ${keyName(provider.key)} has conflicting maker references`,
        );
      }
      if (!sameDependencies(existing.dependencies, dependencies)) {
        throw new Error(
          `resolveCompositeDependencies: provider ${keyName(provider.key)} has conflicting ordered dependencies`,
        );
      }
      mergeDatasets(existing, provider, path);
    }
  }

  for (const [definitionIndex, definition] of composites.entries()) {
    assertProviderKey(definition, `composites[${definitionIndex}]`);
  }
  return { index, roots, composites };
};

/** 预检 roots 的可达闭包并生成稳定 dependency-first 顺序 */
const reachableProviders = (index: ProviderIndex, roots: ReadonlyArray<CompositeProviderKey>): Array<ProviderEntry> => {
  const ordered: Array<ProviderEntry> = [];
  const state = new Map<ProviderEntry, 'visiting' | 'visited'>();
  const stack: Array<ProviderEntry> = [];

  const visit = (key: CompositeProviderKey, parent?: ProviderEntry): void => {
    const entry = providerAt(index, key);
    if (entry === undefined) {
      const chain = [...stack.map(candidate => keyName(candidate.key)), keyName(key)].join(' -> ');
      const relation = parent === undefined ? 'root' : 'dependency';
      throw new Error(`resolveCompositeDependencies: missing ${relation} provider in chain ${chain}`);
    }
    const currentState = state.get(entry);
    if (currentState === 'visited') return;
    if (currentState === 'visiting') {
      const cycleStart = stack.indexOf(entry);
      const cycle = [...stack.slice(cycleStart).map(candidate => keyName(candidate.key)), keyName(entry.key)].join(
        ' -> ',
      );
      throw new Error(`resolveCompositeDependencies: provider cycle ${cycle}`);
    }

    state.set(entry, 'visiting');
    stack.push(entry);
    for (const dependency of entry.dependencies) visit(dependency, entry);
    stack.pop();
    state.set(entry, 'visited');
    ordered.push(entry);
  };

  for (const root of roots) visit(root);
  return ordered;
};

/** 向最终 definitions 追加一个 key 唯一的 definition */
const appendDefinition = (
  definitions: Array<AnyCompositeDefinition>,
  definitionIndex: Map<string, Map<string, AnyCompositeDefinition>>,
  definition: AnyCompositeDefinition,
): void => {
  const existing = definitionIndex.get(definition.namespace)?.get(definition.type);
  if (existing !== undefined) {
    if (existing === definition) return;
    throw new Error(
      `resolveCompositeDependencies: definition conflict for ${keyName(definition)} uses different objects`,
    );
  }
  const namespaceDefinitions = definitionIndex.get(definition.namespace);
  if (namespaceDefinitions === undefined) {
    definitionIndex.set(definition.namespace, new Map([[definition.type, definition]]));
  } else {
    namespaceDefinitions.set(definition.type, definition);
  }
  definitions.push(definition);
};

/**
 * 解析 Composite contributions 的可达 definition 闭包
 * @description 在调用任何 maker 前完成 provider、dataset、缺失依赖与 cycle 预检，再按 dependency-first 顺序物化并追加显式 definitions
 */
export const resolveCompositeDependencies = (
  options: ResolveCompositeDependenciesOptions,
): ReadonlyArray<AnyCompositeDefinition> => {
  const { index, roots, composites } = buildProviderIndex(options);
  const orderedProviders = reachableProviders(index, roots);
  const definitions: Array<AnyCompositeDefinition> = [];
  const definitionIndex = new Map<string, Map<string, AnyCompositeDefinition>>();

  for (const provider of orderedProviders) {
    const datasets = Object.freeze(Object.fromEntries(provider.datasets));
    const definition = provider.makeDefinition(datasets);
    if (definition.namespace !== provider.key.namespace || definition.type !== provider.key.type) {
      throw new Error(
        `resolveCompositeDependencies: provider ${keyName(provider.key)} returned definition ${keyName(definition)}`,
      );
    }
    appendDefinition(definitions, definitionIndex, definition);
  }
  for (const definition of composites) {
    appendDefinition(definitions, definitionIndex, definition);
  }
  return Object.freeze(definitions);
};
