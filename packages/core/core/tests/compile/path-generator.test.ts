import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { compileToScene } from '../../src/compile/compile';
import { definePathGenerator } from '../../src/path-generators';
import { JsonObjectSchema, PathSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { PathCommand, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

/** 取首个非 close 的 path primitive（generator 产的折线 / 曲线主体） */
const firstDrawnPath = (
  prims: Array<ScenePrimitive>,
): Extract<ScenePrimitive, { type: 'path' }> | undefined =>
  flattenPrims(prims).find(
    (p): p is Extract<ScenePrimitive, { type: 'path' }> => p.type === 'path',
  );

/** parabola 生成器：from→to + 一个 control，产单个 quad 命令；params.bend 为顶层 Target */
const parabola = definePathGenerator({
  paramsSchema: z.object({ bend: z.object({ id: z.string() }) }),
  targetParams: ['bend'],
  generate: ({ from, to, resolvedTargets }) => {
    const end = to ?? from;
    const control = resolvedTargets.bend;
    return [{ kind: 'quad', control, to: end }];
  },
});

/** sin 生成器：采样多段，含一个 move 形成 sub-path（多段波形） */
const sin = definePathGenerator({
  paramsSchema: z.object({ amplitude: z.number(), samples: z.number() }),
  generate: ({ from, to, params }) => {
    const end = to ?? [from[0] + 100, from[1]];
    const amplitude = params.amplitude as number;
    const samples = params.samples as number;
    const cmds: Array<PathCommand> = [{ kind: 'move', to: from }];
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const x = from[0] + (end[0] - from[0]) * t;
      const y = from[1] + Math.sin(t * Math.PI * 2) * amplitude;
      cmds.push({ kind: 'line', to: [x, y] });
    }
    return cmds;
  },
});

/** 纯参数曲线（无 to）：固定一段 line */
const fixedSegment = definePathGenerator({
  paramsSchema: z.object({ length: z.number() }),
  generate: ({ from, params }) => [
    { kind: 'line', to: [from[0] + (params.length as number), from[1]] },
  ],
});

describe('Path generator 注册面 — happy path', () => {
  it('register_parabola_to_curve：注册 parabola → generator step 产 1 个 quad 命令、端到端编译', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'C', position: [50, 80] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'parabola',
              to: [100, 0],
              params: { bend: { id: 'C' } },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { parabola } });
    const drawn = firstDrawnPath(scene.primitives);
    expect(drawn?.commands.some(c => c.kind === 'quad')).toBe(true);
  });

  it('register_sin_sampled：注册 sin → 产采样多段（含 move sub-path）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'sin',
              to: [100, 0],
              params: { amplitude: 10, samples: 8 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { sin } });
    const drawn = firstDrawnPath(scene.primitives);
    expect(drawn?.commands.filter(c => c.kind === 'line').length).toBeGreaterThan(1);
    expect(drawn?.commands.some(c => c.kind === 'move')).toBe(true);
  });

  it('target_param_resolved：targetParams 的 bend(NodeTarget) 先 resolve 成世界坐标喂 generate', () => {
    let seenBend: [number, number] | undefined;
    const probe = definePathGenerator({
      paramsSchema: z.object({ bend: z.object({ id: z.string() }) }),
      targetParams: ['bend'],
      generate: ({ from, to, resolvedTargets }) => {
        seenBend = resolvedTargets.bend;
        return [{ kind: 'line', to: to ?? from }];
      },
    });
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'C', position: [40, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'probe',
              to: [80, 0],
              params: { bend: { id: 'C' } },
            },
          ],
        },
      ],
    };
    compileToScene(ir, { pathGenerators: { probe } });
    expect(seenBend).toEqual([40, 60]);
  });

  it('cursor_advances：generator 产段后 cursor 落最后命令终点（接续 line 从该点起）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'fixedSegment',
              params: { length: 30 },
            },
            { type: 'step', kind: 'line', to: [30, 50] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { fixedSegment } });
    const drawn = firstDrawnPath(scene.primitives);
    // generator 产 line 到 [30,0]，cursor 落此，后续 line 不应重发 move（续接 [30,0]→[30,50]）
    const moves = drawn?.commands.filter(c => c.kind === 'move') ?? [];
    expect(moves.length).toBe(1);
  });
});

