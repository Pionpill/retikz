import type { FlexLayoutInput } from '@retikz/standard';

import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/standard/inspect';
import { StandardLayoutVanillaAdapters } from '@retikz/standard-vanilla';
import {
  createStandardInspectionBarrier,
  createStandardInspectionVanillaDriver,
  inspectFlexLayout,
} from '@retikz/standard-vanilla/inspect';
import { figure, renderToSvgString, scope } from '@retikz/vanilla';

const flexInput = (first: string, second: string): FlexLayoutInput => ({
  size: { x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } },
  padding: 12,
  children: [
    {
      kind: 'flex',
      key: `${first}-item`,
      grow: 1,
      child: { type: 'node', position: [0, 0], text: first, fill: '#dbeafe', stroke: '#2563eb' },
    },
    {
      kind: 'flex',
      key: `${second}-item`,
      grow: 1,
      child: { type: 'node', position: [0, 0], text: second, fill: '#dcfce7', stroke: '#16a34a' },
    },
  ],
});

const fig = figure({
  authoring: createInspectionVanillaAuthoring({ inspector: FLEX_LAYOUT_INSPECTOR_KEY, value: true }),
  viewBox: { x: 0, y: 0, width: 520, height: 190 },
  children: [
    scope({ transforms: [{ kind: 'translate', x: 20, y: 34 }] }, [
      inspectFlexLayout('inherited', flexInput('A1', 'A2')),
    ]),
    scope(
      {
        authoring: createStandardInspectionBarrier(),
        transforms: [{ kind: 'translate', x: 280, y: 34 }],
      },
      [inspectFlexLayout('blocked', flexInput('B1', 'B2'))],
    ),
  ],
});

export const svg = renderToSvgString(fig, {
  adapters: StandardLayoutVanillaAdapters,
  compileDriver: createStandardInspectionVanillaDriver(),
  output: { width: 520, height: 190 },
});
