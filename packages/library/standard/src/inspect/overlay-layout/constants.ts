import { ALL_LAYOUT_INSPECT_OPTIONS, RECOMMENDED_LAYOUT_INSPECT_OPTIONS } from '../shared';

/** Overlay 布局检查器的预设选项 */
export const OVERLAY_LAYOUT_INSPECT_PRESETS = Object.freeze({
  /** 只保留内容边界 */
  Recommended: Object.freeze({
    ...RECOMMENDED_LAYOUT_INSPECT_OPTIONS,
    /** 是否显示放置关系 */
    placements: false,
    /** 是否显示定位锚点 */
    anchors: false,
    /** 是否显示叠放顺序 */
    stacking: false,
  }),
  /** 显示全部可用辅助信息 */
  All: Object.freeze({
    ...ALL_LAYOUT_INSPECT_OPTIONS,
    /** 是否显示放置关系 */
    placements: true,
    /** 是否显示定位锚点 */
    anchors: true,
    /** 是否显示叠放顺序 */
    stacking: true,
  }),
  /** 关闭当前范围的检查器 */
  Off: false,
});