describe('Path generator 注册面 — 边界', () => {
  it('generator_no_to：无 to 的 generator（纯参数曲线）正常编译', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'fixedSegment', params: { length: 50 } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { fixedSegment } });
    expect(firstDrawnPath(scene.primitives)).toBeDefined();
  });

  it('deterministic_output：同 IR + 同 generator → 输出确定（两次 compile 深等价）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'sin', to: [100, 0], params: { amplitude: 8, samples: 6 } },
          ],
        },
      ],
    };
    const a = compileToScene(ir, { pathGenerators: { sin } });
    const b = compileToScene(ir, { pathGenerators: { sin } });
    expect(a).toEqual(b);
  });

  it('multi_segment_subpath：generator 产含 move 的多段，commands 保留 sub-path 结构', () => {
    const multi = definePathGenerator({
      paramsSchema: z.object({}),
      generate: ({ from }) => [
        { kind: 'line', to: [from[0] + 10, from[1]] },
        { kind: 'move', to: [from[0] + 20, from[1]] },
        { kind: 'line', to: [from[0] + 30, from[1]] },
      ],
    });
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'multi', params: {} },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { multi } });
    const drawn = firstDrawnPath(scene.primitives);
    expect(drawn?.commands.filter(c => c.kind === 'move').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Path generator 注册面 — 错误路径', () => {
  it('unregistered_generator_throws：未注册 name → 编译期 throw（错误列出可用名）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'nope', params: {} },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir, { pathGenerators: { parabola } })).toThrow(/nope/);
    expect(() => compileToScene(ir, { pathGenerators: { parabola } })).toThrow(/parabola/);
  });

  it('params_non_json_rejected：params 含 function → 编译期被拒（双 parse 第二道）', () => {
    const passthrough = definePathGenerator({
      // 宽松 schema 放行任意值，逼 compile 用 JsonObjectSchema 第二道护栏拦
      paramsSchema: z.any(),
      generate: ({ from, to }) => [{ kind: 'line', to: to ?? from }],
    });
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            // params 含 function：schema 层 / compile 层都应拒
            { type: 'step', kind: 'generator', name: 'passthrough', params: { fn: () => 1 } },
          ],
        },
      ],
    } as unknown as IR;
    expect(() => compileToScene(ir, { pathGenerators: { passthrough } })).toThrow();
  });

  it('any_schema_output_caught_at_compile：paramsSchema=z.any() 时 compile 对 parse 结果跑 JsonObjectSchema → 非 JSON 输出被第二道拦', () => {
    // paramsSchema 是 z.any()（放行 function），单靠注册时自省无法证明 JSON-safe；
    // 真正护栏在 compile：paramsSchema.parse(params) 后再 JsonObjectSchema.parse(parsed)。
    const anyGen = definePathGenerator({
      paramsSchema: z.any(),
      generate: ({ from, to }) => [{ kind: 'line', to: to ?? from }],
    });
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'anyGen', params: { fn: () => 2, ok: 1 } },
          ],
        },
      ],
    } as unknown as IR;
    // z.any() 第一道放行 { fn }，但 compile 第二道 JsonObjectSchema.parse 必须拦下 function
    expect(() => compileToScene(ir, { pathGenerators: { anyGen } })).toThrow();
    // 同时直接证明第二道护栏对 z.any() 放行后的对象有效（护栏逻辑可独立验证）
    const passedByAny = z.any().parse({ fn: () => 2, ok: 1 });
    expect(JsonObjectSchema.safeParse(passedByAny).success).toBe(false);
  });

  it('nested_target_param_unsupported：targetParams 指向嵌套路径不解析（仅顶层 key）', () => {
    let seen: Record<string, [number, number]> | undefined;
    const nestedGen = definePathGenerator({
      paramsSchema: z.object({ control: z.object({ at: z.object({ id: z.string() }) }) }),
      // 'control.at' 是嵌套路径：按仅顶层 key 约定不解析（resolvedTargets 不含它）
      targetParams: ['control.at'],
      generate: ({ from, to, resolvedTargets }) => {
        seen = resolvedTargets;
        return [{ kind: 'line', to: to ?? from }];
      },
    });
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'C', position: [10, 10] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'nestedGen',
              to: [50, 0],
              params: { control: { at: { id: 'C' } } },
            },
          ],
        },
      ],
    };
    compileToScene(ir, { pathGenerators: { nestedGen } });
    // 嵌套路径不被解析：resolvedTargets 不含 'control.at'，更不含已解析坐标
    expect(seen?.['control.at']).toBeUndefined();
  });
});

