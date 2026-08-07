import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineCellVisualScale, resolveTableThemeTokens } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { resolveTableCellPlans } from '../../src/pipeline/rule';

const tableThemeTokens = resolveTableThemeTokens();
const scaleContext = {
  categoricalColors: tableThemeTokens.tokens['data.categorical'],
  sequentialColors: [
    tableThemeTokens.tokens['data.sequential'][0],
    tableThemeTokens.tokens['data.sequential'][1],
  ] as const,
};

describe('Table visual encoding cascade', () => {
  it('resolves once, evaluates canonical non-null values once, and reuses one descriptor resolution', () => {
    const model = normalizeTableStructure({
      kind: 'manual',
      rows: [[2], [{ value: null }], [2], [{ content: { type: 'node', position: [0, 0] } }]],
    });
    let resolves = 0;
    const evaluated: Array<unknown> = [];
    const custom = defineCellVisualScale({
      name: 'inspect-scale',
      optionsSchema: z.strictObject({}),
      resolve: (_options, values) => {
        resolves += 1;
        expect(values).toEqual([2, 2]);
        return {
          of: value => {
            evaluated.push(value);
            return '#123456';
          },
          legendForm: 'swatch',
          domain: [2],
          range: ['#123456'],
        };
      },
    });
    const result = resolveTableCellPlans(model, {
      tableThemeTokens,
      scaleContext,
      visualScaleDefinitions: [custom],
      encodings: [
        {
          id: 'inspect',
          selector: { locations: ['body'] },
          channel: 'contentColor',
          scale: { name: 'inspect-scale' },
          legend: { title: 'Values' },
        },
      ],
    });

    expect(resolves).toBe(1);
    expect(evaluated).toEqual([2, 2]);
    expect(result.legendDescriptors).toEqual([
      {
        encodingId: 'inspect',
        channel: 'contentColor',
        scaleName: 'inspect-scale',
        title: 'Values',
        form: 'swatch',
        domain: [2],
        range: ['#123456'],
      },
    ]);
    expect(result.cells[0].appearance.content?.color).toBe('#123456');
    expect(result.cells[1].appearance.content?.color).toBe('#18181b');
    expect(result.cells[3].trace).not.toHaveProperty('encodingIds');
  });

  it('applies style, ordered owned channels, then ordered root rules', () => {
    const model = normalizeTableStructure({ kind: 'manual', rows: [[1]] });
    const result = resolveTableCellPlans(model, {
      tableThemeTokens,
      scaleContext,
      encodings: [
        {
          id: 'first',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color', options: { domain: [1], range: ['red'] } },
        },
        {
          id: 'second',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color', options: { domain: [1], range: ['blue'] } },
        },
      ],
      rules: [
        {
          selector: { locations: ['body'] },
          appearance: { background: { fill: 'green' } },
        },
      ],
    });

    expect(result.cells[0]).toMatchObject({
      appearance: {
        background: { fill: 'green' },
        content: { color: '#18181b' },
      },
      trace: {
        encodingIds: ['first', 'second'],
        appearance: { '/background/fill': { kind: 'rootRule', ruleIndex: 0 } },
      },
    });
  });

  it('treats undefined resolution as no patch, trace, descriptor, or evaluator call', () => {
    const model = normalizeTableStructure({ kind: 'manual', rows: [[{ value: null }]] });
    const result = resolveTableCellPlans(model, {
      tableThemeTokens,
      scaleContext,
      encodings: [
        {
          id: 'empty',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color' },
          legend: {},
        },
      ],
    });

    expect(result.legendDescriptors).toEqual([]);
    expect(result.cells[0].trace).not.toHaveProperty('encodingIds');
    expect(result.cells[0].appearance.background?.fill).toBe('#ffffff');
  });
});
