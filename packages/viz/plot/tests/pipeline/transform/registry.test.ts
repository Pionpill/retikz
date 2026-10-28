import { compileToScene } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import type { AnyTransformDefinition, ExternalRow } from '@retikz/data';
import {
  applyTransforms,
  defineTransform,
  extractTransformKind,
  BuiltinDataTransform,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  readSourceIndices,
  tagSourceIndex,
  resolveTransformRegistry,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { object, string } from 'zod';

import { lowerPlots } from '../../../src/pipeline/expand';
import { collectSourceFields } from '../../../src/pipeline/source-fields';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';

const doubleDefinition = defineTransform({
  kind: 'double',
  paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.field],
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.params.as }] }),
});

const doubleDefinitionImplementation = defineTransformImplementation({
  definition: doubleDefinition,
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.params.as]: Number(row[operation.params.field]) * 2,
    })),
});

const groupSumDefinition = defineTransform({
  kind: 'group-sum',
  paramsSchema: object({ groupBy: NonBlankStringSchema, field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.groupBy, operation.params.field],
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      { field: operation.params.groupBy, type: { from: operation.params.groupBy } },
      { field: operation.params.as, type: 'continuous' },
    ],
  }),
});

const groupSumDefinitionImplementation = defineTransformImplementation({
  definition: groupSumDefinition,
  apply: (rows, operation, context) => {
    const groups = new Map<string, Array<ExternalRow>>();

    for (const row of rows) {
      const key = String(row[operation.params.groupBy]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.entries()].map(([key, members]) =>
      context.groupProvenance(
        {
          [operation.params.groupBy]: key,
          [operation.params.as]: members.reduce((sum, row) => sum + Number(row[operation.params.field] ?? 0), 0),
        },
        members,
      ),
    );
  },
});

const compile = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  definitions = [doubleDefinition],
) =>
  compileToScene(
    { version: 1, type: 'scene', children: [spec] },
    {
      composites: lowerPlots(datasets, {
        definitions: { transforms: definitions },
        implementations: { transforms: definitions.includes(doubleDefinition) ? [doubleDefinitionImplementation] : [] },
      }),
    },
  ).scene;

const pointSpec = (transform: IRPlot['transform']): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: {
      reference: 'd',
      model: [
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ],
    },
    transform,
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'x2' }, y: { field: 'y' } } } }],
  });

describe('转换注册表（契约）', () => {
  it('内置注册表包含所有转换类型', () => {
    const registry = resolveTransformRegistry();

    expect([...registry.keys()].sort()).toEqual(Object.values(BuiltinDataTransform).sort());
  });

  it('发布可现场绑定绘图转换的时间表', () => {
    const registry = resolveTransformRegistry();

    expect(registry.get(BuiltinDataTransform.Stack)?.schedule).toEqual({
      phase: DataTransformPhase.CumulativeDerive,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.Bin)?.schedule).toEqual({
      phase: DataTransformPhase.RowShape,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Replace,
    });
    expect(registry.get(BuiltinDataTransform.Normalize)?.schedule).toEqual({
      phase: DataTransformPhase.FieldDerive,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.DeriveInterval)?.schedule).toEqual({
      phase: DataTransformPhase.CumulativeDerive,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.Jitter)?.schedule).toEqual({
      phase: DataTransformPhase.FieldAdjust,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.Density)?.schedule).toBeUndefined();
  });

  it('定义变换时保留 schema 并提取 kind', () => {
    expect(extractTransformKind(doubleDefinition.schema)).toBe('double');
    expect(doubleDefinition.schema.parse({ kind: 'double', params: { field: 'x', as: 'x2' } })).toEqual({
      kind: 'double',
      params: {
        field: 'x',
        as: 'x2',
      },
    });
  });

  it('重复自定义或内置注册抛出', () => {
    expect(() => resolveTransformRegistry([doubleDefinition, doubleDefinition])).toThrow(
      /duplicate transform registration/i,
    );

    const builtinCollision = defineTransform({
      kind: 'sort',
      paramsSchema: object({}),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });

    expect(() => resolveTransformRegistry([builtinCollision])).toThrow(/duplicate transform registration/i);
  });

  it('格式错误的注册 schema 抛出', () => {
    const missingLiteralKind: AnyTransformDefinition = {
      schema: object({ kind: string(), params: object({}) }),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    };

    expect(() => extractTransformKind(string())).toThrow(/ZodObject/i);
    expect(() => resolveTransformRegistry([missingLiteralKind])).toThrow(/literal/i);
  });

  it('自定义转换应用使用相同的注册表管线', () => {
    const registry = resolveTransformRegistry([doubleDefinition]);
    const rows = applyTransforms([{ x: 2, y: 5 }], [{ kind: 'double', params: { field: 'x', as: 'x2' } }], {
      registry,
      transformImplementations: [doubleDefinitionImplementation],
    }).rows;

    expect(rows).toEqual([{ x: 2, y: 5, x2: 4 }]);
  });

  it('输入及输出字段参与源字段收集', () => {
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }]);
    const fields = collectSourceFields(spec, resolveTransformRegistry([doubleDefinition]));

    expect([...fields].sort()).toEqual(['x', 'y']);
  });

  it('未知或无效的自定义操作在下沉时抛出', () => {
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x' } } }]);

    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] })).toThrow();
    expect(() =>
      compile(pointSpec([{ operation: { kind: 'unknown-transform', params: { field: 'x', as: 'x2' } } }]), {
        d: [{ x: 2, y: 5 }],
      }),
    ).toThrow(/not registered/i);
  });

  it('注册自定义输出字段后严格模型校验通过', () => {
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }]);

    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] })).not.toThrow();
  });

  it('未注册自定义输出字段时严格模型校验拒绝', () => {
    const missingOutputDefinition = defineTransform({
      kind: 'double',
      paramsSchema: doubleDefinition.schema.shape.params,
      inputFields: operation => [operation.params.field],
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }]);

    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] }, [missingOutputDefinition])).toThrow(/x2/);
  });

  it('自定义组来源跟踪源索引', () => {
    const registry = resolveTransformRegistry([groupSumDefinition]);
    const rows = applyTransforms(
      tagSourceIndex([
        { group: 'A', value: 2 },
        { group: 'A', value: 3 },
        { group: 'B', value: 5 },
      ]),
      [{ kind: 'group-sum', params: { groupBy: 'group', field: 'value', as: 'total' } }],
      { registry, transformImplementations: [groupSumDefinitionImplementation] },
    ).rows;

    expect(rows).toEqual([
      expect.objectContaining({ group: 'A', total: 5 }),
      expect.objectContaining({ group: 'B', total: 5 }),
    ]);
    expect(readSourceIndices(rows[0])).toEqual([0, 1]);
    expect(readSourceIndices(rows[1])).toEqual([2]);
  });

  it('自定义然后内置链使用一个注册表', () => {
    const registry = resolveTransformRegistry([doubleDefinition]);
    const rows = applyTransforms(
      [{ x: 2 }, { x: 1 }],
      [
        { kind: 'double', params: { field: 'x', as: 'x2' } },
        { kind: 'sort', params: { field: 'x2', order: 'descending' } },
      ],
      { registry, transformImplementations: [doubleDefinitionImplementation] },
    ).rows;

    expect(rows.map(row => row.x2)).toEqual([4, 2]);
  });
});
