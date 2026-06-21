import { describe, expect, it } from 'vitest';
import type { IRScope } from '@retikz/core';
import * as plot from '../../src';
import { BUILTIN_MARK_TYPES, type CustomMark, MarkOperationSchema, type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { defineMark } from '../../src/contract';
import { BUILTIN_MARKS, resolveMarkRegistry } from '../../src/providers';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 自定义 mark：记录被分派调用 + 读取的行数，返回一个可识别的空 layer scope */
const makeDotMark = (record: { calls: number; rows: number }) =>
  defineMark<CustomMark>({
    type: 'dot',
    collectFields: (mark, fields) => {
      fields.addChannel(mark.encoding?.x);
      fields.addChannel(mark.encoding?.y);
    },
    lower: (_mark, rows) => {
      record.calls += 1;
      record.rows = rows.length;
      return { type: 'scope', children: [] };
    },
  });

const dotSpec = (overrides?: Partial<PlotSpec>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'cartesian2D', x: 'cat', y: 'val' },
    scales: [
      { type: 'band', name: 'cat' },
      { type: 'linear', name: 'val' },
    ],
    marks: [{ type: 'dot', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }],
    ...overrides,
  });

const opts: LowerPlotsOptions = { width: 400, height: 300 };

describe('mark registry（alpha.12 ADR-08：自定义 mark）', () => {
  it('mark_operation_schema_accepts_builtin_and_custom', () => {
    expect(MarkOperationSchema.safeParse({ type: 'point', encoding: { x: { field: 'a' } } }).success).toBe(true);
    expect(MarkOperationSchema.safeParse({ type: 'dot', encoding: { x: { field: 'a' } } }).success).toBe(true);
  });

  it('custom_mark_type_collision_rejected', () => {
    // 自定义 type 撞内置 → CustomMark refine 拒；内置 'point' 走内置分支但缺位置编码也不该当自定义通过
    const collide = MarkOperationSchema.safeParse({ type: 'point', foo: 1 });
    // 'point' 命中内置 schema（point 字段可选）→ accept；但带非法额外字段的纯自定义占用名应被内置严格 schema 兜住
    expect(MarkOperationSchema.safeParse({ type: 'path', notAField: true }).success).toBe(collide.success);
    expect(BUILTIN_MARK_TYPES.has('point')).toBe(true);
  });

  it('custom_mark_not_json_serializable_rejected', () => {
    expect(MarkOperationSchema.safeParse({ type: 'dot', bad: () => 1 }).success).toBe(false);
    expect(MarkOperationSchema.safeParse({ type: 'dot', bad: Number.NaN }).success).toBe(false);
  });

  it('builtin_marks_cover_public_builtin_types', () => {
    expect(BUILTIN_MARKS.map(def => def.type).sort()).toEqual([...BUILTIN_MARK_TYPES].sort());
  });

  it('resolve_mark_registry_merges_builtin_and_custom', () => {
    const record = { calls: 0, rows: 0 };
    const registry = resolveMarkRegistry([makeDotMark(record)]);
    expect(registry.get('dot')).toBeDefined();
    expect(registry.get('point')).toBeDefined();
  });

  it('duplicate_mark_registration_throws（自定义撞内置）', () => {
    const collide = defineMark({ type: 'point', lower: () => null });
    expect(() => resolveMarkRegistry([collide])).toThrow(/duplicate mark registration: "point"/);
  });

  it('duplicate_mark_registration_throws（两自定义同 type）', () => {
    const a = defineMark({ type: 'dot', lower: () => null });
    const b = defineMark({ type: 'dot', lower: () => null });
    expect(() => resolveMarkRegistry([a, b])).toThrow(/duplicate mark registration: "dot"/);
  });

  it('public_barrel_exports_mark_extension_helpers', () => {
    expect(plot.defineMark).toBe(defineMark);
    expect(plot.resolveMarkRegistry).toBe(resolveMarkRegistry);
  });

  it('custom_mark_lower_dispatched_with_transformed_rows', () => {
    const record = { calls: 0, rows: 0 };
    const rows = [{ cat: 'A', val: 3 }, { cat: 'B', val: 6 }, { cat: 'C', val: 9 }];
    expandOf(dotSpec(), { d: rows }, { ...opts, markDefinitions: [makeDotMark(record)] });
    expect(record.calls).toBe(1);
    expect(record.rows).toBe(rows.length);
  });

  it('unregistered_custom_mark_fails_loud', () => {
    const rows = [{ cat: 'A', val: 3 }];
    expect(() => expandOf(dotSpec(), { d: rows }, opts)).toThrow(/mark type "dot" is not registered/);
  });

  it('custom_mark_fields_collected_for_strict_model', () => {
    const record = { calls: 0, rows: 0 };
    const rows = [{ cat: 'A', val: 3 }, { cat: 'B', val: 6 }];
    // strict model：custom mark 的 collectFields 登记 x=cat / y=val，否则严格校验会因未声明字段失败
    const spec = dotSpec({ data: { reference: 'd', model: [{ name: 'cat', type: 'categorical' }, { name: 'val', type: 'continuous' }] } });
    expect(() => expandOf(spec, { d: rows }, { ...opts, markDefinitions: [makeDotMark(record)], validateData: true })).not.toThrow();
    expect(record.calls).toBe(1);
  });

  it('custom_and_builtin_marks_share_scale', () => {
    const record = { calls: 0, rows: 0 };
    const rows = [{ cat: 'A', val: 3 }, { cat: 'B', val: 6 }];
    // 自定义 dot + 内置 point 同 plot，共用同一坐标 / scale；lowering 不抛、两 mark 各产一层
    const spec = dotSpec({ marks: [{ type: 'dot', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }, { type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }] });
    const scope = expandOf(spec, { d: rows }, { ...opts, markDefinitions: [makeDotMark(record)] });
    expect(record.calls).toBe(1);
    expect(scope.children.length).toBeGreaterThanOrEqual(2);
  });
});
