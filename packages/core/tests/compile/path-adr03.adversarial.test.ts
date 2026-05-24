/**
 * ADR-03 Adversarial Bug Hunter：out/in + self-loop / 路径整体变换 / 中段 marking
 * @description 故意构造 LLM / 第三方真实会写的边角 IR，逼出 throw 意外 / NaN / Infinity /
 *   round-trip 失真 / 几何错乱 / 错误信息含糊。本文件只构造新输入跑，不修代码 / schema / 现有测试。
 *
 *   核心契约（DESIGN §1.2/§7 + ADR-03 §4 顺序硬契约）：
 *   - Scene 100% finite + JSON 可序列化（JSON.stringify(NaN/Infinity)=null 会 round-trip 失真）
 *   - zod parse 错误够 LLM 自修
 *   - path transform 顺序：端点先 resolve → shrink 在原始几何 → 最后包 GroupPrim（bbox center 支点）
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR, IRPath, ScenePrimitive } from '../../src';
import type { Scene } from '../../src/primitive';

/** 递归收集 Scene 里所有数值坐标（commands / transforms / layout），判 finite */
const collectNumbers = (value: unknown, out: Array<number> = []): Array<number> => {
  if (typeof value === 'number') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, out);
  } else if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) collectNumbers(v, out);
  }
  return out;
};

/** 断言整个 Scene 内每个数值都 finite（非 NaN / 非 Infinity） */
const expectAllFinite = (scene: Scene): { ok: boolean; bad: Array<number> } => {
  const nums = collectNumbers(scene);
  const bad = nums.filter(n => !Number.isFinite(n));
  return { ok: bad.length === 0, bad };
};

/** JSON round-trip：序列化再 parse，对比是否有 NaN/Infinity 被 JSON.stringify 变成 null（失真） */
const jsonRoundTripLossless = (scene: Scene): boolean => {
  const serialized = JSON.stringify(scene);
  // null 出现在数值位置说明有 NaN/Infinity 被吞；这里用更直接的判据：原始 Scene 内所有数值都 finite
  // 才能保证 round-trip 无损（finite 数 JSON 往返恒等）。
  if (serialized.includes('null')) {
    // 注意：合法 Scene 不应出现 null 数值（字段缺省是不写 key 而非 null）
    return false;
  }
  return true;
};

/** 简化 IR：单条 path + 任意 path-level 字段 */
const pathIR = (children: IRPath['children'], extra: Record<string, unknown> = {}): IR => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'path', ...extra, children }],
});

const linePath = (extra: Record<string, unknown> = {}): IR =>
  pathIR(
    [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
    ],
    extra,
  );

const findPath = (prims: ReadonlyArray<ScenePrimitive>): ScenePrimitive | undefined => {
  for (const p of prims) {
    if (p.type === 'path') return p;
    if (p.type === 'group') {
      const inner = findPath(p.children);
      if (inner) return inner;
    }
  }
  return undefined;
};

const firstCubic = (prims: ReadonlyArray<ScenePrimitive>) => {
  const path = findPath(prims);
  if (!path || path.type !== 'path') throw new Error('no path');
  const c = path.commands.find(x => x.kind === 'cubic');
  if (!c) throw new Error('no cubic');
  return c;
};

// =====================================================================
// 攻击面 1：bendAngle 非 finite 越界（schema 未守 bendAngle）→ tan 爆 / 控制点非 finite
// =====================================================================
describe('ATTACK 1: bendAngle 边角值（finite 守卫：schema .finite() + emit 控制点守卫）', () => {
  it('bendAngle=180 → tan(90°) 巨大控制点；Scene 是否仍 finite', () => {
    const scene = compileToScene(
      pathIR([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: 180 },
      ]),
    );
    const fin = expectAllFinite(scene);
    // 诊断：tan(90°) 在 JS ≈ 1.6e16（finite），控制点巨大但 finite；记录 bbox 是否被撑爆
    expect(fin.ok).toBe(true);
  });

  it('bendAngle=NaN → 编译期抛（emit 守卫拦非 finite 控制点；schema .finite() 拦校验路径）', () => {
    const ir = pathIR([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: Number.NaN },
    ]);
    expect(() => compileToScene(ir)).toThrow(/non-finite control point/i);
  });

  it('bendAngle=Infinity → tan(Inf)=NaN → 控制点非 finite → 编译期抛', () => {
    const ir = pathIR([
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'bend',
        to: [10, 0],
        bendDirection: 'left',
        bendAngle: Number.POSITIVE_INFINITY,
      },
    ]);
    expect(() => compileToScene(ir)).toThrow(/non-finite control point/i);
  });
});

