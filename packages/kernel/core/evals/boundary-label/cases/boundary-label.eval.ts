import type { input } from 'zod';

import type { BoundaryLabelSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** BoundaryLabelSchema 的完整输入任务 */
export const cases: Array<CoreEvalCase<input<typeof BoundaryLabelSchema>>> = [
  {
    id: 'B001',
    task: '边界已由宿主指定。附文字 X，沿边切线起点对齐，放在内侧，间隙 0，沿切线旋转并保持正立。',
    expected: {
      text: 'X',
      align: 'start',
      placement: 'inside',
      distance: 0,
      rotate: 'tangent',
      keepUpright: true,
    },
  },
  {
    id: 'B002',
    task: '宿主边界标签写 Y，按径向旋转，其余保持缺省。',
    expected: {
      text: 'Y',
      rotate: 'radial',
    },
  },
  {
    id: 'B003',
    task: '标签写 Z，在宿主局部坐标系中顺时针旋转 20 度。放置侧及其余配置沿用宿主，不覆盖。',
    expected: {
      text: 'Z',
      rotate: 20,
    },
  },
  {
    id: 'B004',
    task: '已有边界支撑的标签文字 A 用颜色 #123456、透明度因子 0.4，仅将字体字重改为 bold，其余继承。',
    expected: {
      text: 'A',
      textColor: '#123456',
      opacity: 0.4,
      font: {
        weight: 'bold',
      },
    },
  },
  {
    id: 'B005',
    task: '边界标签写 X，仅把字体改为斜体。位置、距离和其余样式沿用宿主。',
    expected: {
      text: 'X',
      font: {
        style: 'italic',
      },
    },
  },
  {
    id: 'B006',
    task: '文字 L 距宿主边界 3 个单位。明确放在边界内侧。',
    expected: { text: 'L', distance: 3, placement: 'inside' },
    contrastId: 'B007',
  },
  {
    id: 'B007',
    task: '文字 L 距宿主边界 3 个单位。明确放在边界外侧。',
    expected: { text: 'L', distance: 3, placement: 'outside' },
    contrastId: 'B006',
  },
];
