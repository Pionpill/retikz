import { path, renderToSvgString, scene } from '@retikz/vanilla';

import { ringMark } from './ring-mark';

/** 自定义圆环的完整作者输入 */
export const ringScene = scene({
  viewBox: { x: -160, y: -60, width: 320, height: 120 },
  children: [
    path({
      way: [
        [-120, 0],
        [120, 0],
      ],
      arrow: '->',
      style: { stroke: 'currentColor', strokeWidth: 2 },
      marks: [{ pos: 0.5, shape: 'ring', params: { radius: 3 }, scale: 2, stroke: '#2563eb' }],
    }),
  ],
});

/** 使用同一标记定义生成 SVG */
export const svg = renderToSvgString(ringScene, { compile: { marks: [ringMark] } });
