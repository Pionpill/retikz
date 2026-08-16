import type { ArrowDefinition } from '../arrow';
import type { BoundaryDefinition } from '../boundary';
import type { ClipDefinition } from '../clip';
import type { AnyClipShapeDefinition } from '../clip-shape';
import type { AnyCompositeDefinition } from '../composite';
import type { PathGeneratorDefinition } from '../path-generator';
import type { AnyPathKindDefinition } from '../path-kind';
import type { PatternDefinition } from '../pattern';
import type { ShapeDefinition } from '../shape';
import type {
  AnyCoreProviderDefinition,
  CoreDependencyProvider,
  CoreProviderCapabilityValue,
  CoreProviderDefinitions,
  CoreProviderKey,
  ResolveCoreProviderDependenciesOptions,
} from './dependency-provider';

import { CoreProviderCapability } from './dependency-provider';

type ProviderEntry = {
  key: CoreProviderKey;
  dependencies: ReadonlyArray<CoreProviderKey>;
  datasets: Map<string, unknown>;
  makeDefinition: CoreDependencyProvider['makeDefinition'];
};

type NamedProviderCapability = Exclude<CoreProviderCapabilityValue, typeof CoreProviderCapability.Composite>;

/** 提供者索引将复合定义的命名空间/类型标识保存在独立映射维度中 */
type ProviderIndex = Readonly<{
  named: Map<NamedProviderCapability, Map<string, ProviderEntry>>;
  composites: Map<string, Map<string, ProviderEntry>>;
}>;

type MutableCoreProviderDefinitions = {
  shapes: Array<ShapeDefinition>;
  boundaries: Array<BoundaryDefinition>;
  clips: Array<ClipDefinition>;
  clipShapes: Array<AnyClipShapeDefinition>;
  arrows: Array<ArrowDefinition>;
  patterns: Array<PatternDefinition>;
  pathGenerators: Array<PathGeneratorDefinition>;
  pathKinds: Array<AnyPathKindDefinition>;
  composites: Array<AnyCompositeDefinition>;
};

type DefinitionIndex = Readonly<{
  named: Map<NamedProviderCapability, Map<string, AnyCoreProviderDefinition>>;
  composites: Map<string, Map<string, AnyCoreProviderDefinition>>;
}>;

type CoreDefinitionCollection = ReadonlyArray<AnyCoreProviderDefinition> | undefined;

/** 把完整 key 格式化为面向作者的诊断名称 */
const keyName = (key: CoreProviderKey): string =>
  key.capability === CoreProviderCapability.Composite
    ? `${key.capability}:${key.namespace}.${key.type}`
    : `${key.capability}:${key.name}`;

/** 校验公开提供者图键 */
const assertProviderKey = (key: CoreProviderKey, path: string): void => {
  if (key.capability === CoreProviderCapability.Composite) {
    if (key.namespace.length === 0 || key.type.length === 0) {
      throw new Error(`resolveCoreProviderDependencies: ${path} must have a non-empty namespace and type`);
    }
    return;
  }
  if (key.name.length === 0) {
    throw new Error(`resolveCoreProviderDependencies: ${path} must have a non-empty name`);
  }
};

/** 按能力与完整键读取提供者，避免字符串拼接歧义 */
const providerAt = (index: ProviderIndex, key: CoreProviderKey): ProviderEntry | undefined => {
  if (key.capability === CoreProviderCapability.Composite) {
    return index.composites.get(key.namespace)?.get(key.type);
  }
  return index.named.get(key.capability)?.get(key.name);
};

