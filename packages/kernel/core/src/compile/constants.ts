/** 相对定位默认距离 */
export const DEFAULT_NODE_DISTANCE = 24;

/** 自动 layout 默认留白 */
export const DEFAULT_LAYOUT_PADDING = 10;

/** Node label 与 node 边界的默认距离 */
export const DEFAULT_LABEL_DISTANCE = 12;

/** 默认字号，同时作为 preset 与 rem 的解析根字号 */
export const DEFAULT_FONT_SIZE = 16;

/** 编译期 warning code（机器可读） */
export const CompileWarningCode = {
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
} as const;
