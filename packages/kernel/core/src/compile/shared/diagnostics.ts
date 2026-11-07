import type { PropertyPath, ValueOf } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { registerFatalProbeError } from '../../resolve';

/** 内置编译警告码 */
export const BuiltinCompileWarningCode = {
  /** 无法解析路径或变换引用的节点、锚点等定位目标 */
  UnresolvedNodeReference: 'UNRESOLVED_NODE_REFERENCE',
  /** 路径或路径步骤缺少构成有效几何所需的点或绘制内容 */
  PathTooShort: 'PATH_TOO_SHORT',
  /** 无法解析偏移平移所依赖的基准位置 */
  OffsetBaseUnresolved: 'OFFSET_BASE_UNRESOLVED',
  /** 无法解析极坐标平移所依赖的原点 */
  PolarOriginUnresolved: 'POLAR_ORIGIN_UNRESOLVED',
  /** 无法解析定位平移的目标位置 */
  AtTargetUnresolved: 'AT_TARGET_UNRESOLVED',
  /** 同一命名空间内重复注册 ID，后声明的绑定覆盖先声明的绑定 */
  DuplicateNodeId: 'DUPLICATE_NODE_ID',
  /** 待编译的复合组件未在当前注册表中注册 */
  CompositeNotRegistered: 'COMPOSITE_NOT_REGISTERED',
  /** 动画属性不适用于当前层级：场景根仅接受 viewBox，元素不接受 viewBox，非法轨道被丢弃 */
  AnimationInvalidProperty: 'ANIMATION_INVALID_PROPERTY',
  /** 圆弧步骤缺少半径，跳过整条路径 */
  ArcMissingRadius: 'ARC_MISSING_RADIUS',
  /** 局部圆或椭圆弧只提供了起始角或终止角，需要同时提供两者 */
  PartialArcNeedsBothAngles: 'PARTIAL_ARC_NEEDS_BOTH_ANGLES',
  /** 局部圆或椭圆弧使用了不适用的 closed 闭合模式，回退为 chord */
  PartialArcClosedInvalid: 'PARTIAL_ARC_CLOSED_INVALID',
  /** 文本包含公式但未注入 lowerTex，跳过对应公式片段 */
  TexLowererMissing: 'TEX_LOWERER_MISSING',
  /** lowerTex 返回 null，公式转换失败并跳过对应片段 */
  TexInvalid: 'TEX_INVALID',
  /** 文本中的公式分隔符未配对，无法完成内联 TeX 解析 */
  TextTexParseError: 'TEXT_TEX_PARSE_ERROR',
  /** 形状未提供所需的连接面包络，回退到根据视觉边界计算的包络 */
  BoundaryTightFallback: 'BOUNDARY_TIGHT_FALLBACK',
  /** 无法计算节点文字的自动对比色，回退为 currentColor */
  TextAutoContrastUnresolved: 'TEXT_AUTO_CONTRAST_UNRESOLVED',
} as const;

export type BuiltinCompileWarningCode = ValueOf<typeof BuiltinCompileWarningCode>;

/** 编译警告码，支持内置名称和扩展能力提供的自定义名称 */
export type CompileWarningCode = BuiltinCompileWarningCode | (string & {});

/** 编译期警告，由编译器收集后交给调用方展示 */
export type CompileWarning = {
  /** 机器可读 warning code */
  code: CompileWarningCode;
  /** 人类可读消息（英文） */
  message: string;
  /** 相对输入根对象的完整属性路径 */
  path: PropertyPath;
};

/** 创建 Core compile transaction 内部不可能状态错误 */
export const createCompileInvariantError = (message: string, options?: ErrorOptions): RetikzCoreError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.CompileInvariantViolation,
    message,
    details: Object.freeze({}),
    cause: options?.cause,
  });
  registerFatalProbeError(error);

  return error;
};
