import { describe, expect, it } from 'vitest';

import { defineNodeChannel, markChannelEncoding, channelField } from '../../../src/contract';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { MarkSchema, PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const makeBareIntensityChannel = (delivered: { value?: number }) =>
  defineNodeChannel<number>({
    channel: 'bareIntensity',
    output: { outputKind: 'number', range: [0, 1] },
    resolve: (_ctx, mark) => {
      const binding = markChannelEncoding(mark, 'bareIntensity');
      if (binding === undefined) return undefined;
      const field = channelField(binding);
      return { resolver: row => (typeof row[field] === 'number' ? row[field] : undefined) };
    },
    deliver: (_node, value) => {
      delivered.value = value;
    },
  });

const specWithChannel = (channel: string) =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'cartesian2D', x: 'cat', y: 'val' },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [
      { type: 'point', encodings: { position: { x: { field: 'cat' }, y: { field: 'val' } }, [channel]: 'intensity' } },
    ],
  });

describe('closed mark vocabulary and channel extensions', () => {
  it('rejects unknown mark types at the JSON boundary', () => {
    expect(MarkSchema.safeParse({ type: 'dot', encodings: { position: { x: { field: 'a' } } } }).success).toBe(false);
    expect(PlotSchema.safeParse({ ...specWithChannel('bareIntensity'), marks: [{ type: 'dot' }] }).success).toBe(false);
  });

  it('rejects unregistered channels on builtin marks', () => {
    expect(() =>
      lowerPlot(
        specWithChannel('ghost'),
        { d: [{ cat: 'A', val: 3, intensity: 0.75 }] },
        { textMeasurer: measureLabel },
      ),
    ).toThrow(/channel "ghost" is not registered/);
  });

  it('delivers registered extension channels on builtin marks', () => {
    const delivered: { value?: number } = {};
    lowerPlot(
      specWithChannel('bareIntensity'),
      { d: [{ cat: 'A', val: 3, intensity: 0.75 }] },
      {
        definitions: { channels: [makeBareIntensityChannel(delivered)] },
        textMeasurer: measureLabel,
      },
    );
    expect(delivered.value).toBe(0.75);
  });
});
