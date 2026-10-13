import type { Lang } from '@/i18n';

/** 布局主链与后续消费方 */
export const layoutImplementationI18n: Record<
  Lang,
  Record<'content' | 'shape' | 'labels' | 'layout' | 'emit' | 'reference', string>
> = {
  zh: {
    content: 'layoutNodeContent\n物理行、正文宽高与基线',
    shape: 'circumscribe\n结合 padding 与尺寸约束',
    labels: 'layoutNodeLabels\n基于可见形状放置标签',
    layout: 'NodeLayout\n局部几何、正文与标签',
    emit: 'emitNodePrimitives\n形状、正文与标签图元',
    reference: 'nodeReferenceViewOf\n投影后供世界空间引用查询',
  },
  en: {
    content: 'layoutNodeContent\nPhysical lines, size, baselines',
    shape: 'circumscribe\nPadding and size constraints',
    labels: 'layoutNodeLabels\nPlace labels against the visible shape',
    layout: 'NodeLayout\nLocal geometry, text, and labels',
    emit: 'emitNodePrimitives\nShape, body, and label primitives',
    reference: 'nodeReferenceViewOf\nWorld-space queries after projection',
  },
};
