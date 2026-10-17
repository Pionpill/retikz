import type { Lang } from '@/i18n';

/** 区间生成的主要阶段 */
export const intervalResolutionFlowI18n: Record<
  Lang,
  Record<'group' | 'segment' | 'project' | 'connect' | 'lower' | 'render', string>
> = {
  zh: {
    group: '归一化输入\n便捷属性 → bounds',
    segment: '准备数据\n变换、分组与堆叠',
    project: '构造区间\n比例尺 → Cell',
    connect: '投影区域\nprojectCell',
    lower: '生成 Node\n形状、样式与标签',
    render: '编译与渲染\nScene → SVG / Canvas',
  },
  en: {
    group: 'Normalize input\nShorthand → bounds',
    segment: 'Prepare data\nTransform, group, stack',
    project: 'Build intervals\nScales → Cell',
    connect: 'Project regions\nprojectCell',
    lower: 'Create Nodes\nShapes, styles, labels',
    render: 'Compile and render\nScene → SVG / Canvas',
  },
};
