import { compileToScene } from '@retikz/core';

import type { PlotLabelMeasure } from '../../src/shared';

/** 布局单元测试显式使用 Core 默认字体环境；宿主继承由编译集成测试覆盖 */
export const measureLabel: PlotLabelMeasure = (node, fontSize) =>
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: node.text,
          style: { font: { ...node.style?.font, size: node.style?.font?.size ?? fontSize } },
          layout: { ...node.layout, padding: 0, minimumSize: 0 },
        },
      ],
    },
    { padding: 0 },
  ).scene.layout;
