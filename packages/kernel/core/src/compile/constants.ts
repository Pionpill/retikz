import type { ValueOf } from '@retikz/foundation';

/** 相对定位默认距离 */
export const DEFAULT_NODE_DISTANCE = 24;

/** Node label 与 node 边界的默认距离 */
export const DEFAULT_LABEL_DISTANCE = 12;

/** canonical visual bounds 对 miter join 使用的保守上限 */
export const CANONICAL_STROKE_MITER_LIMIT = 10;

/** 默认字号，同时作为 preset 与 rem 的解析根字号 */
export const DEFAULT_FONT_SIZE = 16;

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
