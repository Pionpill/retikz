import type { ValueOf } from '@retikz/foundation';

import type { AnyCompositeDefinition } from '../composite';
import type { BoundaryDefinition, ShapeDefinition } from '../node';
import type { AnyPathDefinition, ArrowDefinition, MarkDefinition } from '../path';
import type { ClipDefinition } from '../scope';
import type { PatternDefinition } from '../style';

/** Core 提供者能力的稳定判别值 */
export const ProviderCapability = {
  Shape: 'shape',
  Boundary: 'boundary',
  Clip: 'clip',
  Arrow: 'arrow',
  Mark: 'mark',
  Pattern: 'pattern',
  Path: 'path',
  Composite: 'composite',
} as const;

/** Core 提供者能力判别值 */
export type ProviderCapability = ValueOf<typeof ProviderCapability>;

/** 非复合提供者的完整能力/名称标识 */
export type NamedCoreProviderKey = Readonly<{
  /** 提供者所属的 Core 能力 */
  capability: Exclude<ProviderCapability, typeof ProviderCapability.Composite>;
  /** 能力内稳定的提供者名称 */
  name: string;
}>;

/** 复合提供者的完整命名空间/类型标识 */
export type CompositeCoreProviderKey = Readonly<{
  /** 复合提供者的能力 */
  capability: typeof ProviderCapability.Composite;
  /** 复合提供者所属命名空间 */
  namespace: string;
  /** 复合提供者所属的局部类型 */
  type: string;
}>;

/** Core 提供者的完整标识 */
export type CoreProviderKey = NamedCoreProviderKey | CompositeCoreProviderKey;

/** 所有可由 Core 提供者图物化的定义 */
export type CoreProviderDefinition =
  | ShapeDefinition
  | BoundaryDefinition
  | ClipDefinition
  | ArrowDefinition
  | MarkDefinition
  | PatternDefinition
  | AnyPathDefinition
  | AnyCompositeDefinition;

/** 按 Core 编译选项分类的提供者定义 */
export type CoreProviderDefinitions = Readonly<{
  /** 形状定义 */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /** 连接表面定义 */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /** 裁剪定义 */
  clips?: ReadonlyArray<ClipDefinition>;
  /** 箭头定义 */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /** 普通路径标记定义 */
  marks?: ReadonlyArray<MarkDefinition>;
  /** 图案定义 */
  patterns?: ReadonlyArray<PatternDefinition>;
  /** 路径定义 */
  paths?: ReadonlyArray<AnyPathDefinition>;
  /** 复合定义 */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;

/**
 * 单个提供者的可达依赖与所属方参数
 * @template TParams 所属方解释的运行时参数；无参数的静态提供者使用 void
 */
export type CoreDependencyProvider<TParams = void> = Readonly<{
  /** 此提供者唯一生成的 Core 提供者键 */
  key: CoreProviderKey;
  /** 此定义需要的有序直接依赖；省略时无依赖 */
  dependencies?: ReadonlyArray<CoreProviderKey>;
  /** 当前编写实例的参数；省略或为 undefined 时不贡献参数，Core 保留已提供参数的引用 */
  params?: TParams;
  /**
   * 按贡献顺序接收同键已提供的参数，由所属方合并并创建唯一定义；无参数时接收空数组
   * @remarks 作者负责保证返回定义的能力类别与 key 一致，Core 不探测定义结构以校验类别
   */
  makeDefinition: (contributions: ReadonlyArray<TParams>) => CoreProviderDefinition;
}>;

/**
 * 异构提供者集合的参数擦除视图
 * @remarks 工厂仅由依赖解析器在同键、同工厂聚合后调用；提供者作者应使用带精确参数的 CoreDependencyProvider
 */
export type AnyCoreDependencyProvider = Omit<CoreDependencyProvider<unknown>, 'makeDefinition'> &
  Readonly<{
    /** 保留工厂身份，不允许通过擦除视图传入未经关联的参数 */
    makeDefinition: (contributions: ReadonlyArray<never>) => CoreProviderDefinition;
  }>;

/** 一次编写贡献要求的根节点与可用提供者目录 */
export type CoreProviderContribution = Readonly<{
  /** 当前编写节点实际要求的有序根节点 */
  roots: ReadonlyArray<CoreProviderKey>;
  /** 此贡献显式携带的提供者 */
  providers: ReadonlyArray<AnyCoreDependencyProvider>;
}>;

/** Core 提供者图的纯解析输入 */
export type ResolveCoreProviderDependenciesOptions = Readonly<{
  /** 所有适配器无关的编写贡献 */
  contributions: ReadonlyArray<CoreProviderContribution>;
  /** 在提供者定义之后追加的最终显式定义 */
  definitions?: CoreProviderDefinitions;
}>;

/** Core 提供者图解析后可直接传入 CompileOptions 的定义 */
export type ResolvedCoreProviderOptions = CoreProviderDefinitions;
