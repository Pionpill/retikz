/** Layout 检查器使用的所属包注册命名空间 */
export const LAYOUT_INSPECTOR_NAMESPACE = 'layout';

/** 布局检查器的推荐共享选项 */
export const RECOMMENDED_LAYOUT_INSPECT_OPTIONS = Object.freeze({
  /** 推荐状态下的边界显示项 */
  bounds: Object.freeze({
    /** 容器边界 */
    container: false,
    /** 内容边界 */
    content: true,
    /** 项目槽位边界 */
    slot: false,
    /** 项目分配边界 */
    allocation: false,
    /** 项目视觉边界 */
    visual: false,
  }),
  /** 推荐状态下的盒模型间距显示项 */
  spacing: Object.freeze({
    /** 容器内边距 */
    padding: false,
    /** 项目外边距 */
    margin: false,
  }),
  /** 是否显示溢出警告 */
  overflow: false,
  /** 是否显示对齐辅助线 */
  alignmentGuides: false,
  /** 是否显示项目标签 */
  labels: false,
});

/** 布局检查器的全部共享选项 */
export const ALL_LAYOUT_INSPECT_OPTIONS = Object.freeze({
  /** 全部状态下的边界显示项 */
  bounds: Object.freeze({
    /** 容器边界 */
    container: true,
    /** 内容边界 */
    content: true,
    /** 项目槽位边界 */
    slot: true,
    /** 项目分配边界 */
    allocation: true,
    /** 项目视觉边界 */
    visual: true,
  }),
  /** 全部状态下的盒模型间距显示项 */
  spacing: Object.freeze({
    /** 容器内边距 */
    padding: true,
    /** 项目外边距 */
    margin: true,
  }),
  /** 是否显示溢出警告 */
  overflow: true,
  /** 是否显示对齐辅助线 */
  alignmentGuides: true,
  /** 是否显示项目标签 */
  labels: true,
});
