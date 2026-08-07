import { ALL_LAYOUT_INSPECT_OPTIONS, RECOMMENDED_LAYOUT_INSPECT_OPTIONS } from '../shared';

/** Flex 布局检查器的预设选项 */
export const FLEX_LAYOUT_INSPECT_PRESETS = Object.freeze({
  /** 保留内容边界、行区域和固定间距 */
  Recommended: Object.freeze({
    ...RECOMMENDED_LAYOUT_INSPECT_OPTIONS,
    /** 是否显示行区域 */
    lines: true,
    /** 是否显示固定间距 */
    gaps: true,
    /** 是否显示分布式剩余空间 */
    distributedSpace: false,
  }),
  /** 显示全部可用辅助信息 */
  All: Object.freeze({
    ...ALL_LAYOUT_INSPECT_OPTIONS,
    /** 是否显示行区域 */
    lines: true,
    /** 是否显示固定间距 */
    gaps: true,
    /** 是否显示分布式剩余空间 */
    distributedSpace: true,
  }),
  /** 关闭当前范围的检查器 */
  Off: false,
});
