/**
 * outerSep = TikZ outer sep（ADR-07）
 * @description outerSep（margin）是连接面外的一层均匀偏移：作用于所有 border 类 anchor
 *   （compass / 数字角度 / 自动连线落点）并计入布局占位 / viewBox；center / 形状专属 anchor /
 *   edgePoint / label 附着点恒走视觉 shape、不外扩。缺省 0 → 零 margin 行为同改前。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { resolveAnchor, resolveEdgePoint } from '../../src/compile/anchor-cache';
import type { NodeLayout } from '../../src/compile/node';
import { BUILTIN_SHAPES } from '../../src/shapes';
import { NodeSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { ScenePrimitive, TextPrim } from '../../src/primitive';
import { line, move } from '../helpers/path-command-factory';

/** 最简 rectangle NodeLayout（rect 40×30、半轴 20×15、中心原点），margin 可调 */
const mkLayout = (margin: number, rotate = 0): NodeLayout => ({
  shapeName: 'rectangle',
  shapeDef: BUILTIN_SHAPES.rectangle,
  rect: { x: 0, y: 0, width: 40, height: 30, rotate },
  rotateDeg: (rotate * 180) / Math.PI,
  margin,
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
  shapes: BUILTIN_SHAPES,
});

const hypot = (p: readonly [number, number]): number => Math.hypot(p[0], p[1]);

// ── Happy path ──────────────────────────────────────────────────────────────

describe('outerSep：border 类 anchor 外扩（happy）', () => {
  it('compass-margin：A.north / A.east 落在视觉 shape 外 margin 处', () => {
    // 视觉半轴 (20,15)。north = [0,-15]，east = [20,0]；margin=10 → 外边界半轴 (30,25)
    expect(resolveAnchor(mkLayout(0), 'north')).toEqual([0, -15]);
    expect(resolveAnchor(mkLayout(10), 'north')).toEqual([0, -25]);
    expect(resolveAnchor(mkLayout(0), 'east')).toEqual([20, 0]);
    expect(resolveAnchor(mkLayout(10), 'east')).toEqual([30, 0]);
  });

  it('angle-margin：A.30 沿 30° 射线打到外扩后的矩形边', () => {
    const tan30 = Math.tan((30 * Math.PI) / 180);
    const a0 = resolveAnchor(mkLayout(0), '30'); // 命中 east 边 x=20
    expect(a0[0]).toBeCloseTo(20, 6);
    expect(a0[1]).toBeCloseTo(20 * tan30, 6);
    const a10 = resolveAnchor(mkLayout(10), '30'); // 命中外边界 east 边 x=30
    expect(a10[0]).toBeCloseTo(30, 6);
    expect(a10[1]).toBeCloseTo(30 * tan30, 6);
  });

  it('autoclip-margin-regression：自动连线端点仍停在 shape 外 margin（行为不变）', () => {
    // 默认无 text、innerSep=8 → rect 16×16；A=(0,0) 朝 B=(100,0) → 端点 = 8 + 10 = 18
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], margin: 10 },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const p = compileToScene(ir).primitives.find(x => x.type === 'path');
    expect(p?.type === 'path' ? p.commands : undefined).toEqual([move([18, 0]), line([100, 0])]);
  });

  it('layout-footprint：margin 计入 viewBox（节点占位四向各 +margin）', () => {
    const mk = (margin: number): IR => ({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], margin }],
    });
    const l0 = compileToScene(mk(0)).layout;
    const l10 = compileToScene(mk(10)).layout;
    expect(l10.width - l0.width).toBe(20);
    expect(l10.height - l0.height).toBe(20);
    expect(l10.x - l0.x).toBe(-10);
    expect(l10.y - l0.y).toBe(-10);
  });
});

// ── 边界 ──────────────────────────────────────────────────────────────────────

