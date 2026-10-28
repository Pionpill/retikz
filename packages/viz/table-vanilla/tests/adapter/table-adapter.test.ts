import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import type { IRDetailTable } from '@retikz/table';
import { createManualTableIR, TableSchema } from '@retikz/table';
import type { InputEmbedContext } from '@retikz/vanilla';
import { layer, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import { embedTable, inputTableFromIR, tableInputEmbedAdapter } from '../../src';

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'content',
  identityPath: ['content', id],
});

const detailSpec = (): IRDetailTable => ({
  namespace: 'table',
  type: 'table',
  data: { reference: 'people' },
  structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
});

describe('Table Vanilla 适配器', () => {
  it('将运行时嵌入标识与可选的 Table 模型标识分开', () => {
    const anonymous = createManualTableIR({ rows: [[null]] });
    const named = createManualTableIR({ id: 'scores', rows: [[null]] });

    expect(
      tableInputEmbedAdapter.lower({ table: inputTableFromIR(anonymous) }, contextOf('panel')).node,
    ).not.toHaveProperty('id');
    expect(tableInputEmbedAdapter.lower({ table: inputTableFromIR(named) }, contextOf('panel')).node).toMatchObject({
      id: 'scores',
    });
  });

  it('保留显式的 Table 身份和所有根编写字段', () => {
    const spec = createManualTableIR({
      id: 'scores',
      rows: [[98]],
      rules: [
        {
          selector: { cellIds: ['cell.r0.c0'] },
          appearance: {
            content: {
              defaults: { style: { color: '#b91c1c' } },
            },
          },
        },
      ],
      encodings: [
        {
          id: 'score-color',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color' },
          legend: false,
        },
      ],
      defaultAppearance: { body: { content: { defaults: { style: { color: '#fafafa' } } } } },
    });

    const lowered = TableSchema.parse(
      tableInputEmbedAdapter.lower({ table: inputTableFromIR(spec) }, contextOf('panel')).node,
    );

    expect(lowered).toEqual(spec);
    expect(lowered.rules).toEqual(spec.rules);
    expect(lowered.encodings).toEqual(spec.encodings);
    expect(lowered.defaultAppearance).toEqual(spec.defaultAppearance);
  });

  it('返回 table.table 根和每个下沉调用的共享稳定提供者工厂', () => {
    const spec = createManualTableIR({ rows: [[null]] });
    const first = tableInputEmbedAdapter.lower({ table: inputTableFromIR(spec) }, contextOf('first'));
    const second = tableInputEmbedAdapter.lower({ table: inputTableFromIR(spec) }, contextOf('second'));

    expect(first).not.toHaveProperty('datasets');
    expect(first).not.toHaveProperty('makeComposites');
    expect(first.providerDependencies.roots).toEqual([{ capability: 'composite', namespace: 'table', type: 'table' }]);
    expect(first.providerDependencies.providers[0]?.makeDefinition).toBe(
      second.providerDependencies.providers[0]?.makeDefinition,
    );
    expect(first.providerDependencies.providers[0]?.params).toHaveProperty('lowerOptions');
  });

  it('进入场景/图层 SSR 并读取每个嵌入运行时数据', () => {
    const spec = detailSpec();
    const inputScene = scene({
      layers: [
        layer({
          id: 'content',
          children: [
            embedTable(spec, { data: { people: [{ name: 'Ada' }] } }),
            embedTable({ ...spec, data: { reference: 'others' } }, { data: { others: [{ name: 'Lin' }] } }),
          ],
        }),
      ],
    });
    const svg = renderToSvgString(inputScene, { adapters: [tableInputEmbedAdapter] });

    expect(svg).toContain('Ada');
    expect(svg).toContain('Lin');

    const normalized = normalizeScene(inputScene, { adapters: [tableInputEmbedAdapter] });

    expect(new Set(normalized.runtimeMeta.layers[0].childIds).size).toBe(2);

    for (const child of normalized.ir.children) expect(child).not.toHaveProperty('id');
  });

  it('通过共享适配器贡献传递额外的复合组件', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: literal('fixture'),
      type: literal('badge'),
      label: string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema,
      compile: node => ({ children: [{ type: 'node', position: [0, 0], text: node.label }] }),
    });
    const spec = createManualTableIR({
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });
    const inputScene = scene([embedTable(spec, { composites: [badge] })]);

    expect(renderToSvgString(inputScene, { adapters: [tableInputEmbedAdapter] })).toContain('Nested');
  });

  it('重复的匿名嵌入在 Source 中仍保持匿名', () => {
    const spec = createManualTableIR({ rows: [[null]] });
    const normalized = normalizeScene(scene([embedTable(spec), embedTable(spec)]), {
      adapters: [tableInputEmbedAdapter],
    });

    expect(normalized.ir.children).toEqual([spec, spec]);
  });
});
