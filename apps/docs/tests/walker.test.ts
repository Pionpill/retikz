import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { walk, walkType } from '@/modules/docs/components';

describe('walker — 基元和字面量', () => {
  it('保留 prefault 字段类型及约束', () => {
    const result = walk(z.strictObject({ value: z.number().min(2).prefault(3).optional() }));

    expect(result).toMatchObject({
      kind: 'object',
      fields: [
        {
          name: 'value',
          optional: true,
          type: { kind: 'default', inner: { kind: 'primitive', name: 'number' } },
          constraints: ['min 2'],
        },
      ],
    });
  });

  it('将 z.string() 遍历为基础类型', () => {
    expect(walkType(z.string())).toEqual({ kind: 'primitive', name: 'string' });
  });

  it('将 z.number() 遍历为基础类型', () => {
    expect(walkType(z.number())).toEqual({ kind: 'primitive', name: 'number' });
  });

  it('将 z.boolean() 遍历为基础类型', () => {
    expect(walkType(z.boolean())).toEqual({ kind: 'primitive', name: 'boolean' });
  });

  it('将 z.null() 遍历为 null 字面量', () => {
    expect(walkType(z.null())).toEqual({ kind: 'literal', value: null });
  });

  it('将 z.literal("coordinate") 遍历为字面量', () => {
    expect(walkType(z.literal('coordinate'))).toEqual({ kind: 'literal', value: 'coordinate' });
  });

  it('将 z.literal(1) 遍历为字面量', () => {
    expect(walkType(z.literal(1))).toEqual({ kind: 'literal', value: 1 });
  });
});

describe('walker — 枚举/nativeEnum/数组', () => {
  it('将 z.enum 遍历为枚举表示', () => {
    expect(walkType(z.enum(['a', 'b', 'c']))).toEqual({
      kind: 'enum',
      values: ['a', 'b', 'c'],
    });
  });

  it('将 z.nativeEnum 遍历为枚举表示', () => {
    const E = { Red: 'red', Blue: 'blue' } as const;
    const r = walkType(z.nativeEnum(E));

    expect(r.kind).toBe('enum');

    if (r.kind === 'enum') expect(new Set(r.values)).toEqual(new Set(['red', 'blue']));
  });

  it('遍历基础类型元素的 z.array', () => {
    expect(walkType(z.array(z.number()))).toEqual({
      kind: 'array',
      element: { kind: 'primitive', name: 'number' },
      constraints: [],
    });
  });

  it('遍历带有 .min(2) 约束的 z.array', () => {
    const r = walkType(z.array(z.string()).min(2));

    expect(r).toEqual({
      kind: 'array',
      element: { kind: 'primitive', name: 'string' },
      constraints: ['min 2'],
    });
  });
});

