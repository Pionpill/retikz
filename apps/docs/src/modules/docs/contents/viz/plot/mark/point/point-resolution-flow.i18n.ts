import type { Lang } from '@/i18n';

/** 点图元解析流程文案 */
export const pointResolutionFlowI18n: Record<
  Lang,
  Record<'input' | 'channels' | 'position' | 'node' | 'scene' | 'render', string>
> = {
  zh: {
    input: '统一输入\ntype: point',
    channels: '准备数据与通道\n数据视图、逐行属性',
    position: '确定最终位置\n尺度、投影与位置调整',
    node: '逐行生成 Node\n方向、内容、标签与锚点',
    scene: '编译 Node\n解析节点内容，生成 Scene',
    render: '渲染 Scene\nSVG / Canvas',
  },
  en: {
    input: 'Normalize inputs\ntype: point',
    channels: 'Prepare data and channels\nData views, per-row values',
    position: 'Resolve final positions\nScales, projection, adjustments',
    node: 'Create Nodes per row\nOrientation, content, anchors',
    scene: 'Compile Nodes\nResolve content into Scene',
    render: 'Render Scene\nSVG / Canvas',
  },
};
