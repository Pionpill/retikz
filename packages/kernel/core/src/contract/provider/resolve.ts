import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { AnyCompositeDefinition } from '../composite';
import type { BoundaryDefinition, ShapeDefinition } from '../node';
import type { AnyPathDefinition, ArrowDefinition, MarkDefinition } from '../path';
import type { ClipDefinition } from '../scope';
import type { PatternDefinition } from '../style';
import type {
  AnyCoreDependencyProvider,
  CoreDependencyProvider,
  CoreProviderDefinition,
  CoreProviderDefinitions,
  CoreProviderKey,
  CoreProviderDependenciesResolveOptions,
} from './types';
import { ProviderCapability } from './types';

type ProviderEntry = {
  key: CoreProviderKey;
  dependencies: ReadonlyArray<CoreProviderKey>;
  params: Array<unknown>;
  makeDefinition: AnyCoreDependencyProvider['makeDefinition'];
};

type NamedProviderCapability = Exclude<ProviderCapability, typeof ProviderCapability.Composite>;

/** 提供者索引将复合定义的命名空间/类型标识保存在独立映射维度中 */
type ProviderIndex = Readonly<{
  named: Map<NamedProviderCapability, Map<string, ProviderEntry>>;
  composites: Map<string, Map<string, ProviderEntry>>;
}>;

type MutableCoreProviderDefinitions = {
  shapes: Array<ShapeDefinition>;
  boundaries: Array<BoundaryDefinition>;
  clips: Array<ClipDefinition>;
  arrows: Array<ArrowDefinition>;
  marks: Array<MarkDefinition>;
  patterns: Array<PatternDefinition>;
  paths: Array<AnyPathDefinition>;
  composites: Array<AnyCompositeDefinition>;
};

type DefinitionIndex = Readonly<{
  named: Map<NamedProviderCapability, Map<string, CoreProviderDefinition>>;
  composites: Map<string, Map<string, CoreProviderDefinition>>;
}>;

type CoreDefinitionCollection = ReadonlyArray<CoreProviderDefinition> | undefined;

/** 把完整 key 格式化为面向作者的诊断名称 */
const formatProviderKey = (key: CoreProviderKey): string =>
  key.capability === ProviderCapability.Composite
    ? `${key.capability}:${key.namespace}.${key.type}`
    : `${key.capability}:${key.name}`;

/** 按能力与完整键读取提供者，避免字符串拼接歧义 */
const findProvider = (index: ProviderIndex, key: CoreProviderKey): ProviderEntry | undefined =>
  key.capability === ProviderCapability.Composite
    ? index.composites.get(key.namespace)?.get(key.type)
    : index.named.get(key.capability)?.get(key.name);

