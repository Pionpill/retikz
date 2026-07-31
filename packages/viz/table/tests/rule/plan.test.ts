import { describe, expect, it } from 'vitest';

import type { IRTableCellRule } from '../../src';

import { TableCellRuleSchema } from '../../src';
import { formatTable } from '../../src/pipeline/formatter';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { resolveTableCellPlans } from '../../src/pipeline/rule';

const modelOf = () =>
  normalizeTableStructure({
    kind: 'manual',
    rows: [
      [
        {
          id: 'value',
          value: 12,
          formatter: { name: 'number', options: { specifier: '.0f' } },
          presentation: { name: 'text' },
          layout: { borders: { bottom: { kind: 'line', stroke: '#111111', width: 1 } } },
        },
        { id: 'direct', content: { type: 'node', position: [0, 0], text: 'direct' } },
      ],
    ],
  });

const rulesOf = (): Array<IRTableCellRule> => [
  {
    selector: { cellIds: ['value'] },
    formatter: { name: 'identity' },
    appearance: {
      background: { fill: '#ff0000', fillOpacity: 0.5 },
      content: {
        color: '#880000',
        nodeDefault: { font: { family: 'serif', weight: 400 }, padding: 2 },
        pathDefault: { dashPattern: [2, 1] },
        arrowDefault: { start: { shape: 'triangle' } },
      },
      borders: {
        top: { kind: 'line', stroke: '#ff0000', width: 2 },
        bottom: { kind: 'none' },
      },
    },
  },
  {
    selector: { rowIndices: [0], payloadKinds: ['value'] },
    presentation: { name: 'text' },
    appearance: {
      background: { fill: '#0000ff' },
      content: {
        resetStyle: ['node'],
        nodeDefault: { font: { weight: 700 }, padding: { left: 4 } },
        pathDefault: { dashPattern: [5] },
        arrowDefault: { start: { shape: 'stealth' } },
      },
      borders: {
        bottom: { kind: 'line', stroke: '#00ff00', width: 3 },
        left: { kind: 'none' },
      },
    },
  },
];

