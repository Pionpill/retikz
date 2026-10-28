import { compileToScene } from '@retikz/core';
import type { ParsedFieldValue, FieldResolver } from '@retikz/data';
import { applyFieldResolver, resolveDataRows } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { createPlotLocator } from '../../../src/pipeline';
import { lowerPlots, prepareRows } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';

/** cartesian point spec，model 可选（部分声明走 contract），无 scales → 走 type-driven 派生 */
const pointSpec = (model?: Array<{ name: string; type?: string }>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', ...(model ? { model } : {}) },
    scales: [],
    coordinate: { type: 'cartesian2D' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
  });

const parseSlashDate = (raw: unknown): ParsedFieldValue => Date.parse(String(raw).replaceAll('/', '-'));

describe('applyFieldResolver — 类型覆盖 + parser 收集（contract）', () => {
  it('应用解析器覆盖类型收集解析', () => {
    const base = new Map([['x', DataFieldType.Continuous]]);
    const parse = (raw: unknown): ParsedFieldValue => Number(raw);
    const { fieldTypeMap, parsers, resolverHit } = applyFieldResolver(
      base,
      new Set(['x']),
      undefined,
      'd',
      undefined,
      field => (field === 'x' ? { type: DataFieldType.Categorical, parse } : undefined),
    );

    expect(fieldTypeMap.get('x')).toBe(DataFieldType.Categorical);
    expect(parsers.get('x')).toBe(parse);
    expect(resolverHit).toBe(true);
  });

  it('解析器返回 undefined 时视为未命中', () => {
    const base = new Map([['x', DataFieldType.Continuous]]);
    const result = applyFieldResolver(base, new Set(['x']), undefined, 'd', undefined, undefined);

    expect(result.resolverHit).toBe(false);
    expect(result.fieldTypeMap).toBe(base);
  });

  it('应用解析器传递数据集上下文', () => {
    const base = new Map([['x', DataFieldType.Temporal]]);
    let seen: unknown;
    applyFieldResolver(
      base,
      new Set(['x']),
      [{ name: 'x', type: DataFieldType.Temporal }],
      'd',
      { x: 'when' },
      (field, context) => {
        if (field === 'x') seen = context;
        return undefined;
      },
    );

    expect(seen).toEqual({ dataReference: 'd', physicalPath: 'when', declaredType: DataFieldType.Temporal });
  });

  it('仅在没有声明类型抛出的情况下进行解析', () => {
    const base = new Map([['x', DataFieldType.Continuous]]);

    expect(() =>
      applyFieldResolver(base, new Set(['x']), undefined, 'd', undefined, () => ({ parse: raw => Number(raw) })),
    ).toThrow(/needs a type/i);
  });

  it('仅解析声明类型即可', () => {
    const base = new Map([['x', DataFieldType.Temporal]]);
    const { parsers } = applyFieldResolver(
      base,
      new Set(['x']),
      [{ name: 'x', type: DataFieldType.Temporal }],
      'd',
      undefined,
      () => ({ parse: parseSlashDate }),
    );

    expect(parsers.has('x')).toBe(true);
  });
});

describe('resolveDataRows — 自定义 parser（contract）', () => {
  it('解析器覆盖内置强制', () => {
    const out = resolveDataRows(
      [{ x: '2024/01/01' }],
      new Map([['x', DataFieldType.Temporal]]),
      undefined,
      new Map([['x', parseSlashDate]]),
    );

    expect(out[0].x).toBe(Date.parse('2024-01-01'));
  });

  it('解析器返回布尔值或跳过 null', () => {
    const out = resolveDataRows(
      [{ a: 'x' }],
      new Map([['a', DataFieldType.Categorical]]),
      undefined,
      new Map([['a', () => true as unknown as ParsedFieldValue]]),
    );

    expect(out[0].a).toBeUndefined();
  });

  it('解析器返回 undefined 的跳过', () => {
    const out = resolveDataRows(
      [{ a: 'x' }],
      new Map([['a', DataFieldType.Categorical]]),
      undefined,
      new Map([['a', () => undefined]]),
    );

    expect(out[0].a).toBeUndefined();
  });
});