/** 建立完整提供者索引，并在创建函数执行前完成声明检查与参数收集 */
const buildProviderIndex = (
  options: CoreProviderDependenciesResolveOptions,
): { index: ProviderIndex; roots: Array<CoreProviderKey>; definitions: CoreProviderDefinitions } => {
  /** 写入完整 Core 提供者键对应的提供者 */
  const setProvider = (index: ProviderIndex, entry: ProviderEntry): void => {
    if (entry.key.capability === ProviderCapability.Composite) {
      const namespaceProviders = index.composites.get(entry.key.namespace);
      if (namespaceProviders === undefined) {
        index.composites.set(entry.key.namespace, new Map([[entry.key.type, entry]]));
        return;
      }

      namespaceProviders.set(entry.key.type, entry);
      return;
    }

    const capabilityProviders = index.named.get(entry.key.capability);
    if (capabilityProviders === undefined) {
      index.named.set(entry.key.capability, new Map([[entry.key.name, entry]]));
      return;
    }

    capabilityProviders.set(entry.key.name, entry);
  };

  /** 判断两组有序依赖是否逐项使用相同完整 key */
  const isProviderDependencyListEqual = (
    left: ReadonlyArray<CoreProviderKey>,
    right: ReadonlyArray<CoreProviderKey>,
  ): boolean =>
    left.length === right.length &&
    left.every((dependency, index) => {
      const candidate = right[index];
      if (dependency.capability !== candidate.capability) return false;
      if (dependency.capability === ProviderCapability.Composite) {
        return (
          candidate.capability === ProviderCapability.Composite &&
          dependency.namespace === candidate.namespace &&
          dependency.type === candidate.type
        );
      }

      return candidate.capability !== ProviderCapability.Composite && dependency.name === candidate.name;
    });

  const index: ProviderIndex = {
    named: new Map(),
    composites: new Map(),
  };
  const roots: Array<CoreProviderKey> = [];

  for (const contribution of options.contributions) {
    roots.push(...contribution.roots);

    for (const provider of contribution.providers) {
      const dependencies = [...(provider.dependencies ?? [])];
      const existing = findProvider(index, provider.key);
      if (existing === undefined) {
        const entry: ProviderEntry = {
          key: provider.key,
          dependencies,
          params: provider.params === undefined ? [] : [provider.params],
          makeDefinition: provider.makeDefinition,
        };
        setProvider(index, entry);
        continue;
      }

      // 多次注入相同 key 等价判断
      if (existing.makeDefinition !== provider.makeDefinition) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Contract,
          `resolveCoreProviderDependencies: provider ${formatProviderKey(provider.key)} has conflicting maker references`,
        );
      }

      if (!isProviderDependencyListEqual(existing.dependencies, dependencies)) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Contract,
          `resolveCoreProviderDependencies: provider ${formatProviderKey(provider.key)} has conflicting ordered dependencies`,
        );
      }

      if (provider.params !== undefined) existing.params.push(provider.params);
    }
  }

  const explicit = options.definitions;
  const definitions: CoreProviderDefinitions =
    explicit === undefined
      ? {}
      : {
          ...(explicit.shapes === undefined ? {} : { shapes: [...explicit.shapes] }),
          ...(explicit.boundaries === undefined ? {} : { boundaries: [...explicit.boundaries] }),
          ...(explicit.clips === undefined ? {} : { clips: [...explicit.clips] }),
          ...(explicit.arrows === undefined ? {} : { arrows: [...explicit.arrows] }),
          ...(explicit.marks === undefined ? {} : { marks: [...explicit.marks] }),
          ...(explicit.patterns === undefined ? {} : { patterns: [...explicit.patterns] }),
          ...(explicit.paths === undefined ? {} : { paths: [...explicit.paths] }),
          ...(explicit.composites === undefined ? {} : { composites: [...explicit.composites] }),
        };

  return { index, roots, definitions };
};

/** 预检根节点的可达闭包并生成稳定的依赖优先顺序 */
const collectReachableProviders = (
  index: ProviderIndex,
  roots: ReadonlyArray<CoreProviderKey>,
): Array<ProviderEntry> => {
  /** 已完成访问的提供者，依赖排在消费方之前，每个提供者仅追加一次 */
  const ordered: Array<ProviderEntry> = [];
  /** 本次闭包遍历的提供者状态 Map，区分当前递归链与已完成节点 */
  const providerStateMap = new Map<ProviderEntry, 'visiting' | 'visited'>();
  /** 当前递归链，进入时压栈、退出时弹栈，用于报告依赖路径 */
  const providerStack: Array<ProviderEntry> = [];

  /** 递归访问依赖，完成后追加到依赖优先输出 */
  const visitProvider = (key: CoreProviderKey, parent?: ProviderEntry): void => {
    const entry = findProvider(index, key);
    if (entry === undefined) {
      const chain = [...providerStack.map(candidate => formatProviderKey(candidate.key)), formatProviderKey(key)].join(
        ' -> ',
      );
      const relation = parent === undefined ? 'root' : 'dependency';
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `resolveCoreProviderDependencies: missing ${relation} provider in chain ${chain}`,
      );
    }

    const currentState = providerStateMap.get(entry);
    if (currentState === 'visited') return;
    if (currentState === 'visiting') {
      const cycleStart = providerStack.indexOf(entry);
      const cycle = [
        ...providerStack.slice(cycleStart).map(candidate => formatProviderKey(candidate.key)),
        formatProviderKey(entry.key),
      ].join(' -> ');
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `resolveCoreProviderDependencies: provider cycle ${cycle}`,
      );
    }

    providerStateMap.set(entry, 'visiting');
    providerStack.push(entry);

    for (const dependency of entry.dependencies) visitProvider(dependency, entry);
    providerStack.pop();
    providerStateMap.set(entry, 'visited');
    ordered.push(entry);
  };

  for (const root of roots) visitProvider(root);

  return ordered;
};

