/**
 * Path generator 注册面 — 对抗回归（ADR-02）
 *
 * 来自 Adversarial Bug Hunter 的边角 IR / generator def。坏 def（Infinity params / generate 产
 * NaN·Infinity·坏命令 / 返回非数组 / targetParams 值非 Target / generate 抛错）现在都被 compile
 * 在源头拦下、抛含 generator 名的清晰错（或 schema 拒），守「IR / Scene 100% JSON 可序列化」。
 * 可接受的边角（空数组 / 1e6 段 / unresolve / 字符串当 id / scope 增量语义）保持稳定行为。
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { compileToScene } from '../../src/compile/compile';
import { definePathGenerator } from '../../src/pathGenerators';
import { JsonObjectSchema, PathSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { PathCommand, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const firstDrawnPath = (
  prims: ReadonlyArray<ScenePrimitive>,
): Extract<ScenePrimitive, { type: 'path' }> | undefined =>
  flattenPrims(prims).find(
    (p): p is Extract<ScenePrimitive, { type: 'path' }> => p.type === 'path',
  );

/** 递归收集任意值里所有 number；用于 finite 审计 */
const collectNumbers = (v: unknown, out: Array<number> = []): Array<number> => {
  if (typeof v === 'number') out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectNumbers(x, out);
  else if (v && typeof v === 'object')
    for (const x of Object.values(v)) collectNumbers(x, out);
  return out;
};

const wrapPath = (
  steps: Array<Record<string, unknown>>,
  extraChildren: Array<Record<string, unknown>> = [],
): IR =>
  ({
    version: 1,
    type: 'scene',
    children: [...extraChildren, { type: 'path', children: steps }],
  }) as unknown as IR;

const catchCompile = (
  ir: IR,
  gens: Record<string, ReturnType<typeof definePathGenerator>>,
): Error | undefined => {
  try {
    compileToScene(ir, { pathGenerators: gens });
    return undefined;
  } catch (e) {
    return e as Error;
  }
};