describe('resolved Table Cell plans', () => {
  it('cascades references and appearance by declaration order with precise winner trace', () => {
    const plans = resolveTableCellPlans(modelOf(), rulesOf());
    const value = plans[0];

    expect(value).toMatchObject({
      kind: 'value',
      cellId: 'value',
      formatter: { name: 'identity' },
      presentation: { name: 'text' },
      appearance: {
        background: { fill: '#0000ff' },
        content: {
          color: '#880000',
          resetStyle: ['node'],
          nodeDefault: { font: { family: 'serif', weight: 700 }, padding: { left: 4 } },
          pathDefault: { dashPattern: [5] },
          arrowDefault: { start: { shape: 'stealth' } },
        },
        borders: {
          top: { kind: 'line', stroke: '#ff0000', width: 2 },
          bottom: { kind: 'line', stroke: '#00ff00', width: 3 },
          left: { kind: 'none' },
        },
      },
      trace: {
        formatter: { kind: 'rootRule', ruleIndex: 0 },
        presentation: { kind: 'rootRule', ruleIndex: 1 },
        matchedRuleIndices: [0, 1],
        appearance: {
          '/background/fill': { kind: 'rootRule', ruleIndex: 1 },
          '/content/color': { kind: 'rootRule', ruleIndex: 0 },
          '/content/resetStyle': { kind: 'rootRule', ruleIndex: 1 },
          '/content/nodeDefault/font/family': { kind: 'rootRule', ruleIndex: 0 },
          '/content/nodeDefault/font/weight': { kind: 'rootRule', ruleIndex: 1 },
          '/content/nodeDefault/padding': { kind: 'rootRule', ruleIndex: 1 },
          '/content/pathDefault/dashPattern': { kind: 'rootRule', ruleIndex: 1 },
          '/content/arrowDefault/start': { kind: 'rootRule', ruleIndex: 1 },
          '/borders/top': { kind: 'rootRule', ruleIndex: 0 },
          '/borders/bottom': { kind: 'rootRule', ruleIndex: 1 },
          '/borders/left': { kind: 'rootRule', ruleIndex: 1 },
        },
      },
    });
    expect(value.appearance.background).not.toHaveProperty('fillOpacity');
    expect(value.trace.appearance).not.toHaveProperty('/background/fillOpacity');
  });

  it('does not create a winner trace for an explicitly undefined atomic appearance field', () => {
    const rule = TableCellRuleSchema.parse({
      selector: { cellIds: ['value'] },
      appearance: { content: { fill: undefined } },
    });
    const value = resolveTableCellPlans(modelOf(), [rule])[0];

    expect(value.appearance.content).not.toHaveProperty('fill');
    expect(value.trace.appearance).not.toHaveProperty('/content/fill');
  });

  it('treats an explicitly undefined structured appearance field as omitted', () => {
    const rule = TableCellRuleSchema.parse({
      selector: { cellIds: ['value'] },
      appearance: { content: { nodeDefault: { font: undefined } } },
    });

    expect(() => resolveTableCellPlans(modelOf(), [rule])).not.toThrow();
  });

  it('omits an explicitly undefined opacity from a complete background replacement', () => {
    const rules = [
      {
        selector: { cellIds: ['value'] },
        appearance: { background: { fill: '#ff0000', fillOpacity: 0.25 } },
      },
      TableCellRuleSchema.parse({
        selector: { cellIds: ['value'] },
        appearance: { background: { fill: '#0000ff', fillOpacity: undefined } },
      }),
    ] satisfies Array<IRTableCellRule>;
    const value = resolveTableCellPlans(modelOf(), rules)[0];

    expect(value.appearance.background).toStrictEqual({ fill: '#0000ff' });
    expect(value.trace.appearance).not.toHaveProperty('/background/fillOpacity');
    expect(JSON.parse(JSON.stringify(value.appearance.background))).toStrictEqual(value.appearance.background);
  });

  it('lets a later none border replace an earlier line border', () => {
    const value = resolveTableCellPlans(modelOf(), [
      {
        selector: { cellIds: ['value'] },
        appearance: { borders: { top: { kind: 'line', stroke: '#ff0000', width: 2 } } },
      },
      { selector: { cellIds: ['value'] }, appearance: { borders: { top: { kind: 'none' } } } },
    ])[0];

    expect(value.appearance.borders?.top).toEqual({ kind: 'none' });
    expect(value.trace.appearance['/borders/top']).toEqual({ kind: 'rootRule', ruleIndex: 1 });
  });

  it('applies appearance-only rules to direct content Cells', () => {
    const direct = resolveTableCellPlans(modelOf(), [
      {
        selector: { cellIds: ['direct'] },
        appearance: { background: { fill: '#fff000' } },
      },
    ])[1];

    expect(direct).toMatchObject({
      kind: 'content',
      appearance: { background: { fill: '#fff000' } },
      trace: {
        appearance: { '/background/fill': { kind: 'rootRule', ruleIndex: 0 } },
        matchedRuleIndices: [0],
      },
    });
  });

  it('keeps value/content plans discriminated and seeds structure winners once', () => {
    const plans = resolveTableCellPlans(modelOf());

    expect(plans[0]).toMatchObject({
      kind: 'value',
      formatter: { name: 'number' },
      presentation: { name: 'text' },
      appearance: { borders: { bottom: { kind: 'line', stroke: '#111111', width: 1 } } },
      trace: {
        formatter: { kind: 'structure' },
        presentation: { kind: 'structure' },
        appearance: { '/borders/bottom': { kind: 'structure' } },
        matchedRuleIndices: [],
      },
    });
    expect(plans[1]).toEqual({
      kind: 'content',
      cellId: 'direct',
      appearance: {},
      trace: { appearance: {}, matchedRuleIndices: [] },
    });
    expect(plans[1]).not.toHaveProperty('formatter');
    expect(plans[1]).not.toHaveProperty('presentation');
  });

  it('detaches and recursively freezes plans without freezing authored rules', () => {
    const rules = rulesOf();
    const plans = resolveTableCellPlans(modelOf(), rules);
    const original = structuredClone(plans[0]);

    expect(Object.isFrozen(plans)).toBe(true);
    expect(Object.isFrozen(plans[0])).toBe(true);
    expect(Object.isFrozen(plans[0].appearance)).toBe(true);
    expect(Object.isFrozen(plans[0].trace.appearance)).toBe(true);
    expect(Object.isFrozen(rules)).toBe(false);
    expect(Object.isFrozen(rules[0].appearance)).toBe(false);

    rules[0].appearance = { background: { fill: '#00ffff' } };
    expect(plans[0]).toEqual(original);
  });

  it('rejects formatter or presentation rewrites of direct content with rule and Cell identity', () => {
    const model = modelOf();

    expect(() =>
      resolveTableCellPlans(model, [{ selector: { cellIds: ['direct'] }, formatter: { name: 'identity' } }]),
    ).toThrow(/rule 0.*direct.*formatter/i);
    expect(() =>
      resolveTableCellPlans(model, [{ selector: { cellIds: ['direct'] }, presentation: { name: 'text' } }]),
    ).toThrow(/rule 0.*direct.*presentation/i);
  });

  it('makes formatTable consume the same strictly aligned value plan', () => {
    const model = modelOf();
    const plans = resolveTableCellPlans(model, [{ selector: { cellIds: ['value'] }, formatter: { name: 'identity' } }]);
    const formatted = formatTable(model, { cells: plans });

    expect(formatted.cells[0]).toMatchObject({ rawValue: 12, value: 12, formatterName: 'identity' });
    const malformed = [{ ...plans[0], cellId: 'other' }, plans[1]];
    expect(() => formatTable(model, { cells: malformed })).toThrow(/plan Cell 0 identity differs/i);
    expect(() => formatTable(model, { cells: plans.slice(0, 1) })).toThrow(/plan Cell count differs/i);
    const wrongKind = [{ ...plans[0], kind: 'content' }, plans[1]] as unknown as typeof plans;
    expect(() => formatTable(model, { cells: wrongKind })).toThrow(/plan Cell 0 kind differs/i);
  });
});