describe('walker — 元组/惰性/联合/discriminatedUnion', () => {
  it('将 z.tuple 遍历为元组表示', () => {
    expect(walkType(z.tuple([z.number(), z.number()]))).toEqual({
      kind: 'tuple',
      elements: [
        { kind: 'primitive', name: 'number' },
        { kind: 'primitive', name: 'number' },
      ],
    });
  });

  it('通过展开内部 schema 来遍历 z.lazy', () => {
    const Lazy = z.lazy(() => z.string());

    expect(walkType(Lazy)).toEqual({ kind: 'primitive', name: 'string' });
  });

  it('递归遍历 z.union 成员', () => {
    const r = walkType(z.union([z.string(), z.number()]));

    expect(r).toEqual({
      kind: 'union',
      members: [
        { kind: 'primitive', name: 'string' },
        { kind: 'primitive', name: 'number' },
      ],
    });
  });

  it('保留顶级联合内的注册名称', async () => {
    const { TransformSchema } = await import('@retikz/core');
    const r = walk(TransformSchema);

    expect(r.kind).toBe('alias');

    if (r.kind !== 'alias' || r.type.kind !== 'union') throw new Error('expected union alias');

    expect(r.type.members[0]).toMatchObject({
      kind: 'ref',
      name: 'TranslateSchema',
    });
  });

  it('遍历交叉类型以保留自定义裁剪分支的两份契约', async () => {
    const { ClipSchema } = await import('@retikz/core');
    const r = walk(ClipSchema);

    expect(r.kind).toBe('alias');

    if (r.kind !== 'alias' || r.type.kind !== 'union') throw new Error('expected union alias');

    expect(r.type.members[1]).toMatchObject({
      kind: 'intersection',
      members: [
        { kind: 'object', fields: [{ name: 'kind' }] },
        { kind: 'ref', name: 'JsonObjectSchema' },
      ],
    });
  });

  it('以与 union 相同的方式遍历 z.discriminatedUnion', () => {
    const A = z.object({ type: z.literal('a'), x: z.number() });
    const B = z.object({ type: z.literal('b'), y: z.string() });
    const r = walkType(z.discriminatedUnion('type', [A, B]));

    expect(r.kind).toBe('union');

    if (r.kind === 'union') expect(r.members).toHaveLength(2);
  });

  it('当输出不透明时，回退到变换管线输入', () => {
    const schema = z
      .union([z.number(), z.strictObject({ row: z.number(), column: z.number() })])
      .transform(value => (typeof value === 'number' ? { row: value, column: value } : value));
    const r = walkType(schema);

    expect(r).toMatchObject({
      kind: 'union',
      members: [
        { kind: 'primitive', name: 'number' },
        { kind: 'object', fields: [{ name: 'row' }, { name: 'column' }] },
      ],
    });
  });

  it('在注册时解析联合成员以进行引用', async () => {
    // 用 IR 真实 schema 验证：CoordinateSchema.position 是 union of Position / PolarPosition / AtPosition / OffsetPosition / BetweenPosition，五者均注册
    const { CoordinateSchema } = await import('@retikz/core');
    const positionField = CoordinateSchema.shape.position;
    const r = walkType(positionField);

    expect(r.kind).toBe('union');

    if (r.kind === 'union') {
      const labels = r.members.map(m => (m.kind === 'ref' ? m.name : `<${m.kind}>`));

      expect(labels).toEqual([
        'PositionSchema',
        'PolarPositionSchema',
        'AtPositionSchema',
        'OffsetPositionSchema',
        'BetweenPositionSchema',
      ]);
    }
  });
});

