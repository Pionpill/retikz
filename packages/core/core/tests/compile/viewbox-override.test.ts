/**
 * 自定义视框覆盖编译测试
 * @description IR 根带 viewBox 时 Scene.layout 严格等于它（按 precision round）、忽略 padding、不被内容撑大；
 *   无 viewBox 时回退既有 computeLayout（AABB + padding，回归断言）；手搓非 finite / 退化 viewBox 经
 *   compileToScene 抛清晰错（不泄漏 Infinity / 0 宽进 Scene）。所有 IR 手搓 `{version,type,children,viewBox}`。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { computeLayout } from '../../src/compile/layout';
import { createRound } from '../../src/compile/precision';
import type { IR, IRChild } from '../../src';

/** 一个尺寸固定、与文字度量无关的稳定内容节点（circle + minimumSize），落在给定中心 */
const circleNode = (id: string, position: [number, number], minimumSize = 40): IRChild => ({
  type: 'node',
  id,
  shape: 'circle',
  position,
  minimumSize,
  fill: '#2563eb',
});

/** 手搓一个带 / 不带 viewBox 的 Scene IR */
const scene = (children: ReadonlyArray<IRChild>, viewBox?: IR['viewBox']): IR => ({
  version: 1,
  type: 'scene',
  children: [...children],
  ...(viewBox ? { viewBox } : {}),
});

describe('IR 根带 viewBox 时直接用作 Scene.layout', () => {
  it('Scene.layout 严格等于显式 viewBox', () => {
    const ir = scene([circleNode('o', [0, 0])], {
      x: -100,
      y: -100,
      width: 200,
      height: 200,
    });
    const result = compileToScene(ir);
    expect(result.layout).toEqual({ x: -100, y: -100, width: 200, height: 200 });
  });

  it('视框忽略 padding：不同 padding 下 layout 都等于 viewBox', () => {
    const viewBox = { x: -100, y: -100, width: 200, height: 200 };
    const ir = scene([circleNode('o', [0, 0])], viewBox);
    const withSmallPadding = compileToScene(ir, { padding: 10 });
    const withLargePadding = compileToScene(ir, { padding: 50 });
    expect(withSmallPadding.layout).toEqual(viewBox);
    expect(withLargePadding.layout).toEqual(viewBox);
  });

  it('内容溢出视框时 layout 仍只用 viewBox（不被内容撑大）', () => {
    // 内容画在 [500,500] 远超出 200×200 的视框范围
    const viewBox = { x: -100, y: -100, width: 200, height: 200 };
    const ir = scene([circleNode('far', [500, 500], 80)], viewBox);
    const result = compileToScene(ir);
    expect(result.layout).toEqual(viewBox);
  });
});

describe('IR 根含小数 viewBox 按精度 round', () => {
  it('默认精度（2 位）下小数视框被 round', () => {
    const ir = scene([circleNode('o', [0, 0])], {
      x: -12.555,
      y: 3.214,
      width: 100.128,
      height: 50.501,
    });
    const result = compileToScene(ir);
    const r = createRound(2);
    expect(result.layout).toEqual({
      x: r(-12.555),
      y: r(3.214),
      width: r(100.128),
      height: r(50.501),
    });
  });

  it('precision = 0 时视框四字段取整', () => {
    const ir = scene([circleNode('o', [0, 0])], {
      x: -12.7,
      y: 3.4,
      width: 100.6,
      height: 50.5,
    });
    const result = compileToScene(ir, { precision: 0 });
    const r = createRound(0);
    expect(result.layout).toEqual({
      x: r(-12.7),
      y: r(3.4),
      width: r(100.6),
      height: r(50.5),
    });
  });
});

describe('IR 根无 viewBox 时回退自动算 layout', () => {
  it('空场景无 viewBox → 回退 computeLayout 兜底框', () => {
    const ir = scene([]);
    const result = compileToScene(ir);
    expect(result.layout).toEqual(computeLayout([], 10, createRound(2)));
  });

  it('带内容无 viewBox → padding 影响 layout（回退行为，与既有一致）', () => {
    const content = [circleNode('o', [0, 0])];
    const withSmallPadding = compileToScene(scene(content), { padding: 10 });
    const withLargePadding = compileToScene(scene(content), { padding: 50 });
    // 回退到 computeLayout：padding 越大 layout 越大（证明未走 override 分支）
    expect(withLargePadding.layout.width).toBeGreaterThan(withSmallPadding.layout.width);
    expect(withLargePadding.layout.height).toBeGreaterThan(withSmallPadding.layout.height);
  });

  it('同一 IR：有 viewBox 与无 viewBox 的 layout 不同（override 真生效）', () => {
    const content = [circleNode('o', [0, 0])];
    const viewBox = { x: -100, y: -100, width: 200, height: 200 };
    const withViewBox = compileToScene(scene(content, viewBox));
    const withoutViewBox = compileToScene(scene(content));
    expect(withViewBox.layout).toEqual(viewBox);
    expect(withoutViewBox.layout).not.toEqual(viewBox);
  });
});

describe('手搓非法 viewBox 经 compileToScene 抛清晰错', () => {
  it('width = Infinity → throw（不泄漏 Infinity 进 Scene）', () => {
    const ir = scene([circleNode('o', [0, 0])], {
      x: 0,
      y: 0,
      width: Infinity,
      height: 200,
    });
    expect(() => compileToScene(ir)).toThrow();
  });

  it('height = NaN → throw', () => {
    const ir = scene([circleNode('o', [0, 0])], {
      x: 0,
      y: 0,
      width: 200,
      height: NaN,
    });
    expect(() => compileToScene(ir)).toThrow();
  });

  it('width = 0 → throw（退化视框不进 Scene）', () => {
    const ir = scene([circleNode('o', [0, 0])], {
      x: 0,
      y: 0,
      width: 0,
      height: 200,
    });
    expect(() => compileToScene(ir)).toThrow();
  });
});