// =====================================================================
// 攻击面 2：out/in 半侧给定 + looseness 极值
// =====================================================================
describe('ATTACK 2: out/in 半侧 + looseness 极值', () => {
  it('只给 outAngle 不给 inAngle → inAngle 兜底 180（默认）；Scene finite', () => {
    const scene = compileToScene(
      pathIR([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0], outAngle: 45 },
      ]),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
    const cubic = firstCubic(scene.primitives);
    // control1 沿 outAngle=45
    const outDir = (Math.atan2(cubic.control1[1] - 0, cubic.control1[0] - 0) * 180) / Math.PI;
    expect(Math.abs(((outDir - 45 + 540) % 360) - 180)).toBeLessThan(2);
  });

  it('looseness=1e-9（趋 0）→ 控制点几乎贴端点；仍 finite，不退化为 NaN', () => {
    const scene = compileToScene(
      pathIR([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0], outAngle: 60, inAngle: 120, looseness: 1e-9 },
      ]),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('looseness=Number.MAX_VALUE → d = MAX × dist 溢出 Infinity 控制点 → 编译期抛', () => {
    const ir = pathIR([
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'bend',
        to: [10, 0],
        outAngle: 60,
        inAngle: 120,
        looseness: Number.MAX_VALUE,
      },
    ]);
    expect(() => compileToScene(ir)).toThrow(/non-finite control point/i);
  });
});

// =====================================================================
// 攻击面 3：self-loop（from==to）退化几何
// =====================================================================
describe('ATTACK 3: self-loop 退化几何', () => {
  it('from==to 坐标 + outAngle==inAngle（两控制点同方向）→ 退化为直线？', () => {
    const scene = compileToScene(
      pathIR([
        { type: 'step', kind: 'move', to: [5, 5] },
        { type: 'step', kind: 'bend', to: [5, 5], outAngle: 90, inAngle: 90 },
      ]),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
    const cubic = firstCubic(scene.primitives);
    // outAngle==inAngle 时 c1=c2=端点+d·同方向 → from=to=c1=c2 共线 → 退化非环
    // 诊断：self-loop 但 out==in 画不出环（与 self-loop 设计初衷矛盾，但不应崩 / NaN）
    const span = Math.hypot(cubic.control1[0] - cubic.control2[0], cubic.control1[1] - cubic.control2[1]);
    // 仅记录 span（out==in 时 span≈0，环退化）；不强断言成环（这是退化输入）
    expect(Number.isFinite(span)).toBe(true);
  });

  it('self-loop 完全不给 out/in 也不给 bendDirection → 走 bendControlPoints chord=0 分支', () => {
    // bend 无 out/in → 走 bendControlPoints(prev, curr, 'left', 30)；from==to → chord=0 → 两控制点=from
    // 退化为点（自环画不出），但不应崩 / NaN
    const scene = compileToScene(
      pathIR([
        { type: 'step', kind: 'move', to: [5, 5] },
        { type: 'step', kind: 'bend', to: [5, 5] },
      ]),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
    const cubic = firstCubic(scene.primitives);
    // chord=0 退化：c1=c2=from → 自环画不出（退化为点）。诊断：bend 自环无 out/in 时静默退化为点
    const off = Math.hypot(cubic.control1[0] - 5, cubic.control1[1] - 5);
    expect(Number.isFinite(off)).toBe(true);
  });

  it('self-loop 同 node id（from==to 同节点中心）→ 成环 finite', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'bend', to: { id: 'A' }, outAngle: 60, inAngle: 120 },
          ],
        },
      ],
    });
    expect(expectAllFinite(scene).ok).toBe(true);
  });
});

