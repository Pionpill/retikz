/**
 * @retikz/core 公开 API
 *
 * 任何 framework adapter（@retikz/react、@retikz/vue、@retikz/canvas、@retikz/ssr）
 * 只能 import 本文件导出的内容，不准走子路径。
 *
 * 本包零 React、零 DOM 依赖。
 */

// IR
export {
  PositionSchema,
  PolarPositionSchema,
  TargetSchema,
  MoveStepSchema,
  LineStepSchema,
  StepSchema,
  NodeSchema,
  PathSchema,
  ChildSchema,
  SceneSchema,
  CURRENT_IR_VERSION,
} from './ir';
export type {
  IRPosition,
  IRTarget,
  IRMoveStep,
  IRLineStep,
  IRStep,
  IRNode,
  IRPath,
  IRChild,
  IR,
} from './ir';

// Primitive (Scene 数据模型)
export type {
  ScenePrimitive,
  RectPrim,
  TextPrim,
  PathPrim,
  GroupPrim,
  ViewBox,
  Scene,
} from './primitive';

// Compile (IR → Scene)
export type {
  FontSpec,
  TextMetrics,
  TextMeasurer,
  CompileOptions,
} from './compile';
export { fallbackMeasurer, compileToScene } from './compile';

// Parsers
export type { WayItem, WayDSL } from './parsers';
export { parseWay } from './parsers';

// Geometry
// RECT_ANCHORS（const 集合，值）与 RectAnchor（派生 type）配对，名字不撞
export type { Position, Rect, RectAnchor, PolarPosition } from './geometry';
export { point, rect, RECT_ANCHORS, polar } from './geometry';