/** 从定义读取指定能力的注册表标识 */
const readDefinitionIdentity = (
  capability: ProviderCapability,
  definition: CoreProviderDefinition,
): CoreProviderKey => {
  switch (capability) {
    case ProviderCapability.Shape:
      return { capability, name: (definition as ShapeDefinition).name };
    case ProviderCapability.Boundary:
      return { capability, name: (definition as BoundaryDefinition).name };
    case ProviderCapability.Clip:
      return { capability, name: (definition as ClipDefinition).kind };
    case ProviderCapability.Mark:
      return { capability, name: (definition as MarkDefinition).name };
    case ProviderCapability.Arrow:
      return { capability, name: (definition as ArrowDefinition).name };
    case ProviderCapability.Pattern:
      return { capability, name: (definition as PatternDefinition).name };
    case ProviderCapability.Path:
      return { capability, name: (definition as AnyPathDefinition).name };
    case ProviderCapability.Composite: {
      const composite = definition as AnyCompositeDefinition;
      return { capability, namespace: composite.namespace, type: composite.type };
    }
  }
};

/** 向最终定义追加一个键唯一的定义 */
const appendDefinition = (
  definitions: MutableCoreProviderDefinitions,
  definitionIndex: DefinitionIndex,
  capability: ProviderCapability,
  definition: CoreProviderDefinition,
): void => {
  /** 把定义放入其所属的编译选项集合 */
  const appendByCapability = (): void => {
    switch (capability) {
      case ProviderCapability.Shape:
        definitions.shapes.push(definition as ShapeDefinition);
        return;
      case ProviderCapability.Boundary:
        definitions.boundaries.push(definition as BoundaryDefinition);
        return;
      case ProviderCapability.Clip:
        definitions.clips.push(definition as ClipDefinition);
        return;
      case ProviderCapability.Mark:
        definitions.marks.push(definition as MarkDefinition);
        return;
      case ProviderCapability.Arrow:
        definitions.arrows.push(definition as ArrowDefinition);
        return;
      case ProviderCapability.Pattern:
        definitions.patterns.push(definition as PatternDefinition);
        return;
      case ProviderCapability.Path:
        definitions.paths.push(definition as AnyPathDefinition);
        return;
      case ProviderCapability.Composite:
        definitions.composites.push(definition as AnyCompositeDefinition);
    }
  };

  const identity = readDefinitionIdentity(capability, definition);
  const existing =
    identity.capability === ProviderCapability.Composite
      ? definitionIndex.composites.get(identity.namespace)?.get(identity.type)
      : definitionIndex.named.get(identity.capability)?.get(identity.name);
  if (existing !== undefined) {
    if (existing === definition) return;

    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `resolveCoreProviderDependencies: definition conflict for ${formatProviderKey(identity)} uses different objects`,
    );
  }

  if (identity.capability === ProviderCapability.Composite) {
    const namespaceDefinitions = definitionIndex.composites.get(identity.namespace);
    if (namespaceDefinitions === undefined) {
      definitionIndex.composites.set(identity.namespace, new Map([[identity.type, definition]]));
    } else {
      namespaceDefinitions.set(identity.type, definition);
    }
  } else {
    const capabilityDefinitions = definitionIndex.named.get(identity.capability);
    if (capabilityDefinitions === undefined) {
      definitionIndex.named.set(identity.capability, new Map([[identity.name, definition]]));
    } else {
      capabilityDefinitions.set(identity.name, definition);
    }
  }

  appendByCapability();
};

/** 将按选项传入的显式定义追加到提供者解析结果 */
const appendExplicitDefinitions = (
  definitions: MutableCoreProviderDefinitions,
  definitionIndex: DefinitionIndex,
  explicit: CoreProviderDefinitions,
): void => {
  const collections: ReadonlyArray<readonly [ProviderCapability, CoreDefinitionCollection]> = [
    [ProviderCapability.Shape, explicit.shapes],
    [ProviderCapability.Boundary, explicit.boundaries],
    [ProviderCapability.Clip, explicit.clips],
    [ProviderCapability.Arrow, explicit.arrows],
    [ProviderCapability.Mark, explicit.marks],
    [ProviderCapability.Pattern, explicit.patterns],
    [ProviderCapability.Path, explicit.paths],
    [ProviderCapability.Composite, explicit.composites],
  ];

  for (const [capability, entries] of collections) {
    for (const definition of entries ?? []) appendDefinition(definitions, definitionIndex, capability, definition);
  }
};

