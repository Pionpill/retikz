import type { PropertyPath, ValueOf } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../contract';

/** 内置编译警告码 */
export const BuiltinCompileWarningCode = {
  UnresolvedNodeReference: 'UNRESOLVED_NODE_REFERENCE',
  PathTooShort: 'PATH_TOO_SHORT',
  OffsetBaseUnresolved: 'OFFSET_BASE_UNRESOLVED',
  PolarOriginUnresolved: 'POLAR_ORIGIN_UNRESOLVED',
  AtTargetUnresolved: 'AT_TARGET_UNRESOLVED',
  DuplicateNodeId: 'DUPLICATE_NODE_ID',
  CompositeNotRegistered: 'COMPOSITE_NOT_REGISTERED',
  AnimationInvalidProperty: 'ANIMATION_INVALID_PROPERTY',
  ArcMissingRadius: 'ARC_MISSING_RADIUS',
  PartialArcNeedsBothAngles: 'PARTIAL_ARC_NEEDS_BOTH_ANGLES',
  PartialArcClosedInvalid: 'PARTIAL_ARC_CLOSED_INVALID',
  TexLowererMissing: 'TEX_LOWERER_MISSING',
  TexInvalid: 'TEX_INVALID',
  TexTextConflict: 'TEX_TEXT_CONFLICT',
  TextTexParseError: 'TEXT_TEX_PARSE_ERROR',
  BoundaryTightFallback: 'BOUNDARY_TIGHT_FALLBACK',
  TextAutoContrastUnresolved: 'TEXT_AUTO_CONTRAST_UNRESOLVED',
} as const;

export type BuiltinCompileWarningCode = ValueOf<typeof BuiltinCompileWarningCode>;

/** 编译警告码，支持内置名称和扩展能力提供的自定义名称 */
export type CompileWarningCode = BuiltinCompileWarningCode | (string & {});

/** 内部排序及重放使用的来源键，不从包入口导出 */
export const compileWarningOccurrence = Symbol('compileWarningOccurrence');

/** 编译期警告，由编译器收集后交给调用方展示 */
export type CompileWarning = {
  /** 机器可读 warning code */
  code: CompileWarningCode;
  /** 人类可读消息（英文） */
  message: string;
  /** 相对输入根对象的完整属性路径 */
  path: PropertyPath;
  /** @internal 不可枚举的完整来源，用于稳定排序和重放位置映射 */
  [compileWarningOccurrence]?: CompileOccurrenceLocator;
};

/** 把结构化编译 warning 格式化为统一的可读消息 */
export const formatCompileWarning = (warning: CompileWarning): string =>
  `[retikz] ${warning.code} at ${formatPropertyPath(warning.path)}: ${warning.message}`;
