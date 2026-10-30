import type { PropertyPath } from '@retikz/foundation';

import type { GroupPrimitive, Transform } from '../../contract';
import type { IRPosition } from '../../schemas';
import type { ElementCompileContext } from '../context';
import type { CompiledNodeLayout } from '../node';
import type { CompileOutput } from '../output';

/** Scope 子元素计算前的准备状态，不代表包络已就绪 */
export type ScopeCompilationPreparation = Readonly<{
  /** 子元素有效继承上下文 */
  scope: ElementCompileContext;
  /** 已在父坐标系解析的放置目标 */
  positionTarget?: IRPosition;
  /** 不依赖包络时可提前使用的自身变换 */
  preliminaryTransforms?: Array<Transform>;
}>;

/** Scope 编译状态，仅持有自身包络、输出与组装属性 */
export type CompiledScope = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: PropertyPath;
  /** 局部内容包络，包含空内容时的既有退化布局 */
  envelope: CompiledNodeLayout;
  /** Scope 输出的包装属性，不包含 children */
  group: Omit<GroupPrimitive, 'children'>;
  /** 自身装饰及其资源，不重复持有子输出 */
  output: CompileOutput;
}>;
