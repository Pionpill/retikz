import type { Lang } from '@/i18n';

/** 路径生成的主要阶段 */
export const pathResolutionFlowI18n: Record<
  Lang,
  Record<'group' | 'segment' | 'project' | 'connect' | 'lower' | 'render', string>
> = {
  zh: {
    group: '分系列、排序\nseries / color、order',
    segment: '检查位置、拆段\n有效位置、缺口与桥接',
    project: '生成路径点\n投影、极坐标采样',
    connect: '连接、闭合\ncurve、closure',
    lower: '生成 Path\n路径步骤、样式与标签',
    render: '编译与渲染\nScene → SVG / Canvas',
  },
  en: {
    group: 'Group and sort\nseries / color, order',
    segment: 'Check and split\nValid positions and gaps',
    project: 'Generate path points\nProjection, polar sampling',
    connect: 'Connect and close\ncurve, closure',
    lower: 'Create Paths\nSteps, styles, and labels',
    render: 'Compile and render\nScene → SVG / Canvas',
  },
};