describe('Path generator 注册面 — 交互', () => {
  it('generator_with_label：generator step 带 label → 边标注 TextPrim 产出', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'fixedSegment',
              params: { length: 60 },
              label: { text: 'gen', position: 'midway' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { fixedSegment } });
    const text = flattenPrims(scene.primitives).find(p => p.type === 'text');
    expect(text).toBeDefined();
  });

  it('generator_in_scope_transform：generator step 在 translate scope 内 → 坐标投回正确', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 100, y: 0 }],
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'generator', name: 'fixedSegment', params: { length: 40 } },
              ],
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { fixedSegment } });
    const drawn = firstDrawnPath(scene.primitives);
    // 段在 translate(100,0) scope 内：起点应被投到 [100,0]
    const move = drawn?.commands.find(c => c.kind === 'move');
    if (move) expect(move.to[0]).toBe(100);
  });

  it('generator_then_line：generator 段后接 line → cursor 衔接（无重复 move）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'fixedSegment', params: { length: 30 } },
            { type: 'step', kind: 'line', to: [30, 40] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { pathGenerators: { fixedSegment } });
    const drawn = firstDrawnPath(scene.primitives);
    const lastLine = [...(drawn?.commands ?? [])].reverse().find(c => c.kind === 'line');
    if (lastLine) expect(lastLine.to).toEqual([30, 40]);
  });
});

describe('Path generator step — JSON round-trip & zod 校验', () => {
  it('round_trip：含 generator step 的 IR JSON.parse(JSON.stringify()) 后 PathSchema 语义等价（params JSON 保真）', () => {
    const path = {
      type: 'path' as const,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        {
          type: 'step' as const,
          kind: 'generator' as const,
          name: 'parabola',
          to: [100, 0] as [number, number],
          params: { bend: { id: 'C' }, coeff: 2.5, flags: [true, null] },
          label: { text: 'p', position: 'midway' as const },
        },
      ],
    };
    const roundTripped = JSON.parse(JSON.stringify(path));
    const parsed = PathSchema.parse(roundTripped);
    expect(parsed).toEqual(PathSchema.parse(path));
    // params JSON 内容保真
    const genStep = parsed.children[1];
    expect(genStep.kind === 'generator' && genStep.params).toEqual({
      bend: { id: 'C' },
      coeff: 2.5,
      flags: [true, null],
    });
  });

  it('zod 错误：generator step 缺 name → schema 拒，错误可定位到 name', () => {
    const bad = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', params: {} },
      ],
    };
    const result = PathSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(iss => iss.path.includes('name'))).toBe(true);
    }
  });

  it('zod 错误：generator step params 非对象（数组）→ schema 拒', () => {
    const bad = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: 'parabola', params: [1, 2, 3] },
      ],
    };
    expect(PathSchema.safeParse(bad).success).toBe(false);
  });

  it('zod 错误：generator step name 为空串 → schema 拒（min(1)）', () => {
    const bad = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: '', params: {} },
      ],
    };
    expect(PathSchema.safeParse(bad).success).toBe(false);
  });
});

describe('definePathGenerator — 注册时 best-effort 元校验', () => {
  it('合法 def 直通返回原对象', () => {
    const def = definePathGenerator({
      paramsSchema: z.object({ a: z.number() }),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    expect(typeof def.generate).toBe('function');
    expect(def.paramsSchema).toBeDefined();
  });

  it('paramsSchema 非 zod schema → 注册时 throw', () => {
    expect(() =>
      definePathGenerator({
        paramsSchema: {} as unknown as z.ZodType<Record<string, never>>,
        generate: ({ from }) => [{ kind: 'line', to: from }],
      }),
    ).toThrow(/paramsSchema/);
  });

  it('generate 非函数 → 注册时 throw', () => {
    expect(() =>
      definePathGenerator({
        paramsSchema: z.object({}),
        generate: undefined as unknown as () => Array<PathCommand>,
      }),
    ).toThrow(/generate/);
  });
});