// =====================================================================
// 攻击面 4：路径变换 scale 极值（schema 只要求 finite positive，允许 1e-300 / 1e300）
// =====================================================================
describe('ATTACK 4: path scale 极值（schema 允许任意 finite positive）', () => {
  it('scale=1e300 → applyTransformChain 投影后坐标 Infinity → transformedPoints/layout 非 finite', () => {
    const ir = linePath({ scale: 1e300 });
    const scene = compileToScene(ir);
    const fin = expectAllFinite(scene);
    // scale=1e300 绕 bbox center [5,0]：translate(5,0)∘scale(1e300)∘translate(-5,0)
    // 端点 [0,0]→((0-5)*1e300+5)= -5e300（finite）但 [10,0]→5e300（finite）。layout width=1e301 finite。
    // 真正 Infinity 风险在 1e300 × 5 = 5e300 仍 finite；提升到更极端见下一 case。
    expect(fin.ok).toBe(true);
    expect(jsonRoundTripLossless(scene)).toBe(true);
  });

  it('scale=Number.MAX_VALUE → (10-5)×MAX+5 溢出 Infinity 坐标 → 编译期抛', () => {
    const ir = linePath({ scale: Number.MAX_VALUE });
    expect(() => compileToScene(ir)).toThrow(/non-finite coordinate/i);
  });

  it('scale=1e-300（极小）→ 坐标趋 0；round 后是否塌成 0 致信息丢失', () => {
    const scene = compileToScene(linePath({ scale: 1e-300 }));
    expect(expectAllFinite(scene).ok).toBe(true);
    expect(jsonRoundTripLossless(scene)).toBe(true);
  });

  it('非等比 scale {x: 1e300, y: 1e308} → 任一轴溢出 Infinity', () => {
    const ir = linePath({ scale: { x: 1e300, y: Number.MAX_VALUE } });
    const scene = compileToScene(ir);
    const fin = expectAllFinite(scene);
    expect(fin.ok).toBe(true);
    expect(jsonRoundTripLossless(scene)).toBe(true);
  });
});

