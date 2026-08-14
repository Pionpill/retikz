import type { ArrowDefinition } from '../arrow';
import type { BoundaryDefinition } from '../boundary';
import type { ClipDefinition } from '../clip';
import type { AnyCompositeDefinition } from '../composite';
import type { PathGeneratorDefinition } from '../path-generator';
import type { AnyPathKindDefinition } from '../path-kind';
import type { PatternDefinition } from '../pattern';
import type { ShapeDefinition } from '../shape';

/** Core 提供者能力的稳定判别值 */
export const CoreProviderCapability = {
  Shape: 'shape',
  Boundary: 'boundary',
  Clip: 'clip',
  Arrow: 'arrow',
  Pattern: 'pattern',
  PathGenerator: 'pathGenerator',
  PathKind: 'pathKind',
  Composite: 'composite',
} as const;

/** Core 提供者能力判别值 */
export type CoreProviderCapabilityValue = (typeof CoreProviderCapability)[keyof typeof CoreProviderCapability];

/** 非复合提供者的完整能力/名称标识 */
export type NamedCoreProviderKey = Readonly<{
  /** 提供者所属的 Core 能力 */
  capability: Exclude<CoreProviderCapabilityValue, typeof CoreProviderCapability.Composite>;
  /** 能力内稳定的提供者名称 */
  name: string;
}>;

/** 复合提供者的完整命名空间/类型标识 */
export type CompositeCoreProviderKey = Readonly<{
  /** 复合提供者的能力 */
  capability: typeof CoreProviderCapability.Composite;
  /** 复合提供者所属命名空间 */
  namespace: string;
  /** 复合提供者所属的局部类型 */
  type: string;
}>;

/** Core 提供者的完整标识 */
export type CoreProviderKey = NamedCoreProviderKey | CompositeCoreProviderKey;

/** 所有可由 Core 提供者图物化的定义 */
export type AnyCoreProviderDefinition =
  | ShapeDefinition
  | BoundaryDefinition
  | ClipDefinition
  | ArrowDefinition
  | PatternDefinition
  | PathGeneratorDefinition
  | AnyPathKindDefinition
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
  /** 图案定义 */
  patterns?: ReadonlyArray<PatternDefinition>;
  /** 路径生成器定义 */
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  /** 路径种类定义 */
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>;
  /** 复合定义 */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;

/** 单个提供者的可达依赖和所属方局部数据 */
export type CoreDependencyProvider = Readonly<{
  /** 此提供者唯一生成的 Core 提供者键 */
  key: CoreProviderKey;
  /** 此定义需要的有序直接依赖 */
  dependencies: ReadonlyArray<CoreProviderKey>;
  /** 同键多个编写实例需要合并的所属方局部数据 */
  datasets: Readonly<Record<string, unknown>>;
  /** 使用当前键的完整合并数据创建唯一的定义 */
  makeDefinition: (mergedDatasets: Readonly<Record<string, unknown>>) => AnyCoreProviderDefinition;
}>;

/** 一次编写贡献要求的根节点与可用提供者目录 */
export type CoreProviderContribution = Readonly<{
  /** 当前编写节点实际要求的有序根节点 */
  roots: ReadonlyArray<CoreProviderKey>;
  /** 此贡献显式携带的提供者 */
  providers: ReadonlyArray<CoreDependencyProvider>;
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