// ───────────────────────────────────────────────────────────────────────────
// AI 一等公民 — JSON 可序列化护栏（params 入口 + generate 出口双向）
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] JSON 可序列化护栏', () => {
  it('params_infinity_rejected：Infinity / -Infinity 被双 parse 拦（JsonValueSchema finite）', () => {
    expect(JsonObjectSchema.safeParse({ k: Infinity }).success).toBe(false);
    expect(JsonObjectSchema.safeParse({ k: -Infinity }).success).toBe(false);
    expect(JsonObjectSchema.safeParse({ k: Number.NaN }).success).toBe(false);
    expect(JsonObjectSchema.safeParse({ k: 3.14 }).success).toBe(true);
  });

  it('ir_with_infinity_param_rejected：含 Infinity param 的 generator step 被 PathSchema 拒', () => {
    const path = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: 'g', to: [10, 0], params: { coeff: Infinity } },
      ],
    };
    expect(PathSchema.safeParse(path).success).toBe(false);
  });

  it('generate_returns_NaN_coord：generate 产 NaN 坐标 → 抛（不放任入 Scene）', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: () => [{ kind: 'line', to: [Number.NaN, Number.NaN] }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow(/non-finite coordinate/i);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow(/'gen'/);
  });

  it('generate_returns_Infinity_coord：generate 产 Infinity 坐标 → 抛', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [Infinity, from[1]] }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow(/non-finite coordinate/i);
  });

  it('infinity_param_rejected_before_generate：Infinity param 在双 parse 即被拦（不进 generate）', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({ k: z.number() }),
      generate: ({ from, params }) => {
        const k = params.k as number;
        return [{ kind: 'line', to: [from[0] + k * 0, from[1] + k] }];
      },
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: { k: Infinity } },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow();
  });

  it('scene_roundtrip_finite：干净 generator 产物 Scene round-trip 无损 + 全 finite', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({ n: z.number() }),
      generate: ({ from, params }) => {
        const cmds: Array<PathCommand> = [];
        const n = params.n as number;
        for (let i = 1; i <= n; i++) cmds.push({ kind: 'line', to: [from[0] + i, from[1] + i] });
        return cmds;
      },
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: { n: 5 } },
    ]);
    const scene = compileToScene(ir, { pathGenerators: { gen } });
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
    expect(collectNumbers(scene as unknown).every(Number.isFinite)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 双 parse 护栏：非 JSON 输出全部被第二道拦
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] 双 parse 护栏', () => {
  const probe = (transform: (o: { a: number }) => Record<string, unknown>): Error | undefined => {
    const sneaky = z.object({ a: z.number() }).transform(transform);
    const gen = definePathGenerator({
      paramsSchema: sneaky as unknown as z.ZodType<Record<string, never>>,
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: { a: 1 } },
    ]);
    return catchCompile(ir, { gen });
  };

  it('transform 注入 undefined → 第二道护栏拦下', () => {
    expect(probe(o => ({ ...o, injected: undefined }))).toBeDefined();
  });
  it('transform 注入 function → 第二道护栏拦下', () => {
    expect(probe(o => ({ ...o, fn: () => 1 }))).toBeDefined();
  });
  it('transform 注入 Infinity → 第二道护栏拦下', () => {
    expect(probe(o => ({ ...o, big: Number.POSITIVE_INFINITY }))).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// generate 输出校验：非数组 / 坏命令 / 抛错 → 含 generator 名的清晰错
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] generate 输出校验', () => {
  it('returns_empty：空数组不崩', () => {
    const gen = definePathGenerator({ paramsSchema: z.object({}), generate: () => [] });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
      { type: 'step', kind: 'line', to: [10, 10] },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).not.toThrow();
  });

  const expectNonArrayThrows = (generate: () => Array<PathCommand>): void => {
    const badGen = definePathGenerator({ paramsSchema: z.object({}), generate });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'badGen', params: {} },
    ]);
    const err = catchCompile(ir, { badGen });
    expect(err?.message).toMatch(/must return an array of path commands/);
    expect(err?.message).toMatch(/badGen/);
  };

  it('返回 null（非数组）→ 抛"must return an array"（含 generator 名）', () =>
    expectNonArrayThrows((() => null) as unknown as () => Array<PathCommand>));
  it('返回 undefined（非数组）→ 抛', () =>
    expectNonArrayThrows((() => undefined) as unknown as () => Array<PathCommand>));
  it('返回 object（非数组）→ 抛', () =>
    expectNonArrayThrows((() => ({ kind: 'line', to: [1, 1] })) as unknown as () => Array<PathCommand>));
  it('返回 string（可迭代但非数组）→ 抛（不再逐字符产 garbage close）', () =>
    expectNonArrayThrows((() => 'oops') as unknown as () => Array<PathCommand>));

  it('unknown_cmd_kind：未知 cmd.kind → 抛 unknown kind（不静默当 close）', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: () => [{ kind: 'bogus', to: [5, 5] } as unknown as PathCommand],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow(/unknown kind 'bogus'/);
  });

  it('cmd_missing_field：cubic 缺 control2 → 抛 non-finite（含 cubic + generator 名）', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: () => [{ kind: 'cubic', control1: [1, 2], to: [3, 4] } as unknown as PathCommand],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
    ]);
    const err = catchCompile(ir, { gen });
    expect(err?.message).toMatch(/'gen'/);
    expect(err?.message).toMatch(/cubic/);
  });

  it('cmd_string_coord：line.to 含非数字 → 抛 non-finite（不静默 NaN 入 Scene）', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: () => [{ kind: 'line', to: [5, 'oops'] } as unknown as PathCommand],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow(/non-finite coordinate/i);
  });

  it('throws_inside：generate 内部抛错 → 包成 "path generator \'X\' threw: ..."（含名 + 原因）', () => {
    const throwingGen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: () => {
        throw new Error('boom inside generate');
      },
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'throwingGen', params: {} },
    ]);
    const err = catchCompile(ir, { throwingGen });
    expect(err?.message).toMatch(/throwingGen/);
    expect(err?.message).toMatch(/boom inside generate/);
  });

  it('huge_output：产 1e6 段有界完成（无死循环 / 无 OOM）', () => {
    const N = 1_000_000;
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => {
        const cmds: Array<PathCommand> = [];
        for (let i = 0; i < N; i++) cmds.push({ kind: 'line', to: [from[0] + i, from[1]] });
        return cmds;
      },
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
    ]);
    const drawn = firstDrawnPath(compileToScene(ir, { pathGenerators: { gen } }).primitives);
    expect(drawn?.commands.length ?? 0).toBeGreaterThanOrEqual(N);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// targetParams resolve 边角
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] targetParams resolve 边角', () => {
  it('unresolvable_id：指向不存在 id → resolvedTargets 缺该 key（不崩）', () => {
    let seen: Record<string, unknown> | undefined;
    const gen = definePathGenerator({
      paramsSchema: z.object({ bend: z.object({ id: z.string() }) }),
      targetParams: ['bend'],
      generate: ({ from, to, resolvedTargets }) => {
        seen = resolvedTargets;
        return [{ kind: 'line', to: to ?? from }];
      },
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', to: [50, 0], params: { bend: { id: 'NOPE' } } },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).not.toThrow();
    expect(seen && 'bend' in seen).toBe(false);
  });

  it('listed_not_in_params：列了 key 但 params 没该 key → 跳过不崩', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({ other: z.number() }),
      targetParams: ['bend'],
      generate: ({ from, to }) => [{ kind: 'line', to: to ?? from }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', to: [50, 0], params: { other: 1 } },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).not.toThrow();
  });

  it.each([
    ['number', 42],
    ['boolean', true],
  ] as const)('值是 %s（非 Target）→ 抛清晰错（含 key + got 类型）', (label, value) => {
    const gen = definePathGenerator({
      paramsSchema: z.object({ bend: label === 'number' ? z.number() : z.boolean() }),
      targetParams: ['bend'],
      generate: ({ from, to }) => [{ kind: 'line', to: to ?? from }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', to: [50, 0], params: { bend: value } },
    ]);
    const err = catchCompile(ir, { gen });
    expect(err?.message).toMatch(/targetParams key 'bend'/);
    expect(err?.message).toMatch(new RegExp(`got ${label}`));
  });

  it('value_is_string：字符串被当 node id 解析（隐式语义，文档化）', () => {
    let seen: Record<string, [number, number]> | undefined;
    const gen = definePathGenerator({
      paramsSchema: z.object({ bend: z.string() }),
      targetParams: ['bend'],
      generate: ({ from, to, resolvedTargets }) => {
        seen = resolvedTargets;
        return [{ kind: 'line', to: to ?? from }];
      },
    });
    const ir = wrapPath(
      [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: 'gen', to: [50, 0], params: { bend: 'C' } },
      ],
      [{ type: 'coordinate', id: 'C', position: [7, 7] }],
    );
    compileToScene(ir, { pathGenerators: { gen } });
    expect(seen?.bend).toEqual([7, 7]);
  });

  it('value_is_position_array：[x,y] 数组被 resolve 成坐标', () => {
    let seen: Record<string, [number, number]> | undefined;
    const gen = definePathGenerator({
      paramsSchema: z.object({ bend: z.tuple([z.number(), z.number()]) }),
      targetParams: ['bend'],
      generate: ({ from, to, resolvedTargets }) => {
        seen = resolvedTargets;
        return [{ kind: 'line', to: to ?? from }];
      },
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', to: [50, 0], params: { bend: [3, 4] } },
    ]);
    compileToScene(ir, { pathGenerators: { gen } });
    expect(seen?.bend).toEqual([3, 4]);
  });

  it('duplicate_key：同 key 列两次幂等不崩', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({ bend: z.object({ id: z.string() }) }),
      targetParams: ['bend', 'bend'],
      generate: ({ from, to }) => [{ kind: 'line', to: to ?? from }],
    });
    const ir = wrapPath(
      [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: 'gen', to: [50, 0], params: { bend: { id: 'C' } } },
      ],
      [{ type: 'coordinate', id: 'C', position: [1, 2] }],
    );
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).not.toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 未注册 / 名称边角
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] 未注册 / 名称边角', () => {
  it('no_generators_option：不传 pathGenerators → throw 含 step name', () => {
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'parabola', params: {} },
    ]);
    let err: Error | undefined;
    try {
      compileToScene(ir);
    } catch (e) {
      err = e as Error;
    }
    expect(err?.message).toMatch(/parabola/);
  });

  it('empty_generators_table：空表 available 显示 (none registered)', () => {
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'sin', params: {} },
    ]);
    const err = catchCompile(ir, {});
    expect(err?.message).toBe("Unknown path generator 'sin'; available: (none registered)");
  });

  it('name_case_mismatch：大小写敏感', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'parabola', params: {} },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { Parabola: gen } })).toThrow(/parabola/);
  });

  it('name_proto_pollution：原型链 key 经 hasOwnProperty 守门 → throw', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    for (const evil of ['__proto__', 'constructor', 'hasOwnProperty', 'toString', 'valueOf']) {
      const ir = wrapPath([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: evil, params: {} },
      ]);
      expect(() => compileToScene(ir, { pathGenerators: { gen } })).toThrow();
    }
  });

  it('available_list_sorted：错误里 available 名按字典序排序', () => {
    const g = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'zzz', params: {} },
    ]);
    const err = catchCompile(ir, { banana: g, apple: g, cherry: g });
    expect(err?.message).toMatch(/apple, banana, cherry/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// cursor / 衔接（稳定行为）
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] cursor / 衔接', () => {
  it('generator_as_first_step：generator 作首 step（无前驱 move）不崩', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 10, from[1]] }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'generator', name: 'gen', to: [5, 5], params: {} },
      { type: 'step', kind: 'line', to: [20, 20] },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).not.toThrow();
  });

  it('generator_then_generator：两个 generator 串联 cursor 衔接', () => {
    const g1 = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 10, from[1]] }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'g1', params: {} },
      { type: 'step', kind: 'generator', name: 'g1', params: {} },
    ]);
    const drawn = firstDrawnPath(compileToScene(ir, { pathGenerators: { g1 } }).primitives);
    const lines = drawn?.commands.filter(c => c.kind === 'line') ?? [];
    expect(lines[lines.length - 1].to[0]).toBe(20);
  });

  it('empty_generator_then_line：generator 产空后接 line 不崩', () => {
    const empty = definePathGenerator({ paramsSchema: z.object({}), generate: () => [] });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'empty', to: [99, 99], params: {} },
      { type: 'step', kind: 'line', to: [50, 50] },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { empty } })).not.toThrow();
  });

  it('generator_only_move_no_draw：generator 只产 move 后接 line 不崩', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'move', to: [from[0] + 5, from[1] + 5] }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {} },
      { type: 'step', kind: 'line', to: [30, 30] },
    ]);
    expect(() => compileToScene(ir, { pathGenerators: { gen } })).not.toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 与既有交叉 / round-trip 综合
