/**
 * 自定义视框覆盖编译——对抗测试（破坏视角）
 * @description 构造让实现挂的对抗输入：手搓 IR 绕过 zod 直喂 compileToScene 的非 finite / 退化 viewBox、
 *   round 边界（极大 / 负 / 极小坐标 + 各种 precision）、override 语义彻底性、与 clip / paint 资源共存、
 *   JSON round-trip 保真。对抗测试表达**正确期望**：Scene.layout 必须 finite & 正尺寸、可 JSON 序列化、
 *   override 绝对。所有 IR 手搓 `{ version, type, children, viewBox }`，刻意构造 schema 不会拦的脏值。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { createRound } from '../../src/compile/precision';
import type { IR, IRChild } from '../../src';

/** 尺寸固定、与文字度量无关的稳定内容节点（circle + minimumSize） */
const circleNode = (id: string, position: [number, number], minimumSize = 40): IRChild => ({
  type: 'node',
  id,
  shape: 'circle',
  position,
  minimumSize,
  fill: '#2563eb',
});

/** 手搓一个带 viewBox 的 Scene IR（viewBox 直接塞，绕过 ViewBoxSchema 守门） */
const sceneWithViewBox = (
  children: ReadonlyArray<IRChild>,
  viewBox: { x: number; y: number; width: number; height: number },
): IR =>
  ({
    version: 1,
    type: 'scene',
    children: [...children],
    viewBox,
  });

/** 一个 layout 是否「干净」：四字段都 finite、宽高严格 > 0 */
const isCleanLayout = (l: { x: number; y: number; width: number; height: number }): boolean =>
  Number.isFinite(l.x) &&
  Number.isFinite(l.y) &&
  Number.isFinite(l.width) &&
  Number.isFinite(l.height) &&
  l.width > 0 &&
  l.height > 0;

