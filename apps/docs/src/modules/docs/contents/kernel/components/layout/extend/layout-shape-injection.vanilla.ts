import { node, path, renderToSvgString, scene } from '@retikz/vanilla';

import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';

import { fileShape, FileShapeName } from './layout-file-shape';

const input = scene({
  viewBox: { x: -140, y: -70, width: 280, height: 140 },
  children: [
    node('ir-file', {
      position: [-90, 0],
      shape: FileShapeName,
      text: 'IR',
      style: { fill: 'none' },
      layout: { minimumSize: { width: 76, height: 96 } },
    }),
    node('scene-file', {
      position: [90, 0],
      shape: FileShapeName,
      text: 'Scene',
      style: { fill: 'none' },
      layout: { minimumSize: { width: 76, height: 96 } },
    }),
    path({ way: ['ir-file', 'scene-file'], arrow: '->' }),
  ],
});

export const svg = renderToSvgString(input, {
  output: { width: 280, height: 140 },
  compile: { measureText: browserMeasurer, shapes: [fileShape] },
});