/** 冻结有内容的编译选项集合，避免引入无意义空选项 */
const freezeResolvedDefinitions = (definitions: MutableCoreProviderDefinitions): CoreProviderDefinitions => {
  const result: CoreProviderDefinitions = {
    ...(definitions.shapes.length > 0 ? { shapes: Object.freeze(definitions.shapes) } : {}),
    ...(definitions.boundaries.length > 0 ? { boundaries: Object.freeze(definitions.boundaries) } : {}),
    ...(definitions.clips.length > 0 ? { clips: Object.freeze(definitions.clips) } : {}),
    ...(definitions.arrows.length > 0 ? { arrows: Object.freeze(definitions.arrows) } : {}),
    ...(definitions.marks.length > 0 ? { marks: Object.freeze(definitions.marks) } : {}),
    ...(definitions.patterns.length > 0 ? { patterns: Object.freeze(definitions.patterns) } : {}),
    ...(definitions.paths.length > 0 ? { paths: Object.freeze(definitions.paths) } : {}),
    ...(definitions.composites.length > 0 ? { composites: Object.freeze(definitions.composites) } : {}),
  };
  return Object.freeze(result);
};

/**
 * 解析 Core 提供者贡献的可达定义闭包
 * @description 在调用任何创建函数前完成提供者、缺失依赖与环路预检，再按依赖优先顺序把同键参数交给所属方物化定义
 * @throws 工厂执行失败时抛出 RetikzCoreError，保留原始异常为 cause，并通过 details.key 标识失败的提供者
 */
export const resolveCoreProviderDependencies = (
  options: CoreProviderDependenciesResolveOptions,
): CoreProviderDefinitions => {
  /** 判断定义标识是否与提供者键相同 */
  const doesDefinitionMatchKey = (key: CoreProviderKey, definition: CoreProviderDefinition): boolean => {
    const identity = readDefinitionIdentity(key.capability, definition);
    return key.capability === ProviderCapability.Composite
      ? identity.capability === ProviderCapability.Composite &&
          identity.namespace === key.namespace &&
          identity.type === key.type
      : identity.capability === key.capability && identity.name === key.name;
  };

  const { index, roots, definitions: explicit } = buildProviderIndex(options);
  const orderedProviders = collectReachableProviders(index, roots);
  const definitions: MutableCoreProviderDefinitions = {
    shapes: [],
    boundaries: [],
    clips: [],
    arrows: [],
    marks: [],
    patterns: [],
    paths: [],
    composites: [],
  };
  const definitionIndex: DefinitionIndex = {
    named: new Map(),
    composites: new Map(),
  };

  for (const provider of orderedProviders) {
    // 同键声明已验证工厂引用一致；此处集中恢复工厂与其参数的关联
    const makeDefinition = provider.makeDefinition as CoreDependencyProvider<unknown>['makeDefinition'];
    let definition: CoreProviderDefinition;
    try {
      definition = makeDefinition(Object.freeze(provider.params));
    } catch (cause) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Provider,
        `resolveCoreProviderDependencies: provider ${formatProviderKey(provider.key)} failed to create its definition`,
        { cause, details: { key: provider.key } },
      );
    }
    if (!doesDefinitionMatchKey(provider.key, definition)) {
      const returnedIdentity = readDefinitionIdentity(provider.key.capability, definition);
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `resolveCoreProviderDependencies: provider ${formatProviderKey(provider.key)} returned definition ${
          returnedIdentity.capability === ProviderCapability.Composite
            ? `${returnedIdentity.namespace}.${returnedIdentity.type}`
            : returnedIdentity.name
        }`,
      );
    }

    appendDefinition(definitions, definitionIndex, provider.key.capability, definition);
  }

  appendExplicitDefinitions(definitions, definitionIndex, explicit);

  return freezeResolvedDefinitions(definitions);
};
