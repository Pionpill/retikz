import { ALL_LAYOUT_INSPECT_OPTIONS, RECOMMENDED_LAYOUT_INSPECT_OPTIONS } from '../shared';

/** Grid 布局检查器的预设选项 */
export const GRID_LAYOUT_INSPECT_PRESETS = Object.freeze({
  /** 保留内容边界、轨道边界和固定间距 */
  Recommended: Object.freeze({
    ...RECOMMENDED_LAYOUT_INSPECT_OPTIONS,
    /** 是否显示轨道边界 */
    tracks: true,
    /** 是否显示单元格边界 */
    cells: false,
    /** 是否显示固定间距 */
    gaps: true,
    /** 是否显示分布式剩余空间 */
    distributedSpace: false,
    /** 是否显示跨轨道项目 */
    spans: false,
  }),
  /** 显示全部可用辅助信息 */
  All: Object.freeze({
    ...ALL_LAYOUT_INSPECT_OPTIONS,
    /** 是否显示轨道边界 */
    tracks: true,
    /** 是否显示单元格边界 */
    cells: true,
    /** 是否显示固定间距 */
    gaps: true,
    /** 是否显示分布式剩余空间 */
    distributedSpace: true,
    /** 是否显示跨轨道项目 */
    spans: true,
  }),
  /** 关闭当前范围的检查器 */
  Off: false,
});