// =====================================================================
// 攻击面 5：单点 / 空 path bbox 退化 + transform
// =====================================================================
describe('ATTACK 5: 退化 bbox + path transform', () => {
  it('单点退化 path（move + line 到同坐标）rotate → bbox center=该点；finite', () => {
    const scene = compileToScene(
      pathIR(
        [
          { type: 'step', kind: 'move', to: [3, 3] },
          { type: 'step', kind: 'line', to: [3, 3] },
        ],
        { rotate: 90 },
      ),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('path 只有 1 step（PATH_TOO_SHORT）+ rotate → 整 path skip，rotate 不致崩', () => {
    let warned = false;
    const scene = compileToScene(
      pathIR([{ type: 'step', kind: 'move', to: [0, 0] }] as IRPath['children'], { rotate: 30 }),
      { onWarn: w => { if (w.code === 'PATH_TOO_SHORT') warned = true; } },
    );
    expect(warned).toBe(true);
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('全部 step 引用未定义 node（path 整体 skip 返回 null）+ rotate → 不崩，layout finite', () => {
    const scene = compileToScene(
      pathIR(
        [
          { type: 'step', kind: 'move', to: { id: 'GHOST' } },
          { type: 'step', kind: 'line', to: { id: 'GHOST2' } },
        ],
        { rotate: 45, scale: 2 },
      ),
      { onWarn: () => {} },
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });
});

// =====================================================================
// 攻击面 6：marks 在变换后 path 上 —— marker 坐标是否被 path transform 二次作用
// =====================================================================
describe('ATTACK 6: marks + path transform 交互（二次变换 / 定向污染）', () => {
  it('marks + rotate 同给：mark marker 坐标进 group 还是裸坐标（二次旋转风险）', () => {
    // 无 transform 基准
    const baseScene = compileToScene(
      linePath({ marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }] }),
    );
    // 加 rotate
    const rotScene = compileToScene(
      linePath({ rotate: 90, marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }] }),
    );
    expect(expectAllFinite(baseScene).ok).toBe(true);
    expect(expectAllFinite(rotScene).ok).toBe(true);
    // 诊断：rotate 时整 path（含 markPrims）包进 GroupPrim。mark marker 的 buildMarkMarkerGroup
    // 用未变换几何采样点 + tangent 算朝向，再被外层 GroupPrim 旋转一次 → 视觉正确（marker 跟 path 转）。
    // 但 mark 的 point 也被 push 进 points，再经 applyTransformChain 投影进 layout——这是 bbox 用途，OK。
    // 关键检查：rotScene 顶层是带 transform 的 group，markPrims 在其 children 内（随 path 一起转）。
    const topGroup = rotScene.primitives.find(
      (p): p is Extract<ScenePrimitive, { type: 'group' }> =>
        p.type === 'group' && !!p.transforms && p.transforms.length > 0,
    );
    expect(topGroup).toBeDefined();
  });
});

// =====================================================================
// 攻击面 7：marking pos 落在各段类型（arc / cubic / fold / quad）+ 零长段
// =====================================================================
describe('ATTACK 7: marks 落各段类型 + 零长段 tangent', () => {
  it('mark 落零长直线段（move+line 到同点）→ tangent normalize 回退 [1,0]，不 NaN', () => {
    const scene = compileToScene(
      pathIR(
        [
          { type: 'step', kind: 'move', to: [2, 2] },
          { type: 'step', kind: 'line', to: [2, 2] },
        ],
        { marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }] },
      ),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('mark 落 arc 段 pos=0 / pos=1（段边界采样）→ finite', () => {
    const scene = compileToScene(
      pathIR(
        [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 5 },
        ],
        {
          marks: [
            { pos: 0, mark: { kind: 'arrow', shape: 'stealth' } },
            { pos: 1, mark: { kind: 'arrow', shape: 'stealth' } },
          ],
        },
      ),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('mark 落 self-loop cubic 段（from==to bend）→ finite tangent', () => {
    const scene = compileToScene(
      pathIR(
        [
          { type: 'step', kind: 'move', to: [5, 5] },
          { type: 'step', kind: 'bend', to: [5, 5], outAngle: 60, inAngle: 120 },
        ],
        { marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }] },
      ),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('多 mark 同 pos=0.5 → 多 marker 共点，finite，不互相干扰', () => {
    const scene = compileToScene(
      linePath({
        marks: [
          { pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } },
          { pos: 0.5, mark: { kind: 'arrow', shape: 'normal' } },
        ],
      }),
    );
    expect(expectAllFinite(scene).ok).toBe(true);
  });
});

// =====================================================================
// 攻击面 8：mark 用未注册箭头名 → throw 是否清晰
// =====================================================================
describe('ATTACK 8: mark 未注册箭头名 / 错误信息清晰度', () => {
  it('mark.shape="ghostArrow"（未注册）→ throw，错误含 shape 名 + 可用名列表', () => {
    let err: Error | undefined;
    try {
      compileToScene(linePath({ marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'ghostArrow' } }] }));
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeDefined();
    // LLM 自修要求：消息含未知名 + available 列表
    expect(err?.message).toContain('ghostArrow');
    expect(err?.message.toLowerCase()).toContain('available');
  });

  it('mark.shape="->"（看似方向记号实为未注册箭头名）→ throw 含 "->"', () => {
    let err: Error | undefined;
    try {
      compileToScene(linePath({ marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: '->' } }] }));
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeDefined();
    expect(err?.message).toContain('->');
  });
});

// =====================================================================
// 攻击面 9：三合一 —— out/in bend + path rotate + marks
// =====================================================================
describe('ATTACK 9: out/in bend + rotate + marks 三合一 + arrow', () => {
  it('out/in self-loop + rotate=37 + scale=0.5 + marks + arrow="<->" 全开 → finite + 单层 group', () => {
    const scene = compileToScene(
      pathIR(
        [
          { type: 'step', kind: 'move', to: [3, 3] },
          { type: 'step', kind: 'bend', to: [3, 3], outAngle: 45, inAngle: 200, looseness: 1.7 },
        ],
        {
          rotate: 37,
          scale: 0.5,
          arrow: '<->',
          marks: [
            { pos: 0, mark: { kind: 'arrow', shape: 'stealth' } },
            { pos: 0.5, mark: { kind: 'arrow', shape: 'diamond' } },
            { pos: 1, mark: { kind: 'arrow', shape: 'open' } },
          ],
        },
      ),
    );
    const fin = expectAllFinite(scene);
    expect(fin.ok).toBe(true);
    expect(jsonRoundTripLossless(scene)).toBe(true);
  });
});

// =====================================================================
// 攻击面 10：path transform + 既有 scope transform 嵌套（双重变换顺序）
// =====================================================================
describe('ATTACK 10: path transform 嵌套 scope transform（双重变换）', () => {
  it('scope rotate + path rotate 嵌套 → path hoist 到顶层后丢 scope transform？（已知 hoist 限制）', () => {
    // scope 有 transform → 内部 path 走 hoist 到顶层 primitives（compile.ts resolvePendingPaths）。
    // path 自身又有 rotate → 包一层自己的 GroupPrim。问题：path hoist 到顶层后，scope 的 rotate
    // 是否还作用于它？（hoist 路径上 path 端点已是全局坐标，但 path 自己的 group 不含 scope transform）
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 30, cx: 0, cy: 0 }],
          children: [
            {
              type: 'path',
              rotate: 15,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        },
      ],
    });
    expect(expectAllFinite(scene).ok).toBe(true);
    // 仅诊断：path 是否被 hoist + 是否仍受 scope rotate（视觉正确性，可能是已知限制）
  });
});