describe('outerSep：边界', () => {
  it('margin-zero-identity：margin=0 时所有 anchor = 视觉 shape（同改前）', () => {
    const tan30 = Math.tan((30 * Math.PI) / 180);
    expect(resolveAnchor(mkLayout(0), 'north')).toEqual([0, -15]);
    expect(resolveAnchor(mkLayout(0), 'south')).toEqual([0, 15]);
    expect(resolveAnchor(mkLayout(0), 'east')).toEqual([20, 0]);
    const a0 = resolveAnchor(mkLayout(0), '30');
    expect(a0[0]).toBeCloseTo(20, 6);
    expect(a0[1]).toBeCloseTo(20 * tan30, 6);
  });

  it('center-unaffected：A.center 不随 margin 变（inflate 下中心不变）', () => {
    expect(resolveAnchor(mkLayout(0), 'center')).toEqual([0, 0]);
    expect(resolveAnchor(mkLayout(10), 'center')).toEqual([0, 0]);
  });
});

// ── 错误路径 / 不外扩护栏 ──────────────────────────────────────────────────────

describe('outerSep：不外扩护栏 + 校验', () => {
  it('negative-margin-rejected：margin=-1 被 schema 拒绝（.nonnegative）', () => {
    const ok = NodeSchema.safeParse({ type: 'node', id: 'A', position: [0, 0], margin: 0 });
    expect(ok.success).toBe(true);
    const bad = NodeSchema.safeParse({ type: 'node', id: 'A', position: [0, 0], margin: -1 });
    expect(bad.success).toBe(false);
  });

  it('edgePoint-no-margin：{ side, t } 恒走视觉 shape，不受 margin 影响', () => {
    const e0 = resolveEdgePoint(mkLayout(0), 'north', 0.5);
    const e10 = resolveEdgePoint(mkLayout(10), 'north', 0.5);
    expect(e10).toEqual(e0); // 视觉 north 边中点 = [0,-15]
    expect(e0).toEqual([0, -15]);
  });

  it('named-anchor-no-margin：star 的 tip-0 在 margin>0 下仍落视觉尖端（不外扩）', () => {
    const mk = (margin: number): IR => ({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          shape: { type: 'star', params: { points: 5, innerRadius: 5, outerRadius: 10 } },
          margin,
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A', anchor: 'tip-0' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    });
    const tipOf = (margin: number) => {
      const p = compileToScene(mk(margin)).primitives.find(x => x.type === 'path');
      return p?.type === 'path' ? p.commands[0] : undefined;
    };
    expect(tipOf(10)).toEqual(tipOf(0));
  });

  it('label-no-margin：label 附着点恒走视觉 shape（不被 outer sep 双偏移）', () => {
    const mk = (margin: number): IR => ({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          margin,
          label: { text: 'L', position: 'above' },
        },
      ],
    });
    const labelY = (margin: number): number | undefined => {
      const texts: Array<TextPrim> = [];
      const walk = (prims: Array<ScenePrimitive>): void => {
        for (const p of prims) {
          if (p.type === 'text') texts.push(p);
          else if (p.type === 'group') walk(p.children);
        }
      };
      walk(compileToScene(mk(margin)).primitives);
      const lbl = texts.find(t => t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'L'));
      return lbl?.y;
    };
    expect(labelY(10)).toBe(labelY(0));
  });
});

// ── 交互 ──────────────────────────────────────────────────────────────────────

describe('outerSep：交互', () => {
  it('margin-x-rotate：旋转后外扩量随旋转一致（距中心 = 外边界半轴）', () => {
    // north 半轴：margin=0 → 15，margin=10 → 25；旋转保距离
    expect(hypot(resolveAnchor(mkLayout(0, Math.PI / 2), 'north'))).toBeCloseTo(15, 6);
    expect(hypot(resolveAnchor(mkLayout(10, Math.PI / 2), 'north'))).toBeCloseTo(25, 6);
    // 90° 旋转把 north 转到 east 侧（x≈25），确认确有旋转
    expect(resolveAnchor(mkLayout(10, Math.PI / 2), 'north')[0]).toBeCloseTo(25, 6);
  });

  it('margin-x-borrowed-boundary：footprint = 视觉 AABB + margin，不受 boundary 影响', () => {
    const mk = (boundary: 'shape' | 'circle'): IR => ({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], margin: 10, boundary }],
    });
    // 借用连接面只改连接点求交，绝不改布局占位（ADR-07 §6）
    expect(compileToScene(mk('circle')).layout).toEqual(compileToScene(mk('shape')).layout);
  });
});
