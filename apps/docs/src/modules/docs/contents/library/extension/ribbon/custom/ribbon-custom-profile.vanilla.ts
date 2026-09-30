import { createRibbonPathKindDefinition, defineRibbonWidthProfile } from '@retikz/extension';
import { path, renderToSvgString, scene } from '@retikz/vanilla';
import { z } from 'zod';

const pulseProfile = defineRibbonWidthProfile({
  name: 'pulse',
  paramsSchema: z.strictObject({ base: z.number().nonnegative(), peak: z.number().nonnegative() }),
  widthAt: ({ offset, params }) => params.base + (params.peak - params.base) * Math.sin(Math.PI * offset),
});

const pulseRibbonDefinition = createRibbonPathKindDefinition({ profiles: [pulseProfile] });

const input = scene({
  viewBox: { x: -260, y: -130, width: 520, height: 260 },
  children: [
    path({
      kind: 'ribbon',
      kindOptions: {
        width: { kind: 'profile', name: 'pulse', params: { base: 10, peak: 42 } },
        sampling: { kind: 'fixed', samples: 41 },
      },
      style: { fill: '#60a5fa', stroke: '#1d4ed8' },
      children: [
        { type: 'step', kind: 'move', to: [-180, 20] },
        { type: 'step', kind: 'curve', control: [0, -90], to: [180, 20] },
      ],
    }),
  ],
});

export const svg = renderToSvgString(input, { compile: { pathKinds: [pulseRibbonDefinition] } });