// =====================================================================
// 攻击面 11：mark 视觉字段极值（length / scale 极大 → marker group scale 巨大）
// =====================================================================
describe('ATTACK 11: mark 视觉极值（length / scale 极大）', () => {
  it('mark.length=1e300 → markerWidth/baseSize 巨大 scale；finite', () => {
    const scene = compileToScene(
      linePath({ marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth', length: 1e300 } }] }),
    );
    const fin = expectAllFinite(scene);
    expect(fin.ok).toBe(true);
    expect(jsonRoundTripLossless(scene)).toBe(true);
  });

  it('mark.scale=1e308 + length=10 → 10×1e308 = Infinity markerWidth → 编译期抛', () => {
    const ir = linePath({
      marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth', scale: 1e308, length: 10 } }],
    });
    expect(() => compileToScene(ir)).toThrow(/resolved length\/width is non-finite/i);
  });
});

// =====================================================================
// 攻击面 12：rotate 边角值 0 / 360 / 负 / 720
// =====================================================================
describe('ATTACK 12: rotate 边角值', () => {
  it('rotate=0 → 仍包 group（degrees=0 是 no-op 但产 transform）；finite', () => {
    const scene = compileToScene(linePath({ rotate: 0 }));
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('rotate=720（两整圈）→ finite，与 0 视觉等价', () => {
    const scene = compileToScene(linePath({ rotate: 720 }));
    expect(expectAllFinite(scene).ok).toBe(true);
  });

  it('rotate=-1e7（巨大负角）→ finite', () => {
    const scene = compileToScene(linePath({ rotate: -1e7 }));
    expect(expectAllFinite(scene).ok).toBe(true);
  });
});
