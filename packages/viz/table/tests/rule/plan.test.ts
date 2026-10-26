import { describe, expect, it } from 'vitest';

import type { IRTableCellRule, SemanticTableModel } from '../../src';
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

const resolvePlans = (model: SemanticTableModel, rules: ReadonlyArray<IRTableCellRule> = []) =>
  resolveTableCellPlans(model, {
    rules,
    scaleContext: { categoricalColors: ['red'], sequentialColors: ['white', 'black'] },
  }).cells;

const rulesOf = (): Array<IRTableCellRule> => [
  {
    selector: { cellIds: ['value'] },
    formatter: { name: 'identity' },
    appearance: {
      background: { fill: '#ff0000', fillOpacity: 0.5 },
      content: {
        defaults: {
          style: { color: '#880000' },
          node: {
            style: { font: { family: 'serif', weight: 400 } },
            layout: { padding: 2 },
          },
          path: { style: { dashPattern: [2, 1] }, arrow: { start: { shape: 'triangle' } } },
        },
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
        defaults: {
          reset: ['node'],
          node: {
            style: { font: { weight: 700 } },
            layout: { padding: { left: 4 } },
          },
          path: { style: { dashPattern: [5] }, arrow: { start: { shape: 'stealth' } } },
        },
      },
      borders: {
        bottom: { kind: 'line', stroke: '#00ff00', width: 3 },
        left: { kind: 'none' },
      },
    },
  },
];

describe('解决了 Table Cell 计划', () => {
  it('通过声明顺序级联引用和外观，并具有精确的获胜者跟踪', () => {
    const plans = resolvePlans(modelOf(), rulesOf());
    const value = plans[0];

    expect(value).toMatchObject({
      kind: 'value',
      cellId: 'value',
      formatter: { name: 'identity' },
      presentation: { name: 'text' },
      appearance: {
        background: { fill: '#0000ff' },
        content: {
          defaults: {
            style: { color: '#880000' },
            reset: ['node'],
            node: {
              style: { font: { family: 'serif', weight: 700 } },
              layout: { padding: { left: 4 } },
            },
            path: { style: { dashPattern: [5] }, arrow: { start: { shape: 'stealth' } } },
          },
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
          '/content/defaults/style/color': { kind: 'rootRule', ruleIndex: 0 },
          '/content/defaults/reset': { kind: 'rootRule', ruleIndex: 1 },
          '/content/defaults/node/style/font/family': { kind: 'rootRule', ruleIndex: 0 },
          '/content/defaults/node/style/font/weight': { kind: 'rootRule', ruleIndex: 1 },
          '/content/defaults/node/layout/padding': { kind: 'rootRule', ruleIndex: 1 },
          '/content/defaults/path/style/dashPattern': { kind: 'rootRule', ruleIndex: 1 },
          '/content/defaults/path/arrow/start': { kind: 'rootRule', ruleIndex: 1 },
          '/borders/top': { kind: 'rootRule', ruleIndex: 0 },
          '/borders/bottom': { kind: 'rootRule', ruleIndex: 1 },
          '/borders/left': { kind: 'rootRule', ruleIndex: 1 },
        },
      },
    });
    expect(value.appearance.background).toMatchObject({ fillOpacity: 0.5 });
    expect(value.trace.appearance).toHaveProperty('/background/fillOpacity', { kind: 'rootRule', ruleIndex: 0 });
  });

  it('不为明确 undefined 的原子外观字段创建获胜者跟踪', () => {
    const rule = TableCellRuleSchema.parse({
      selector: { cellIds: ['value'] },
      appearance: { content: { defaults: { style: { fill: undefined } } } },
    });
    const value = resolvePlans(modelOf(), [rule])[0];

    expect(value.appearance.content).not.toHaveProperty('fill');
    expect(value.trace.appearance).not.toHaveProperty('/content/defaults/style/fill');
  });

  it('将明确 undefined 的结构化外观字段视为省略', () => {
    const rule = TableCellRuleSchema.parse({
      selector: { cellIds: ['value'] },
      appearance: {
        content: {
          defaults: {
            node: {
              style: { font: undefined },
            },
          },
        },
      },
    });

    expect(() => resolvePlans(modelOf(), [rule])).not.toThrow();
  });

  it('从完整的背景替换中省略显式 undefined 的不透明度', () => {
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
    const value = resolvePlans(modelOf(), rules)[0];

    expect(value.appearance.background).toStrictEqual({ fill: '#0000ff' });
    expect(value.trace.appearance).not.toHaveProperty('/background/fillOpacity');
    expect(JSON.parse(JSON.stringify(value.appearance.background))).toStrictEqual(value.appearance.background);
  });

  it('让后面的无边框替换前面的线边框', () => {
    const value = resolvePlans(modelOf(), [
      {
        selector: { cellIds: ['value'] },
        appearance: { borders: { top: { kind: 'line', stroke: '#ff0000', width: 2 } } },
      },
      { selector: { cellIds: ['value'] }, appearance: { borders: { top: { kind: 'none' } } } },
    ])[0];

    expect(value.appearance.borders?.top).toEqual({ kind: 'none' });
    expect(value.trace.appearance['/borders/top']).toEqual({ kind: 'rootRule', ruleIndex: 1 });
  });

  it('将仅外观规则应用于直接内容单元格', () => {
    const direct = resolvePlans(modelOf(), [
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

  it('保持价值/内容计划的区别，并为获胜者提供一次种子结构', () => {
    const plans = resolvePlans(modelOf());

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

  it('分离并递归冻结计划而不冻结编写的规则', () => {
    const rules = rulesOf();
    const plans = resolvePlans(modelOf(), rules);
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

  it('拒绝使用规则和 Cell 标识的直接内容的格式化程序或表示重写', () => {
    const model = modelOf();

    expect(() => resolvePlans(model, [{ selector: { cellIds: ['direct'] }, formatter: { name: 'identity' } }])).toThrow(
      /rule 0.*direct.*formatter/i,
    );
    expect(() => resolvePlans(model, [{ selector: { cellIds: ['direct'] }, presentation: { name: 'text' } }])).toThrow(
      /rule 0.*direct.*presentation/i,
    );
  });

  it('通过规范地址诊断匿名直接内容 Cell', () => {
    const model = normalizeTableStructure({
      kind: 'manual',
      rows: [[{ content: { type: 'node', position: [0, 0], text: 'direct' } }]],
    });

    expect(() => resolvePlans(model, [{ selector: { rowIndices: [0] }, formatter: { name: 'identity' } }])).toThrow(
      /rule 0.*content Cell 0:0.*formatter/i,
    );
  });

  it('使 formatTable 消费相同的严格对齐的价值计划', () => {
    const model = modelOf();
    const plans = resolvePlans(model, [{ selector: { cellIds: ['value'] }, formatter: { name: 'identity' } }]);
    const formatted = formatTable(model, { cells: plans });

    expect(formatted.cells[0]).toMatchObject({ rawValue: 12, value: 12, formatterName: 'identity' });

    const malformed = [{ ...plans[0], cellId: 'other' }, plans[1]];

    expect(() => formatTable(model, { cells: malformed })).toThrow(/plan Cell 0 identity differs/i);
    expect(() => formatTable(model, { cells: plans.slice(0, 1) })).toThrow(/plan Cell count differs/i);

    const wrongKind = [{ ...plans[0], kind: 'content' }, plans[1]] as unknown as typeof plans;

    expect(() => formatTable(model, { cells: wrongKind })).toThrow(/plan Cell 0 kind differs/i);
  });
});
