import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectNodeGeometryI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    width: string;
    height: string;
    rotate: string;
    scaleX: string;
    scaleY: string;
    outline: string;
    boundary: string;
    box: string;
    bounds: string;
    content: string;
    baselines: string;
    keyPoints: string;
    labels: string;
    target: string;
  }
> = {
  zh: {
    title: '节点边界',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    width: '最小宽度',
    height: '最小高度',
    rotate: '旋转',
    scaleX: '水平缩放',
    scaleY: '垂直缩放',
    outline: '形状轮廓',
    boundary: '连接边界',
    box: '布局外框',
    bounds: '场景包围框',
    content: '文本框',
    baselines: '文本基线',
    keyPoints: '关键点',
    labels: '标签',
    target: '节点',
  },
  en: {
    title: 'Node bounds',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    width: 'Minimum width',
    height: 'Minimum height',
    rotate: 'Rotation',
    scaleX: 'Horizontal scale',
    scaleY: 'Vertical scale',
    outline: 'Shape outline',
    boundary: 'Connection boundary',
    box: 'Layout box',
    bounds: 'Scene AABB',
    content: 'Text box',
    baselines: 'Text baselines',
    keyPoints: 'Key points',
    labels: 'Labels',
    target: 'Node',
  },
};