describe('walker — 顶级条目+对象+可选+约束', () => {
  it('将顶级 z.object 遍历到 SchemaRepr kind=object', async () => {
    const { CoordinateSchema } = await import('@retikz/core');
    const r = walk(CoordinateSchema);

    expect(r.kind).toBe('object');

    if (r.kind === 'object') {
      expect(r.description).toMatch(/Coordinate placeholder/);

      const names = r.fields.map(f => f.name);

      expect(names).toEqual(['type', 'id', 'position']);
    }
  });

  it('顶级非对象发出 SchemaRepr kind=alias', async () => {
    const { PositionSchema } = await import('@retikz/core');
    const r = walk(PositionSchema);

    expect(r.kind).toBe('alias');

    if (r.kind === 'alias') {
      expect(r.description).toMatch(/Cartesian/);
      expect(r.type.kind).toBe('tuple');
    }
  });

  it('标记可选字段', () => {
    const S = z.object({
      a: z.string(),
      b: z.string().optional(),
    });
    const r = walk(S);
    if (r.kind !== 'object') throw new Error('expected object');

    expect(r.fields[0].optional).toBe(false);
    expect(r.fields[1].optional).toBe(true);
  });

  it('提取数字约束', () => {
    const S = z.object({
      ratio: z.number().min(0).max(1),
      size: z.number().positive(),
      pad: z.number().nonnegative(),
      tag: z.string().min(1),
    });
    const r = walk(S);
    if (r.kind !== 'object') throw new Error('expected object');

    const cmap = Object.fromEntries(r.fields.map(f => [f.name, f.constraints]));

    expect(cmap.ratio).toContain('0..1');
    expect(cmap.size).toContain('positive');
    expect(cmap.pad).toContain('nonnegative');
    expect(cmap.tag).toContain('min 1');
  });

  it('捕获每个字段的 .describe()', async () => {
    const { CoordinateSchema } = await import('@retikz/core');
    const r = walk(CoordinateSchema);
    if (r.kind !== 'object') throw new Error('expected object');

    const idField = r.fields.find(f => f.name === 'id')!;

    expect(idField.description).toMatch(/Required unique id/);
  });

  it('内联扩展匿名嵌套对象', () => {
    const S = z.object({
      meta: z.object({
        x: z.number(),
        y: z.string(),
      }),
    });
    const r = walk(S);
    if (r.kind !== 'object') throw new Error('expected object');

    const meta = r.fields[0];

    expect(meta.type.kind).toBe('object');

    if (meta.type.kind === 'object') {
      expect(meta.type.fields.map(f => f.name)).toEqual(['x', 'y']);
    }
  });

  it('内联扩展联合内的匿名对象', () => {
    // 对应 LineSchema 那种"union 里夹一个匿名 object"
    const S = z.union([z.string(), z.object({ text: z.string(), color: z.string().optional() })]);
    const r = walkType(S);
    if (r.kind !== 'union') throw new Error('expected union');

    expect(r.members[0]).toEqual({ kind: 'primitive', name: 'string' });
    expect(r.members[1].kind).toBe('object');

    if (r.members[1].kind === 'object') {
      expect(r.members[1].fields.map(f => f.name)).toEqual(['text', 'color']);
    }
  });

  it('将松散对象标记为允许附加属性', () => {
    const r = walkType(z.looseObject({ kind: z.string() }));

    expect(r).toMatchObject({
      kind: 'object',
      additionalProperties: true,
    });
  });

  it('遍历顶级所属模块 schema，同时保留其描述', async () => {
    const { ThemeSchema } = await import('@retikz/core');
    const r = walk(ThemeSchema);

    expect(r.kind).toBe('object');

    if (r.kind !== 'object') throw new Error('expected object');

    expect(r.description).toMatch(/Sparse Theme override/);
    expect(r.fields.map(field => field.name)).toEqual(['style', 'mode']);
  });

  it('字段包装器的描述优先于引用 schema 的描述', async () => {
    const { SceneSchema, ScopeSchema } = await import('@retikz/core');
    const scene = walk(SceneSchema);
    const scope = walk(ScopeSchema);

    if (scene.kind !== 'object' || scope.kind !== 'object') throw new Error('expected objects');

    expect(scene.fields.find(field => field.name === 'theme')?.description).toBe(SceneSchema.shape.theme.description);
    expect(scope.fields.find(field => field.name === 'theme')?.description).toBe(ScopeSchema.shape.theme.description);
  });
});

it('保留具名 union 子类型与共享节点几何名称', async () => {
  const { BoundarySchema, NodeSchema, NodeLayoutSchema } = await import('@retikz/core');

  expect(JSON.stringify(walk(BoundarySchema))).toContain('ShapeRefSchema');
  expect(JSON.stringify(walk(NodeSchema))).toContain('AxisScaleSchema');

  const layout = JSON.stringify(walk(NodeLayoutSchema));

  expect(layout).toContain('BoxSizeSchema');
  expect(layout).toContain('BoxSpacingSchema');
});

it('准确显示必填字段和只读字段以及禁止的联合输入', () => {
  const schema = z
    .strictObject({
      data: z.array(z.string()).readonly().optional(),
      items: z.never().optional(),
    })
    .required({ data: true });
  const result = walk(schema);

  expect(result).toMatchObject({
    kind: 'object',
    fields: [
      { name: 'data', optional: false, type: { kind: 'array', element: { kind: 'primitive', name: 'string' } } },
      { name: 'items', optional: true, type: { kind: 'primitive', name: 'never' } },
    ],
  });
});
