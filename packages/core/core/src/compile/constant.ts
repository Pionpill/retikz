import type { ValueOf } from '../types';

/** 编译期 warning code（机器可读）。 */
export const CompileWarningCode = {
  UnresolvedNodeReference: 'UNRESOLVED_NODE_REFERENCE',
  PathTooShort: 'PATH_TOO_SHORT',
  AnchorResolutionFailed: 'ANCHOR_RESOLUTION_FAILED',
  OffsetBaseUnresolved: 'OFFSET_BASE_UNRESOLVED',
  PolarOriginUnresolved: 'POLAR_ORIGIN_UNRESOLVED',
  AtTargetUnresolved: 'AT_TARGET_UNRESOLVED',
  RelativeInitialNoPrevEnd: 'RELATIVE_INITIAL_NO_PREV_END',
  BboxExtremeInput: 'BBOX_EXTREME_INPUT',
  DuplicateNodeId: 'DUPLICATE_NODE_ID',
  ShapeOverridesBuiltin: 'SHAPE_OVERRIDES_BUILTIN',
  ArrowOverridesBuiltin: 'ARROW_OVERRIDES_BUILTIN',
  PatternOverridesBuiltin: 'PATTERN_OVERRIDES_BUILTIN',
  CompositeNotRegistered: 'COMPOSITE_NOT_REGISTERED',
  AnimationInvalidProperty: 'ANIMATION_INVALID_PROPERTY',
  ArcMissingRadius: 'ARC_MISSING_RADIUS',
  PartialArcNeedsBothAngles: 'PARTIAL_ARC_NEEDS_BOTH_ANGLES',
} as const;

export type CompileWarningCodeValue =
  | ValueOf<typeof CompileWarningCode>
  | (string & {});

/** 编译期 warning：不影响 Scene 产物，交给调用方收集或展示。 */
export type CompileWarning = {
  /** 机器可读 warning code。 */
  code: CompileWarningCodeValue;
  /** 人类可读消息（英文）。 */
  message: string;
  /** IR locator 路径（jq-like），如 `children[3].path.children[1].to`。 */
  path: string;
};

export const formatCompileWarning = (warning: CompileWarning): string =>
  `[retikz] ${warning.code} at ${warning.path}: ${warning.message}`;