/** 写入完整 Core 提供者键对应的提供者 */
const setProvider = (index: ProviderIndex, entry: ProviderEntry): void => {
  if (entry.key.capability === CoreProviderCapability.Composite) {
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
const sameDependencies = (left: ReadonlyArray<CoreProviderKey>, right: ReadonlyArray<CoreProviderKey>): boolean =>
  left.length === right.length &&
  left.every((dependency, index) => {
    const candidate = right[index];
    if (dependency.capability !== candidate.capability) return false;
    if (dependency.capability === CoreProviderCapability.Composite) {
      return (
        candidate.capability === CoreProviderCapability.Composite &&
        dependency.namespace === candidate.namespace &&
        dependency.type === candidate.type
      );
    }
    return candidate.capability !== CoreProviderCapability.Composite && dependency.name === candidate.name;
  });

/** 合并同一提供者键的数据集引用 */
const mergeDatasets = (entry: ProviderEntry, provider: CoreDependencyProvider, path: string): void => {
  for (const [reference, value] of Object.entries(provider.datasets)) {
    if (reference.length === 0) {
      throw new Error(`resolveCoreProviderDependencies: ${path}.datasets contains an empty reference`);
    }
    if (!entry.datasets.has(reference)) {
      entry.datasets.set(reference, value);
      continue;
    }
    if (!Object.is(entry.datasets.get(reference), value)) {
      throw new Error(
        `resolveCoreProviderDependencies: provider ${keyName(entry.key)} dataset "${reference}" conflicts by identity`,
      );
    }
  }
};

/** 建立完整提供者索引，并在创建函数执行前完成声明与数据集合并 */
const buildProviderIndex = (
  options: ResolveCoreProviderDependenciesOptions,
): { index: ProviderIndex; roots: Array<CoreProviderKey>; definitions: CoreProviderDefinitions } => {
  const index: ProviderIndex = {
    named: new Map(),
    composites: new Map(),
  };
  const roots: Array<CoreProviderKey> = [];

  for (const [contributionIndex, contribution] of options.contributions.entries()) {
    for (const [rootIndex, root] of contribution.roots.entries()) {
      assertProviderKey(root, `contributions[${contributionIndex}].roots[${rootIndex}]`);
      roots.push(root);
    }
    for (const [providerIndex, provider] of contribution.providers.entries()) {
      const path = `contributions[${contributionIndex}].providers[${providerIndex}]`;
      assertProviderKey(provider.key, `${path}.key`);
      const dependencies = provider.dependencies.map((dependency, dependencyIndex) => {
        assertProviderKey(dependency, `${path}.dependencies[${dependencyIndex}]`);
        return dependency;
      });
      const existing = providerAt(index, provider.key);
      if (existing === undefined) {
        const entry: ProviderEntry = {
          key: provider.key,
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
          `resolveCoreProviderDependencies: provider ${keyName(provider.key)} has conflicting maker references`,
        );
      }
      if (!sameDependencies(existing.dependencies, dependencies)) {
        throw new Error(
          `resolveCoreProviderDependencies: provider ${keyName(provider.key)} has conflicting ordered dependencies`,
        );
      }
      mergeDatasets(existing, provider, path);
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
          ...(explicit.clipShapes === undefined ? {} : { clipShapes: [...explicit.clipShapes] }),
          ...(explicit.arrows === undefined ? {} : { arrows: [...explicit.arrows] }),
          ...(explicit.patterns === undefined ? {} : { patterns: [...explicit.patterns] }),
          ...(explicit.pathGenerators === undefined ? {} : { pathGenerators: [...explicit.pathGenerators] }),
          ...(explicit.pathKinds === undefined ? {} : { pathKinds: [...explicit.pathKinds] }),
          ...(explicit.composites === undefined ? {} : { composites: [...explicit.composites] }),
        };
  return { index, roots, definitions };
};

/** 预检根节点的可达闭包并生成稳定的依赖优先顺序 */
const reachableProviders = (index: ProviderIndex, roots: ReadonlyArray<CoreProviderKey>): Array<ProviderEntry> => {
  const ordered: Array<ProviderEntry> = [];
  const state = new Map<ProviderEntry, 'visiting' | 'visited'>();
  const stack: Array<ProviderEntry> = [];

  const visit = (key: CoreProviderKey, parent?: ProviderEntry): void => {
    const entry = providerAt(index, key);
    if (entry === undefined) {
      const chain = [...stack.map(candidate => keyName(candidate.key)), keyName(key)].join(' -> ');
      const relation = parent === undefined ? 'root' : 'dependency';
      throw new Error(`resolveCoreProviderDependencies: missing ${relation} provider in chain ${chain}`);
    }
    const currentState = state.get(entry);
    if (currentState === 'visited') return;
    if (currentState === 'visiting') {
      const cycleStart = stack.indexOf(entry);
      const cycle = [...stack.slice(cycleStart).map(candidate => keyName(candidate.key)), keyName(entry.key)].join(
        ' -> ',
      );
      throw new Error(`resolveCoreProviderDependencies: provider cycle ${cycle}`);
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

/** 从路径种类 schema 读取提供者键 */
const pathKindName = (definition: AnyPathKindDefinition): string => definition.name;

type DefinitionIdentity =
  | Readonly<{ capability: NamedProviderCapability; name: string }>
  | Readonly<{ capability: typeof CoreProviderCapability.Composite; namespace: string; type: string }>;

/** 在接受创建函数输出前推断被擦除定义所属的能力 */
const definitionCapabilityOf = (definition: AnyCoreProviderDefinition): CoreProviderCapabilityValue => {
  if ('namespace' in definition && 'type' in definition) return CoreProviderCapability.Composite;
  if ('circumscribe' in definition && 'boundaryPoint' in definition) return CoreProviderCapability.Shape;
  if ('lineContactX' in definition && 'emit' in definition) return CoreProviderCapability.Arrow;
  if ('name' in definition && 'emit' in definition) return CoreProviderCapability.Pattern;
  if ('paramsSchema' in definition && 'generate' in definition) return CoreProviderCapability.PathGenerator;
  if ('kind' in definition && 'schema' in definition && 'lower' in definition) return CoreProviderCapability.ClipShape;
  if ('kind' in definition && 'schema' in definition && 'resolve' in definition) return CoreProviderCapability.Clip;
  if ('paramsSchema' in definition && 'boundaryPoint' in definition) return CoreProviderCapability.Boundary;
  if ('compile' in definition && 'schema' in definition) return CoreProviderCapability.PathKind;
  throw new Error('resolveCoreProviderDependencies: maker returned an unrecognized definition capability');
};

/** 从定义读取指定能力的注册表标识 */
const definitionIdentity = (
  capability: CoreProviderCapabilityValue,
  definition: AnyCoreProviderDefinition,
): DefinitionIdentity => {
  if (definitionCapabilityOf(definition) !== capability) {
    throw new Error(
      `resolveCoreProviderDependencies: expected ${capability} definition but received ${definitionCapabilityOf(definition)}`,
    );
  }
  switch (capability) {
    case CoreProviderCapability.Shape:
      return { capability, name: (definition as ShapeDefinition).name };
    case CoreProviderCapability.Boundary:
      return { capability, name: (definition as BoundaryDefinition).name };
    case CoreProviderCapability.Clip:
      return { capability, name: (definition as ClipDefinition).kind };
    case CoreProviderCapability.ClipShape:
      return { capability, name: (definition as AnyClipShapeDefinition).kind };
    case CoreProviderCapability.Arrow:
      return { capability, name: (definition as ArrowDefinition).name };
    case CoreProviderCapability.Pattern:
      return { capability, name: (definition as PatternDefinition).name };
    case CoreProviderCapability.PathGenerator:
      return { capability, name: (definition as PathGeneratorDefinition).name };
    case CoreProviderCapability.PathKind:
      return { capability, name: pathKindName(definition as AnyPathKindDefinition) };
    case CoreProviderCapability.Composite: {
      const composite = definition as AnyCompositeDefinition;
      return { capability, namespace: composite.namespace, type: composite.type };
    }
  }
};

/** 判断定义标识是否与提供者键相同 */
const definitionMatchesKey = (key: CoreProviderKey, definition: AnyCoreProviderDefinition): boolean => {
  const identity = definitionIdentity(key.capability, definition);
  return key.capability === CoreProviderCapability.Composite
    ? identity.capability === CoreProviderCapability.Composite &&
        identity.namespace === key.namespace &&
        identity.type === key.type
    : identity.capability === key.capability && identity.name === key.name;
};

/** 把定义放入其所属的编译选项集合 */
const appendByCapability = (
  definitions: MutableCoreProviderDefinitions,
  capability: CoreProviderCapabilityValue,
  definition: AnyCoreProviderDefinition,
): void => {
  switch (capability) {
    case CoreProviderCapability.Shape:
      definitions.shapes.push(definition as ShapeDefinition);
      return;
    case CoreProviderCapability.Boundary:
      definitions.boundaries.push(definition as BoundaryDefinition);
      return;
    case CoreProviderCapability.Clip:
      definitions.clips.push(definition as ClipDefinition);
      return;
    case CoreProviderCapability.ClipShape:
      definitions.clipShapes.push(definition as AnyClipShapeDefinition);
      return;
    case CoreProviderCapability.Arrow:
      definitions.arrows.push(definition as ArrowDefinition);
      return;
    case CoreProviderCapability.Pattern:
      definitions.patterns.push(definition as PatternDefinition);
      return;
    case CoreProviderCapability.PathGenerator:
      definitions.pathGenerators.push(definition as PathGeneratorDefinition);
      return;
    case CoreProviderCapability.PathKind:
      definitions.pathKinds.push(definition as AnyPathKindDefinition);
      return;
    case CoreProviderCapability.Composite:
      definitions.composites.push(definition as AnyCompositeDefinition);
  }
};

/** 向最终定义追加一个键唯一的定义 */
const appendDefinition = (
  definitions: MutableCoreProviderDefinitions,
  definitionIndex: DefinitionIndex,
  capability: CoreProviderCapabilityValue,
  definition: AnyCoreProviderDefinition,
): void => {
  const identity = definitionIdentity(capability, definition);
  const existing =
    identity.capability === CoreProviderCapability.Composite
      ? definitionIndex.composites.get(identity.namespace)?.get(identity.type)
      : definitionIndex.named.get(identity.capability)?.get(identity.name);
  if (existing !== undefined) {
    if (existing === definition) return;
    throw new Error(
      `resolveCoreProviderDependencies: definition conflict for ${keyName(
        capability === CoreProviderCapability.Composite
          ? {
              capability,
              namespace: identity.capability === CoreProviderCapability.Composite ? identity.namespace : '',
              type: identity.capability === CoreProviderCapability.Composite ? identity.type : '',
            }
          : { capability, name: identity.capability === CoreProviderCapability.Composite ? '' : identity.name },
      )} uses different objects`,
    );
  }
  if (identity.capability === CoreProviderCapability.Composite) {
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
  appendByCapability(definitions, capability, definition);
};

/** 将按选项传入的显式定义追加到提供者解析结果 */
const appendExplicitDefinitions = (
  definitions: MutableCoreProviderDefinitions,
  definitionIndex: DefinitionIndex,
  explicit: CoreProviderDefinitions,
): void => {
  const collections: ReadonlyArray<readonly [CoreProviderCapabilityValue, CoreDefinitionCollection]> = [
    [CoreProviderCapability.Shape, explicit.shapes],
    [CoreProviderCapability.Boundary, explicit.boundaries],
    [CoreProviderCapability.Clip, explicit.clips],
    [CoreProviderCapability.ClipShape, explicit.clipShapes],
    [CoreProviderCapability.Arrow, explicit.arrows],
    [CoreProviderCapability.Pattern, explicit.patterns],
    [CoreProviderCapability.PathGenerator, explicit.pathGenerators],
    [CoreProviderCapability.PathKind, explicit.pathKinds],
    [CoreProviderCapability.Composite, explicit.composites],
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
    ...(definitions.clipShapes.length > 0 ? { clipShapes: Object.freeze(definitions.clipShapes) } : {}),
    ...(definitions.arrows.length > 0 ? { arrows: Object.freeze(definitions.arrows) } : {}),
    ...(definitions.patterns.length > 0 ? { patterns: Object.freeze(definitions.patterns) } : {}),
    ...(definitions.pathGenerators.length > 0 ? { pathGenerators: Object.freeze(definitions.pathGenerators) } : {}),
    ...(definitions.pathKinds.length > 0 ? { pathKinds: Object.freeze(definitions.pathKinds) } : {}),
    ...(definitions.composites.length > 0 ? { composites: Object.freeze(definitions.composites) } : {}),
  };
  return Object.freeze(result);
};

/**
 * 解析 Core 提供者贡献的可达定义闭包
 * @description 在调用任何创建函数前完成提供者、数据集、缺失依赖与环路预检，再按依赖优先顺序物化并追加显式定义
 */
export const resolveCoreProviderDependencies = (
  options: ResolveCoreProviderDependenciesOptions,
): CoreProviderDefinitions => {
  const { index, roots, definitions: explicit } = buildProviderIndex(options);
  const orderedProviders = reachableProviders(index, roots);
  const definitions: MutableCoreProviderDefinitions = {
    shapes: [],
    boundaries: [],
    clips: [],
    clipShapes: [],
    arrows: [],
    patterns: [],
    pathGenerators: [],
    pathKinds: [],
    composites: [],
  };
  const definitionIndex: DefinitionIndex = {
    named: new Map(),
    composites: new Map(),
  };

  for (const provider of orderedProviders) {
    const datasets = Object.freeze(Object.fromEntries(provider.datasets));
    const definition = provider.makeDefinition(datasets);
    if (!definitionMatchesKey(provider.key, definition)) {
      const returnedIdentity = definitionIdentity(provider.key.capability, definition);
      throw new Error(
        `resolveCoreProviderDependencies: provider ${keyName(provider.key)} returned definition ${
          returnedIdentity.capability === CoreProviderCapability.Composite
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
