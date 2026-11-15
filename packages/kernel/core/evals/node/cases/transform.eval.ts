import type { NodeEvalCase } from '../suite';

/** 变换与层叠 */
export const transformCases: Array<NodeEvalCase> = [
  {
    id: 'NB001',
    task: '将节点围绕自身中心顺时针旋转 30 度；不要移动或缩放节点。',
    expected: {
      type: 'node',
      rotate: 30,
    },
    mustOmit: ['scale', 'animations'],
  },
  {
    id: 'NB002',
    task: '创建圆角矩形节点，边角半径 6 个用户单位，节点自身不旋转。',
    expected: {
      type: 'node',
      shape: 'rectangle',
      cornerRadius: 6,
    },
  },
  {
    id: 'NB003',
    task: '把节点沿两个轴都放大到原来的 1.5 倍，连线附着位置也随节点缩放；不修改源宽度。',
    expected: {
      type: 'node',
      scale: 1.5,
    },
  },
  {
    id: 'NB004',
    task: '保持可组合的缩放配置：统一后备倍率 2，只将水平方向改为 3，垂直方向改为 0.5。',
    expected: {
      type: 'node',
      scale: {
        default: 2,
        x: 3,
        y: 0.5,
      },
    },
  },
  {
    id: 'NB005',
    task: '保留可组合缩放配置：统一后备倍率 2，只将水平倍率覆盖为 3；垂直方向继续用统一后备，不显式填写。',
    expected: {
      type: 'node',
      scale: {
        default: 2,
        x: 3,
      },
    },
    mustOmit: ['scale.y'],
  },
  {
    id: 'NB006',
    task: '把节点的同父级绘制层级设为负 2，让它排在层级 0 的兄弟节点后方；不改变几何位置。',
    expected: {
      type: 'node',
      zIndex: -2,
    },
    mustOmit: ['position'],
  },
];
