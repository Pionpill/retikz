import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import { defineCellVisualScale, resolveTableThemeDefaults } from '../../src';
import { resolveTableCellPlans } from '../../src/pipeline/rule';
import { cascadeTableCellAppearance } from '../../src/pipeline/rule/cascade';
import { resolveTableStructure } from '../../src/pipeline/structure';

const defaultTable = resolveTableThemeDefaults();

const sequential = defaultTable.defaults.defaultVisual?.sequential;
if (sequential === undefined || sequential === null)
  throw new Error('test fixture requires the default sequential palette');
const scaleContext = {
  categoricalColors: defaultTable.defaults.defaultVisual?.categorical ?? [],
  sequentialColors: [sequential[0], sequential[1]] as const,
};

describe('Table 视觉编码级联', () => {
  it('解析一次，评估规范非 null 一次，并重用一个描述符解析', () => {
    const model = resolveTableStructure({
      kind: 'manual',
      rows: [[2], [{ value: null }], [2], [{ content: { type: 'node', position: [0, 0] } }]],
    });
    let resolves = 0;
    const evaluated: Array<unknown> = [];
    const custom = defineCellVisualScale({
      name: 'inspect-scale',
      optionsSchema: strictObject({}),
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
      defaultTable,
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
    expect(result.cells[0].appearance.content?.defaults?.style?.color).toBe('#123456');
    expect(result.cells[1].appearance.content?.defaults?.style?.color).toBe('#18181b');
    expect(result.cells[3].trace).not.toHaveProperty('encodingIds');
  });

  it('应用样式，排序拥有的通道，然后排序根规则', () => {
    const model = resolveTableStructure({ kind: 'manual', rows: [[1]] });
    const result = resolveTableCellPlans(model, {
      defaultTable,
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
        content: { defaults: { style: { color: '#18181b' } } },
      },
      trace: {
        encodingIds: ['first', 'second'],
        appearance: { '/background/fill': { kind: 'rootRule', ruleIndex: 0 } },
      },
    });
  });

  it('将 undefined 的解析结果视为无补丁、跟踪、描述符或求值器调用', () => {
    const model = resolveTableStructure({ kind: 'manual', rows: [[{ value: null }]] });
    const result = resolveTableCellPlans(model, {
      defaultTable,
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

it('内容不透明度由会员继承并记录每个获奖者', () => {
  const first = cascadeTableCellAppearance(
    {},
    {},
    {
      content: { defaults: { style: { opacity: { fill: 0.4, stroke: 0.8 } } } },
    },
    { kind: 'defaults', path: '/defaults/content' },
  );
  const second = cascadeTableCellAppearance(
    first.appearance,
    first.trace,
    {
      content: { defaults: { style: { opacity: 0.5 } } },
    },
    { kind: 'structure' },
  );
  expect(second.appearance.content?.defaults?.style?.opacity).toEqual({ fill: 0.4, stroke: 0.8, overall: 0.5 });
  expect(second.trace).toMatchObject({
    '/content/defaults/style/opacity/fill': { kind: 'defaults', path: '/defaults/content' },
    '/content/defaults/style/opacity/stroke': { kind: 'defaults', path: '/defaults/content' },
    '/content/defaults/style/opacity/overall': { kind: 'structure' },
  });
});