// ──────────────────────────────────────────────────────────────────────────
// 攻击面 1：非 finite / 退化值绕过 schema 直喂 compile（每个字段逐一）
// 期望：编译期抛清晰错，非 finite / 退化绝不进 Scene.layout
// ──────────────────────────────────────────────────────────────────────────
describe('手搓非 finite / 退化 viewBox 经 compileToScene 必抛（逐字段）', () => {
  const cases: Array<{ name: string; vb: { x: number; y: number; width: number; height: number } }> = [
    { name: 'x = NaN', vb: { x: NaN, y: 0, width: 200, height: 200 } },
    { name: 'y = NaN', vb: { x: 0, y: NaN, width: 200, height: 200 } },
    { name: 'x = Infinity', vb: { x: Infinity, y: 0, width: 200, height: 200 } },
    { name: 'y = Infinity', vb: { x: 0, y: Infinity, width: 200, height: 200 } },
    { name: 'x = -Infinity', vb: { x: -Infinity, y: 0, width: 200, height: 200 } },
    { name: 'y = -Infinity', vb: { x: 0, y: -Infinity, width: 200, height: 200 } },
    { name: 'width = NaN', vb: { x: 0, y: 0, width: NaN, height: 200 } },
    { name: 'height = NaN', vb: { x: 0, y: 0, width: 200, height: NaN } },
    { name: 'width = Infinity', vb: { x: 0, y: 0, width: Infinity, height: 200 } },
    { name: 'height = Infinity', vb: { x: 0, y: 0, width: 200, height: Infinity } },
    { name: 'width = -Infinity', vb: { x: 0, y: 0, width: -Infinity, height: 200 } },
    { name: 'height = -Infinity', vb: { x: 0, y: 0, width: 200, height: -Infinity } },
    { name: 'width = 0', vb: { x: 0, y: 0, width: 0, height: 200 } },
    { name: 'height = 0', vb: { x: 0, y: 0, width: 200, height: 0 } },
    { name: 'width 为负', vb: { x: 0, y: 0, width: -200, height: 200 } },
    { name: 'height 为负', vb: { x: 0, y: 0, width: 200, height: -200 } },
    { name: 'width = -0', vb: { x: 0, y: 0, width: -0, height: 200 } },
  ];
  for (const { name, vb } of cases) {
    it(`${name} → throw（脏值不进 Scene）`, () => {
      expect(() => compileToScene(sceneWithViewBox([circleNode('o', [0, 0])], vb))).toThrow();
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 攻击面 3：round 边界——极大 / 负 / 极小 precision 不得把合法 viewBox 弄脏
// 守卫只查 raw vb，round 在守卫之后；round 产出的脏值是真实关口的盲区
// ──────────────────────────────────────────────────────────────────────────
describe('round 不得把合法 viewBox 弄成非 finite / 退化（守卫盲区）', () => {
  it('precision 极大（400）：round factor=10**400=Infinity → 不得让 layout 出现 NaN', () => {
    const ir = sceneWithViewBox([circleNode('o', [0, 0])], { x: -100, y: -100, width: 200, height: 200 });
    // 合法 viewBox + 极大 precision。正确期望：要么抛，要么 layout 仍干净；绝不能 NaN 泄漏。
    let layout: { x: number; y: number; width: number; height: number } | undefined;
    let threw = false;
    try {
      layout = compileToScene(ir, { precision: 400 }).layout;
    } catch {
      threw = true;
    }
    if (!threw) {
      expect(isCleanLayout(layout!)).toBe(true);
    }
  });

  it('precision 大到溢出（350）：合法 200 宽不得变 NaN/Infinity', () => {
    const ir = sceneWithViewBox([circleNode('o', [0, 0])], { x: -100, y: -100, width: 200, height: 200 });
    let layout: { x: number; y: number; width: number; height: number } | undefined;
    let threw = false;
    try {
      layout = compileToScene(ir, { precision: 350 }).layout;
    } catch {
      threw = true;
    }
    if (!threw) {
      expect(isCleanLayout(layout!)).toBe(true);
    }
  });

  it('precision 为负（-3）：合法 200 宽不得 round 成 0', () => {
    const ir = sceneWithViewBox([circleNode('o', [0, 0])], { x: -100, y: -100, width: 200, height: 200 });
    let layout: { x: number; y: number; width: number; height: number } | undefined;
    let threw = false;
    try {
      layout = compileToScene(ir, { precision: -3 }).layout;
    } catch {
      threw = true;
    }
    if (!threw) {
      // 200 宽 + precision -3 → Math.round(200*0.001)/0.001 = 0；退化宽不得进 Scene
      expect(layout!.width).toBeGreaterThan(0);
      expect(layout!.height).toBeGreaterThan(0);
    }
  });

  it('极小正宽高（1e-10）：round 到 0 是退化框，不得进 Scene', () => {
    // schema 接受任意正数（含 1e-10），compile round 后变 0；正确期望：要么抛，要么宽高仍 > 0
    const ir = sceneWithViewBox([circleNode('o', [0, 0])], { x: 0, y: 0, width: 1e-10, height: 1e-10 });
    let layout: { x: number; y: number; width: number; height: number } | undefined;
    let threw = false;
    try {
      layout = compileToScene(ir).layout; // 默认 precision 2 → 1e-10 round 成 0
    } catch {
      threw = true;
    }
    if (!threw) {
      expect(layout!.width).toBeGreaterThan(0);
      expect(layout!.height).toBeGreaterThan(0);
    }
  });

  it('极大坐标（1e308）+ precision 2：round 乘 100 溢出 Infinity 不得泄漏', () => {
    const ir = sceneWithViewBox([circleNode('o', [0, 0])], { x: 0, y: 0, width: 1e308, height: 1e308 });
    let layout: { x: number; y: number; width: number; height: number } | undefined;
    let threw = false;
    try {
      layout = compileToScene(ir).layout; // 1e308 * 100 = Infinity → /100 = Infinity
    } catch {
      threw = true;
    }
    if (!threw) {
      expect(Number.isFinite(layout!.width)).toBe(true);
      expect(Number.isFinite(layout!.height)).toBe(true);
    }
  });

  it('需进位的小数 + precision 0：四字段被正确取整', () => {
    const ir = sceneWithViewBox([circleNode('o', [0, 0])], { x: -12.7, y: 3.4, width: 100.6, height: 50.5 });
    const layout = compileToScene(ir, { precision: 0 }).layout;
    const r = createRound(0);
    expect(layout).toEqual({ x: r(-12.7), y: r(3.4), width: r(100.6), height: r(50.5) });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 攻击面 5：JSON round-trip——Scene.layout 必须可序列化等价
// ──────────────────────────────────────────────────────────────────────────
describe('Scene round-trip：layout JSON 序列化等价', () => {
  it('合法 viewBox：JSON.parse(JSON.stringify(scene)) 的 layout 与原等价', () => {
    const scene = compileToScene(
      sceneWithViewBox([circleNode('o', [0, 0])], { x: -100, y: -100, width: 200, height: 200 }),
    );
    const roundTripped = JSON.parse(JSON.stringify(scene)) as typeof scene;
    expect(roundTripped.layout).toEqual(scene.layout);
  });

  it('小数 viewBox：序列化后 layout 仍等价（无 NaN/Infinity 被 JSON 写成 null）', () => {
    const scene = compileToScene(
      sceneWithViewBox([circleNode('o', [0, 0])], { x: -12.555, y: 3.214, width: 100.128, height: 50.501 }),
    );
    const json = JSON.stringify(scene);
    // JSON.stringify 把 NaN/Infinity 写成 null——若 layout 含脏值这里会出现 "null"
    expect(json).not.toContain('null');
    const roundTripped = JSON.parse(json) as typeof scene;
    expect(roundTripped.layout).toEqual(scene.layout);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 攻击面 2：override 彻底性——内容含极端 / NaN 坐标时 layout 仍 = viewBox
// （viewBox 应彻底取代 computeLayout，内容点压根不该参与）
// ──────────────────────────────────────────────────────────────────────────
describe('override 绝对：内容再脏 layout 仍只用 viewBox', () => {
  it('内容空 + viewBox → layout = viewBox（不走兜底 100×100）', () => {
    const viewBox = { x: -30, y: -30, width: 60, height: 60 };
    const result = compileToScene(sceneWithViewBox([], viewBox));
    expect(result.layout).toEqual(viewBox);
  });

  it('内容远溢出（位置 1e6）+ viewBox → layout 不被撑大', () => {
    const viewBox = { x: -100, y: -100, width: 200, height: 200 };
    const result = compileToScene(sceneWithViewBox([circleNode('far', [1_000_000, 1_000_000], 80)], viewBox));
    expect(result.layout).toEqual(viewBox);
  });

  it('viewBox 与 padding=999 共存 → layout 用 viewBox，padding 不叠加', () => {
    const viewBox = { x: -100, y: -100, width: 200, height: 200 };
    const result = compileToScene(sceneWithViewBox([circleNode('o', [0, 0])], viewBox), { padding: 999 });
    expect(result.layout).toEqual(viewBox);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 攻击面 6：与 clip / paint 资源共存——layout 与 resources 各自独立正确
// ──────────────────────────────────────────────────────────────────────────
describe('viewBox 与 clip / paint 资源正交共存', () => {
  it('带 viewBox + scope.clip → layout = viewBox 且 clip 资源照常生成', () => {
    const viewBox = { x: -50, y: -50, width: 100, height: 100 };
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          clip: { kind: 'rect', x: -20, y: -20, width: 40, height: 40 },
          children: [circleNode('o', [0, 0])],
        },
      ],
      viewBox,
    };
    const result = compileToScene(ir);
    expect(result.layout).toEqual(viewBox);
    // clip 资源独立于 viewBox 生成
    const clipResources = (result.resources ?? []).filter(r => r.kind === 'clip');
    expect(clipResources.length).toBeGreaterThan(0);
  });

  it('带 viewBox + 渐变 paint fill → layout = viewBox 且 paint 资源照常生成', () => {
    const viewBox = { x: -50, y: -50, width: 100, height: 100 };
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'g',
          shape: 'rectangle',
          position: [0, 0],
          minimumSize: 40,
          fill: {
            kind: 'linearGradient',
            stops: [
              { offset: 0, color: '#2563eb' },
              { offset: 1, color: '#f59e0b' },
            ],
          },
        },
      ],
      viewBox,
    };
    const result = compileToScene(ir);
    expect(result.layout).toEqual(viewBox);
    const paintResources = (result.resources ?? []).filter(r => r.kind === 'paint');
    expect(paintResources.length).toBeGreaterThan(0);
  });
});