describe('prepareRows — resolveField 集成（contract）', () => {
  it('自定义日期解析', () => {
    const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
    const rows = [{ x: '2024/01/01', y: 10 }];
    const { normalized } = prepareRows(
      spec,
      { d: rows },
      { resolveField: field => (field === 'x' ? { type: 'temporal', parse: parseSlashDate } : undefined) },
      rows,
    );

    expect(normalized[0].x).toBe(Date.parse('2024-01-01'));
  });

  it('数字枚举分类无模型', () => {
    const spec = pointSpec();
    const rows = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ];
    const { fieldTypeMap, normalized } = prepareRows(
      spec,
      { d: rows },
      { resolveField: field => (field === 'x' ? { type: 'categorical' } : undefined) },
      rows,
    );

    expect(fieldTypeMap.get('x')).toBe(DataFieldType.Categorical); // 覆盖推断的 continuous
    expect(normalized[0].x).toBe(0); // resolver 命中 → 归一化跑，类别键原样
  });

  it('仅使用模型进行解析', () => {
    const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
    const rows = [{ x: '2024/03/04', y: 1 }];
    const { fieldTypeMap, normalized } = prepareRows(
      spec,
      { d: rows },
      { resolveField: field => (field === 'x' ? { parse: parseSlashDate } : undefined) },
      rows,
    );

    expect(fieldTypeMap.get('x')).toBe(DataFieldType.Temporal); // 类型沿用 model
    expect(normalized[0].x).toBe(Date.parse('2024-03-04'));
  });

  it('仅解析而不抛出模型', () => {
    const spec = pointSpec();
    const rows = [{ x: 1, y: 2 }];

    expect(() => prepareRows(spec, { d: rows }, { resolveField: () => ({ parse: raw => Number(raw) }) }, rows)).toThrow(
      /needs a type/i,
    );
  });

  it('解析器不绕过严格', () => {
    // model 仅声明 x，mark 引用了未声明的 y；resolver 返类型也不能让 y 通过 strict
    const spec = pointSpec([{ name: 'x', type: 'continuous' }]);
    const rows = [{ x: 1, y: 2 }];

    expect(() => prepareRows(spec, { d: rows }, { resolveField: () => ({ type: 'continuous' }) }, rows)).toThrow(
      /unknown field/i,
    );
  });

  it('解析器 undefined 回退', () => {
    const spec = pointSpec();
    const rows = [{ x: 5, y: 1 }];
    const withoutResolver = prepareRows(spec, { d: rows }, {}, rows);
    const withUndefinedResolver = prepareRows(spec, { d: rows }, { resolveField: () => undefined }, rows);

    expect(withUndefinedResolver.normalized).toEqual(withoutResolver.normalized);
    expect(withUndefinedResolver.fieldTypeMap).toEqual(withoutResolver.fieldTypeMap);
    expect(withUndefinedResolver.dataView.rows).toEqual(withoutResolver.dataView.rows);
    expect(withUndefinedResolver.dataView.model).toEqual(withoutResolver.dataView.model);
  });

  it('解析器从字段映射接收物理路径', () => {
    const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
    const rows = [{ when: '2024/01/01', y: 1 }];
    let seenPath = '';
    prepareRows(
      spec,
      { d: rows },
      {
        datasetFieldMaps: { d: { x: 'when' } },
        resolveField: (field, context) => {
          if (field === 'x') {
            seenPath = context.physicalPath;
            return { type: 'temporal', parse: parseSlashDate };
          }

          return undefined;
        },
      },
      rows,
    );

    expect(seenPath).toBe('when');
  });
});

describe('render ⟺ locator parity + scale 兼容', () => {
  const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
  const resolveField: FieldResolver = field =>
    field === 'x' ? { type: 'temporal', parse: parseSlashDate } : undefined;
  const datasets = {
    d: [
      { x: '2024/01/01', y: 10 },
      { x: '2024/02/01', y: 14 },
    ],
  };

  it('使用 resolveField 进行渲染编译', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots(datasets, { resolveField }) },
    ).scene;

    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('定位器使用相同的 resolveField 构建', () => {
    expect(() => createPlotLocator(spec, datasets, { environment: {}, resolveField })).not.toThrow();
  });

  it('解析型进料秤兼容', () => {
    // resolveField 把 x 盖成 categorical → 与显式 linear scale 不兼容 → 用覆盖后类型 fail-loud
    const explicitSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'x', type: 'continuous' },
          { name: 'y', type: 'continuous' },
        ],
      },
      scales: [
        { type: 'linear', name: 'xs' },
        { type: 'linear', name: 'ys' },
      ],
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
    });

    expect(
      () =>
        compileToScene(
          { version: 1, type: 'scene', children: [explicitSpec] },
          {
            composites: lowerPlots(
              { d: [{ x: 1, y: 2 }] },
              { resolveField: field => (field === 'x' ? { type: 'categorical' } : undefined) },
            ),
          },
        ).scene,
    ).toThrow(/incompatible/i);
  });
});
