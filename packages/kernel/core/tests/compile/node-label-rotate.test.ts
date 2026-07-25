import { describe, expect, it } from 'vitest';

import type { GroupPrim, ScenePrimitive, TextPrim } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { NodeLabelSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

// fallback measurer 不提供 ascent / descent，Node label 规范化为上下对称视觉盒
const visualMiddle = (t: TextPrim): number => t.y;

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });
const silent = { onWarn: () => {} };

const labelText = (prims: Array<ScenePrimitive>, text: string): TextPrim | undefined =>
  flattenPrims(prims).find(
    (p): p is TextPrim => p.type === 'text' && p.lines.some(l => (typeof l === 'string' ? l : l.text) === text),
  );

/** 找包住指定 label 文本的 rotate group（深度优先；group 仅含该 text 且带 rotate transform） */
const findLabelRotateGroup = (prims: Array<ScenePrimitive>, text: string): GroupPrim | undefined => {
  for (const p of prims) {
    if (p.type === 'group') {
      const only = p.children.length === 1 ? p.children[0] : undefined;
      if (
        only?.type === 'text' &&
        only.lines.some(l => (typeof l === 'string' ? l : l.text) === text) &&
        p.transforms?.some(t => t.kind === 'rotate')
      ) {
        return p;
      }
      const nested = findLabelRotateGroup(p.children, text);
      if (nested) return nested;
    }
  }
  return undefined;
};

describe('Node label rotate', () => {
  // Happy path
  it('rotate 缺省 → label 不包 rotate group', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L' } }]);
    expect(findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')).toBeUndefined();
  });

  it('rotate 数字 → label 包绕自身中心的 rotate group', () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 30 } },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    expect(rot.degrees).toBe(30);
    const txt = g.children[0] as TextPrim;
    // 绕 label 视觉中心自旋：cx = 文本水平锚点，cy = 文本视觉中心（alphabetic 基线上推回中心）
    expect(rot.cx).toBe(txt.x);
    expect(rot.cy).toBeCloseTo(visualMiddle(txt), 2);
  });

  it("radial：position='bottom'（+y 方向，屏幕下）→ 角度 ≈ 90", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'bottom', rotate: 'radial' } },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    expect(rot.degrees).toBeCloseTo(90);
  });

  it("radial：position='right'（+x 方向）→ 0° = 无旋转 = 不包 group", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 'radial' } },
    ]);
    // radial 指向 +x 即 0°，自旋是 no-op，不产生 rotate group
    expect(findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')).toBeUndefined();
  });

  it('radial：boundary fraction 使用所选边的外法向，不使用 node center → label center', () => {
    const ir = scene([
      {
        type: 'node',
        position: [0, 0],
        text: 'A',
        label: {
          text: 'L',
          position: { boundary: 'top', fraction: 0.25 },
          rotate: 'radial',
        },
      },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    expect(rot.degrees).toBeCloseTo(-90);
  });

  it("tangent = radial + 90：position='right' → ≈ 90", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 'tangent' } },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    expect(rot.degrees).toBeCloseTo(90);
  });

  // 边界
  it("rotate 'none' 显式 = 缺省 → 不包 group", () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L', rotate: 'none' } }]);
    expect(findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')).toBeUndefined();
  });

  it("keepUpright：position='left'（radial≈180）翻 180 → 接近正立", () => {
    const ir = scene([
      {
        type: 'node',
        position: [0, 0],
        text: 'A',
        label: { text: 'L', position: 'left', rotate: 'radial', keepUpright: true },
      },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    const norm = ((rot.degrees % 360) + 360) % 360;
    expect(Math.min(norm, 360 - norm)).toBeCloseTo(0);
  });

  it("keepUpright=false：position='left' 保持 ≈180（不翻）", () => {
    const ir = scene([
      {
        type: 'node',
        position: [0, 0],
        text: 'A',
        label: { text: 'L', position: 'left', rotate: 'radial' },
      },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).scene.primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    const norm = ((rot.degrees % 360) + 360) % 360;
    expect(norm).toBeCloseTo(180);
  });

  // 错误路径（schema 守卫）
  it('非法 rotate 字符串被 NodeLabelSchema 拒', () => {
    expect(() => NodeLabelSchema.parse({ text: 'L', rotate: 'spin' })).toThrow();
  });

  it('keepUpright 非 boolean 被拒', () => {
    expect(() => NodeLabelSchema.parse({ text: 'L', keepUpright: 'yes' })).toThrow();
  });

  // 交互：核心修复 —— rotated Node 上 label 位置不双重旋转
  it('不旋转 Node 的 label 位置由 axis-aligned 局部坐标决定（与旋转版的局部坐标一致 → 无双重旋转）', () => {
    const labelSpec = { text: 'L', position: 'right' as const, distance: 10 };
    const base = scene([{ type: 'node', position: [0, 0], text: 'A', label: labelSpec }]);
    const rotated = scene([{ type: 'node', position: [0, 0], text: 'A', rotate: 90, label: labelSpec }]);
    const lb = labelText(compileToScene(base, silent).scene.primitives, 'L')!;
    const lr = labelText(compileToScene(rotated, silent).scene.primitives, 'L')!;
    // 修双重旋转后：旋转 Node 的 label TextPrim 局部坐标 = 不旋转版（外层 node group 统一旋转一次）
    expect(lr.x).toBeCloseTo(lb.x);
    expect(lr.y).toBeCloseTo(lb.y);
  });

  it('数字角度 position 也走 axis-aligned（rotated Node 上不双重旋转）', () => {
    const labelSpec = { text: 'L', position: 30, distance: 10 };
    const base = scene([{ type: 'node', position: [0, 0], text: 'A', label: labelSpec }]);
    const rotated = scene([{ type: 'node', position: [0, 0], text: 'A', rotate: 90, label: labelSpec }]);
    const lb = labelText(compileToScene(base, silent).scene.primitives, 'L')!;
    const lr = labelText(compileToScene(rotated, silent).scene.primitives, 'L')!;
    expect(lr.x).toBeCloseTo(lb.x);
    expect(lr.y).toBeCloseTo(lb.y);
  });

  it('label 自旋通过最终 OBB 投影改变 center offset', () => {
    const noRot = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', distance: 10 } },
    ]);
    const withRot = scene([
      {
        type: 'node',
        position: [0, 0],
        text: 'A',
        label: { text: 'L', position: 'right', distance: 10, rotate: 45 },
      },
    ]);
    const a = labelText(compileToScene(noRot, silent).scene.primitives, 'L')!;
    const b = labelText(compileToScene(withRot, silent).scene.primitives, 'L')!;
    expect(b.x - a.x).toBeCloseTo(5.5, 1);
    expect(b.y).toBeCloseTo(a.y);
  });
});
