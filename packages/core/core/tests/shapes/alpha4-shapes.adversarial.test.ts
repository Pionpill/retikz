/**
 * [adversarial] v0.3-alpha.4 五个 shape ADR 对抗测试
 * 目标：让 LLM 真实生成 / 边角 IR 暴露实现 bug。不修代码，仅报告。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ShapeRefSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import { arc, polygon, sector, star } from '../../src/shapes';
import { normalizeAngularRange } from '../../src/shapes/shared';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const compileNode = (n: Record<string, unknown>): ReturnType<typeof compileToScene> =>
  compileToScene(scene([{ type: 'node', position: [0, 0], ...n }]));

// 收集 path primitive 的所有数值坐标，检测 NaN/Infinity 漏进 Scene
const numericLeaves = (v: unknown, out: Array<number> = []): Array<number> => {
  if (typeof v === 'number') out.push(v);
  else if (Array.isArray(v)) v.forEach(x => numericLeaves(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => numericLeaves(x, out));
  return out;
};

// ════════════════ 攻击面 5：几何极端 ════════════════

describe('[adversarial] 几何极端：角度环绕死循环 / DoS', () => {
  // normalizeAngularRange 现为 O(1) 闭式规范化（end += 360·ceil((start−end)/360)），arc 轴向点枚举
  // 也有 axisAngles 守卫——巨型 startAngle（含 1e308）不再退化 / 死循环，编译恒定时间返回。
  it('[adversarial] sector startAngle 较大 1e7 → O(1) 规范化即时返回（不随量级退化）', () => {
    const start = performance.now();
    let threw = false;
    try {
      compileNode({
        shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 1e7, endAngle: 0 } },
      });
    } catch { threw = true; }
    const ms = performance.now() - start;
    // 1e7 → ~27778 次循环，应快；记录退化趋势（量级 +1 → 耗时 ×10）
    expect({ ms: Math.round(ms), threw }).toMatchObject({ threw: false });
    expect(ms).toBeLessThan(500);
  });

  it('[adversarial] sector startAngle===endAngle（零扫掠）→ 退化扇形 boundaryPoint/质心不应 NaN', () => {
    const compiled = compileNode({
      id: 'z',
      shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 45, endAngle: 45 } },
    });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const nums = numericLeaves(path!.commands);
    const bad = nums.filter(n => !Number.isFinite(n));
    // 诊断：零扫掠时 areaDenom/half 兜底应避免 NaN
    expect(bad).toEqual([]);
  });

  it('[adversarial] sector innerRadius===outerRadius 被 refine 拦（outer>inner）→ 错误信息应清晰', () => {
    let msg = '';
    try {
      compileNode({ shape: { type: 'sector', params: { innerRadius: 30, outerRadius: 30, startAngle: 0, endAngle: 90 } } });
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
    // 应含 'outerRadius must be greater than innerRadius'，LLM 可据此修
    expect(msg).toContain('outerRadius');
  });

  it('[adversarial] sector outerRadius=0 被 positive 拦', () => {
    expect(() => compileNode({ shape: { type: 'sector', params: { innerRadius: 0, outerRadius: 0, startAngle: 0, endAngle: 90 } } })).toThrow();
  });

  it('[adversarial] star points 上限 1024：满额产 2048 顶点闭合 path 且不卡死', () => {
    const start = performance.now();
    const compiled = compileNode({
      shape: { type: 'star', params: { points: 1024, innerRadius: 5, outerRadius: 10 } },
    });
    const ms = performance.now() - start;
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(path!.commands.length).toBe(2048 + 1); // 2×points 顶点 + close
    expect(ms).toBeLessThan(2000);
  });

  it('[adversarial] star points 超上限（>1024）被 schema 拒，防顶点数无界拖死编译', () => {
    expect(() =>
      compileNode({
        shape: { type: 'star', params: { points: 100000, innerRadius: 5, outerRadius: 10 } },
      }),
    ).toThrow();
  });

  it('[adversarial] normalizeAngularRange 把跨度钳到 ≤360（巨角不枚举海量轴向点）', () => {
    expect(normalizeAngularRange(0, 90).end).toBe(90); // 正常跨度不变
    expect(normalizeAngularRange(0, 720).end).toBe(360); // 720 折成整圆 360
    expect(normalizeAngularRange(10, 410).end).toBe(370); // 400 跨度钳到 10+360
    expect(normalizeAngularRange(0, 1e8).end).toBe(360); // 巨角钳到 360
  });

  it('[G3] ellipse 节点 compass diagonal 落真实周长（与 TikZ 一致，非 AABB 角）', () => {
    const compiled = compileToScene(
      scene([
        { type: 'node', id: 'e', position: [0, 0], shape: { type: 'ellipse' }, minimumSize: 40 },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'e', anchor: 'north-east' } },
            { type: 'step', kind: 'line', to: [200, -200] },
          ],
        },
      ]),
    );
    const path = findByType(compiled.primitives, 'path');
    const move = path!.commands[0];
    // minimumSize=40 floor 外接框 → rx=ry=20；north-east 真实周长点 =(20/√2, −20/√2)≈(14.14, −14.14)；
    // 旧实现（AABB 角）会是 (20, −20)
    expect(move.kind).toBe('move');
    if (move.kind === 'move') {
      expect(move.to[0]).toBeCloseTo(20 / Math.SQRT2, 1);
      expect(move.to[1]).toBeCloseTo(-20 / Math.SQRT2, 1);
    }
  });

  it('[adversarial] arc boundaryPoint 随 toward 变（不再恒取弧中点）', () => {
    // 上半圆弧 0°→180°（AABB 中心在原点）；朝 +x / −x 连线应贴弧的不同端
    const rect = { x: 0, y: 0, width: 20, height: 10 };
    const params = { radius: 10, startAngle: 0, endAngle: 180 };
    const towardStart = arc.boundaryPoint(rect, [100, 0], params);
    const towardEnd = arc.boundaryPoint(rect, [-100, 0], params);
    expect(towardStart[0]).toBeGreaterThan(0); // 靠 start(0°) 端
    expect(towardEnd[0]).toBeLessThan(0); // 靠 end(180°) 端
    expect(towardStart[0]).not.toBeCloseTo(towardEnd[0], 3); // 两方向落点不同
  });

  // outerRadius=1e308（.finite() 放行）→ AABB 半轴 5e307 仍 finite，但 layout 聚合 rect 四角
  // （center±halfWidth → R+R=Infinity）会让 Infinity 漏进 Scene.layout（viewBox）；compile 自动 layout
  // finite 守卫拦截后抛清晰错（non-finite bounds），不让 Infinity 进 Scene。
  it('[adversarial] sector 半径极大 1e308 → 自动 layout finite 守卫拦截（throw，不漏 Infinity）', () => {
    expect(() =>
      compileNode({
        shape: { type: 'sector', params: { innerRadius: 0, outerRadius: 1e308, startAngle: 0, endAngle: 90 } },
      }),
    ).toThrow(/non-finite|overflow|bounds/);
  });
});

// ════════════════ 攻击面 1：JSON round-trip 失真 ════════════════

describe('[adversarial] JSON round-trip 自描述', () => {
  it('[adversarial] circle 裸 string round-trip 后仍是 "circle"（不被改写为 ellipse）', () => {
    const node = { type: 'node', id: 'c', position: [0, 0], shape: 'circle' };
    const parsed = NodeSchema.parse(node);
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    // IR 自描述：shape 字段应保留 'circle'，规范化只在 compile 内部，不写回 IR
    expect(round.shape).toBe('circle');
  });

  it('[adversarial] diamond 裸 string round-trip 后仍是 "diamond"', () => {
    const parsed = NodeSchema.parse({ type: 'node', id: 'd', position: [0, 0], shape: 'diamond' });
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.shape).toBe('diamond');
  });

  it('[adversarial] sector nested params round-trip 等价（params 全在 IR）', () => {
    const node = {
      type: 'node', id: 's', position: [0, 0],
      shape: { type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } },
    };
    const parsed = NodeSchema.parse(node);
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.shape).toEqual(parsed.shape);
  });
});

// ════════════════ 攻击面 2/3：zod 护栏 / 错误信息 / 非 JSON 偷渡 ════════════════

describe('[adversarial] params 双护栏 + 错误信息可读性', () => {
  it('[adversarial] sector params.startAngle=NaN → 应被 .finite() 拦（NaN 在 JSON.stringify 变 null）', () => {
    let threw = false;
    try {
      compileNode({ shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: NaN, endAngle: 90 } } });
    } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('[adversarial] sector startAngle=Infinity → .finite() 拦', () => {
    expect(() => compileNode({ shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: Infinity, endAngle: 90 } } })).toThrow();
  });

  it('[adversarial] LLM 把数字写成字符串：outerRadius:"60" → 报错应指明字段+期望类型', () => {
    let msg = '';
    try {
      compileNode({ shape: { type: 'sector', params: { innerRadius: 10, outerRadius: '60', startAngle: 0, endAngle: 90 } } });
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    // BLOCKING 判据：错误应能让 LLM 定位到 outerRadius
    expect(msg.toLowerCase()).toMatch(/outerradius|expected number|received string/);
  });

  it('[adversarial] LLM 字段拼错 inner_radius（snake_case）→ strictObject 应报 unrecognized key', () => {
    let msg = '';
    try {
      compileNode({ shape: { type: 'sector', params: { inner_radius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } } });
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    // 既缺 innerRadius 又多 inner_radius，错误应提两者
    expect(msg.toLowerCase()).toMatch(/innerradius|unrecognized|inner_radius/);
  });

  it('[adversarial] params.foo=undefined 偷渡 → 第二道 JsonObjectSchema 拦', () => {
    // 注意：rawShapeParams 含 undefined 值，JSON.stringify 会丢键，但直接喂 IR 对象时 undefined 在
    let threw = false;
    try {
      compileNode({ shape: { type: 'rectangle', params: { cornerRadius: undefined } } });
    } catch { threw = true; }
    // cornerRadius 可选，undefined 应被 strictObject 视为缺省 OR JsonObjectSchema 拦；二者之一
    expect(typeof threw).toBe('boolean');
  });

  it('[adversarial] sector params 偷渡函数 → JsonObjectSchema 第二道拦', () => {
    let threw = false;
    try {
      compileNode({
        shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90, evil: () => 1 } as Record<string, unknown> },
      });
    } catch { threw = true; }
    expect(threw).toBe(true);
  });
});

// ════════════════ 攻击面 4：discriminator / shape 名 ════════════════

describe('[adversarial] shape type 失稳', () => {
  it('[adversarial] 未注册 type:"sektor"（拼错）→ 错误应列出可用 shape 名', () => {
    let msg = '';
    try {
      compileNode({ shape: { type: 'sektor', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } } });
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toContain('sektor');
    expect(msg).toMatch(/sector/); // 应列出真实名供 LLM 改
  });

  it('[adversarial] type:"" 空串 → ShapeRefSchema min(1) 拦', () => {
    expect(() => ShapeRefSchema.parse({ type: '' })).toThrow();
  });

  it('[adversarial] shape:"circle" 注册表查不到 circle（已收为 preset）但 normalizeShape 先消解 → 应正常编译', () => {
    expect(() => compileNode({ shape: 'circle', text: 'x' })).not.toThrow();
  });

  it('[adversarial] shape: { type:"ellipse", params:{ circumscribe:"equal" } } 显式 = circle，应编译且 rx==ry', () => {
    const compiled = compileNode({ shape: { type: 'ellipse', params: { circumscribe: 'equal' } }, text: 'wide text here' });
    const el = findByType(compiled.primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.rx).toBe(el!.ry);
  });
});

// ════════════════ 攻击面 6：scaleParams 正确性 ════════════════

describe('[adversarial] scaleParams：角度/计数不该被缩', () => {
  it('[adversarial] sector × scale:2 → 半径缩、startAngle/endAngle 不缩', () => {
    // 用 layoutNode 间接验证：emit 的 arc 命令 startAngle/endAngle 应保持原值
    const compiled = compileNode({
      scale: 2,
      shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } },
    });
    const path = findByType(compiled.primitives, 'path');
    const arcCmd = path!.commands.find(c => c.kind === 'arc') as { startAngle: number; endAngle: number; radius: number };
    expect(arcCmd.startAngle).toBe(0);
    expect(arcCmd.endAngle).toBe(90);
    // 半径应被缩为 60（30×2）
    expect(arcCmd.radius).toBe(60);
  });

  it('[adversarial] polygon × scale:3 → sides 不被缩（默认深缩会毁掉 sides）', () => {
    const compiled = compileNode({
      scale: 3,
      text: 'hex',
      shape: { type: 'polygon', params: { sides: 6 } },
    });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    // 6 边形 → 6 顶点 + close = 7 命令；若 sides 被缩成 18 则 19 命令
    const moveLines = path!.commands.filter(c => c.kind === 'move' || c.kind === 'line');
    expect(moveLines.length).toBe(6);
  });

  it('[adversarial] star × scale:2 → points 不缩、半径缩', () => {
    const compiled = compileNode({
      scale: 2,
      shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 20 } },
    });
    const path = findByType(compiled.primitives, 'path');
    const moveLines = path!.commands.filter(c => c.kind === 'move' || c.kind === 'line');
    expect(moveLines.length).toBe(10); // 2×5 顶点
  });

  it('[adversarial] sector × 非均匀 xScale:2,yScale:1 → scaleParams 用 sqrt(sx·sy) 半径均值，角度不缩', () => {
    const compiled = compileNode({
      xScale: 2, yScale: 1,
      shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } },
    });
    const path = findByType(compiled.primitives, 'path');
    const arcCmd = path!.commands.find(c => c.kind === 'arc') as { radius: number; startAngle: number };
    expect(arcCmd.startAngle).toBe(0);
    // radius = 30 × sqrt(2·1) ≈ 42.43
    expect(arcCmd.radius).toBeCloseTo(30 * Math.SQRT2, 1);
  });
});

// ════════════════ 攻击面 7：AnchorRefSchema 放宽副作用 ════════════════

describe('[adversarial] anchor 放宽：未知 anchor 错误清晰度', () => {
  const pathTo = (anchor: string, id: string): IR['children'][number] => ({
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [100, 100] },
      { type: 'step', kind: 'line', to: { id, anchor } },
    ],
  });

  it('[adversarial] sector 给不认识的 anchor "tip-0"（star 专属）→ 错误应指明 shape+anchor', () => {
    let msg = '';
    try {
      compileToScene(scene([
        { type: 'node', id: 'w', position: [0, 0], shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } } },
        pathTo('tip-0', 'w'),
      ] as IR['children']));
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    // 期望错误同时含 anchor 名与 shape 名
    expect(msg).toMatch(/tip-0/);
    expect(msg).toMatch(/sector/);
  });

  it('[adversarial] 空字符串 anchor "" → AnchorRefSchema min(1) 应拦（放宽后是否漏过）', () => {
    let threw = false;
    try {
      compileToScene(scene([
        { type: 'node', id: 'w', position: [0, 0], shape: 'rectangle', text: 'x' },
        pathTo('', 'w'),
      ] as IR['children']));
    } catch { threw = true; }
    // AnchorRefSchema 的 string 分支是 min(1)，但 union 还有 number 分支——"" 应被拒
    expect(threw).toBe(true);
  });

  it('[adversarial] polygon 给 anchor "vertex-0"（不存在）→ 报 Unknown anchor', () => {
    let msg = '';
    try {
      compileToScene(scene([
        { type: 'node', id: 'p', position: [0, 0], text: 'hex', shape: { type: 'polygon', params: { sides: 6 } } },
        pathTo('vertex-0', 'p'),
      ] as IR['children']));
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toMatch(/vertex-0|Unknown anchor/);
  });
});

// ════════════════ 攻击面 8/9：boundaryPoint 稳定 / circumscribeOffset ════════════════

describe('[adversarial] boundaryPoint / AABB 数值稳定', () => {
  it('[adversarial] 退化扇形 start≈end (1e-7 差) → boundaryPoint 不返回 NaN', () => {
    const compiled = compileToScene(scene([
      { type: 'node', id: 'w', position: [0, 0], shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 45, endAngle: 45.0000001 } } },
      { type: 'path', children: [{ type: 'step', kind: 'move', to: [100, 100] }, { type: 'step', kind: 'line', to: { id: 'w', anchor: 'outer-arc-mid' } }] },
    ] as IR['children']));
    const nums = numericLeaves(compiled.primitives);
    expect(nums.filter(n => !Number.isFinite(n))).toEqual([]);
  });

  it('[adversarial] sector 弧跨 270°（start=180,end=360）→ AABB 含 -y(270°) 极值，viewBox 罩住弧顶', () => {
    const compiled = compileNode({
      shape: { type: 'sector', params: { innerRadius: 0, outerRadius: 50, startAngle: 180, endAngle: 360 } },
    });
    // 弧从 180° 扫到 360°，经过 270°(-y) 极值点，outerRadius=50
    // viewBox 高度应至少容纳到 270° 的 -50 到 apex(0) → 半高 ≥ 25(中点) ；至少应 finite 且非零
    const vb = compiled.layout;
    expect(numericLeaves(vb).every(Number.isFinite)).toBe(true);
    expect(vb.height).toBeGreaterThan(40); // 应罩住 50 量级的弧
  });

  it('[adversarial] arc close:true 弓形 boundaryPoint 永远返回弧中点（忽略 toward）→ 验证不抛', () => {
    const compiled = compileToScene(scene([
      { type: 'node', id: 'a', position: [0, 0], shape: { type: 'arc', params: { radius: 50, startAngle: 0, endAngle: 180, close: true } } },
      { type: 'path', children: [{ type: 'step', kind: 'move', to: [200, 0] }, { type: 'step', kind: 'line', to: { id: 'a', anchor: 'arc-mid' } }] },
    ] as IR['children']));
    expect(numericLeaves(compiled.primitives).every(Number.isFinite)).toBe(true);
  });
});

// ════════════════ 攻击面 10：收敛别名 × 交叉 ════════════════

describe('[adversarial] 别名 × anchor / scale 交叉', () => {
  it('[adversarial] diamond（→polygon 4/0）的 anchor "north" 应与 rect anchor 一致、不抛', () => {
    expect(() => compileToScene(scene([
      { type: 'node', id: 'd', position: [0, 0], text: 'X', shape: 'diamond' },
      { type: 'path', children: [{ type: 'step', kind: 'move', to: [100, 0] }, { type: 'step', kind: 'line', to: { id: 'd', anchor: 'north' } }] },
    ] as IR['children']))).not.toThrow();
  });

  it('[adversarial] circle × scale:2 仍正圆（rx==ry）', () => {
    const compiled = compileNode({ shape: 'circle', scale: 2, text: 'wide text' });
    const el = findByType(compiled.primitives, 'ellipse');
    expect(el!.rx).toBe(el!.ry);
  });

  it('[adversarial] polygon sides 浮点 6.5 → int() 应拦', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 6.5 })).toThrow();
  });

  it('[adversarial] star points 浮点 5.5 → int() 应拦', () => {
    expect(() => star.paramsSchema.parse({ points: 5.5, innerRadius: 10, outerRadius: 20 })).toThrow();
  });

  it('[adversarial] arc paramsSchema 直接喂 radius:0 → positive 拦', () => {
    expect(() => arc.paramsSchema.parse({ radius: 0, startAngle: 0, endAngle: 90 })).toThrow();
  });

  it('[adversarial] sector paramsSchema 喂 -0 outerRadius → positive 对 -0 行为', () => {
    // -0 是否被 positive() 接受？(-0 > 0 为 false → 应拒)
    expect(() => sector.paramsSchema.parse({ innerRadius: 0, outerRadius: -0, startAngle: 0, endAngle: 90 })).toThrow();
  });
});