// ───────────────────────────────────────────────────────────────────────────
describe('[ADV] 与既有交叉 / round-trip', () => {
  it('generator_in_scale_scope：scope 缩放作用于游标，generate 增量在世界系（语义记录）', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 10, from[1]] }],
    });
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: 2 }],
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [5, 5] },
                { type: 'step', kind: 'generator', name: 'gen', params: {} },
              ],
            },
          ],
        },
      ],
    } as unknown as IR;
    const drawn = firstDrawnPath(compileToScene(ir, { pathGenerators: { gen } }).primitives);
    const move = drawn?.commands.find(c => c.kind === 'move');
    const line = drawn?.commands.find(c => c.kind === 'line');
    if (move) expect(move.to).toEqual([10, 10]);
    if (line) expect(line.to).toEqual([20, 10]);
  });

  it('unicode_and_bignum_params_roundtrip：Unicode key / 大数 round-trip 一致', () => {
    const path = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'generator',
          name: 'g',
          to: [10, 0],
          params: { '键🔑': '値', big: 1234567890123, small: 1e-300, nested: { ключ: [1, 2, { deep: '深' }] } },
        },
      ],
    };
    const a = PathSchema.safeParse(path);
    const b = PathSchema.safeParse(JSON.parse(JSON.stringify(path)));
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      const ga = a.data.children[1];
      const gb = b.data.children[1];
      expect(ga.kind === 'generator' && ga.params).toEqual(gb.kind === 'generator' ? gb.params : undefined);
    }
  });

  it('generator_with_label：generator step 带 label 产 TextPrim', () => {
    const gen = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 60, from[1]] }],
    });
    const ir = wrapPath([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'generator', name: 'gen', params: {}, label: { text: 'gen', position: 'midway' } },
    ]);
    const scene = compileToScene(ir, { pathGenerators: { gen } });
    expect(flattenPrims(scene.primitives).some(p => p.type === 'text')).toBe(true);
  });
});
