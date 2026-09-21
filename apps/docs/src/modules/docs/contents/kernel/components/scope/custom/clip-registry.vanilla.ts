import type { InputScene } from '@retikz/vanilla';
import { renderToSvgString } from '@retikz/vanilla';

import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';

import { roundedRectClip } from './clip-registry.definition';

const input: InputScene = {
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip: { kind: 'rounded-rect', x: -150, y: -72, width: 300, height: 144, radius: 36 },
      children: [
        {
          type: 'node',
          position: [-88, -8],
          shape: 'circle',
          style: { fill: 'skyblue', stroke: 'none' },
          layout: { minimumSize: { width: 160, height: 160 } },
        },
        {
          type: 'node',
          position: [84, 8],
          shape: 'circle',
          style: { fill: 'darkorange', stroke: 'none' },
          layout: { minimumSize: { width: 170, height: 170 } },
        },
        {
          type: 'node',
          position: [0, 0],
          text: 'custom clip',
          style: { fill: 'dodgerblue', stroke: 'dodgerblue', strokeWidth: 2, textColor: 'contrast' },
          layout: { minimumSize: { width: 132, height: 42 } },
        },
      ],
    },
    {
      type: 'node',
      position: [0, 80],
      text: 'rounded-rect provider',
      style: { fill: 'none', stroke: 'none', textColor: 'dodgerblue' },
    },
  ],
};

export const svg = renderToSvgString(input, {
  compile: { clips: [roundedRectClip], measureText: browserMeasurer },
});
