import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeLabelSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { GroupPrim, ScenePrimitive, TextPrim } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const silent = { onWarn: () => {} };

const labelText = (prims: Array<ScenePrimitive>, text: string): TextPrim | undefined =>
  flattenPrims(prims).find(
    (p): p is TextPrim =>
      p.type === 'text' && p.lines.some(l => (typeof l === 'string' ? l : l.text) === text),
  );

/** 找包住指定 label 文本的 rotate group（深度优先；group 仅含该 text 且带 rotate transform） */
const findLabelRotateGroup = (
  prims: Array<ScenePrimitive>,
  text: string,
): GroupPrim | undefined => {
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
    expect(findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')).toBeUndefined();
  });

  it('rotate 数字 → label 包绕自身中心的 rotate group', () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 30 } },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;    expect(rot.degrees).toBe(30);
    const txt = g.children[0] as TextPrim;
    expect(rot.cx).toBe(txt.x);
    expect(rot.cy).toBe(txt.y);
  });

  it("radial：position='below'（+y 方向，屏幕下）→ 角度 ≈ 90", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'below', rotate: 'radial' } },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;    expect(rot.degrees).toBeCloseTo(90);
  });

  it("radial：position='right'（+x 方向）→ 0° = 无旋转 = 不包 group", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 'radial' } },
    ]);
    // radial 指向 +x 即 0°，自旋是 no-op，不产生 rotate group
    expect(findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')).toBeUndefined();
  });

  it("tangent = radial + 90：position='right' → ≈ 90", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 'tangent' } },
    ]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;    expect(rot.degrees).toBeCloseTo(90);
  });

  // 边界
  it("rotate 'none' 显式 = 缺省 → 不包 group", () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', label: { text: 'L', rotate: 'none' } },
    ]);
    expect(findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')).toBeUndefined();
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
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;    const norm = ((rot.degrees % 360) + 360) % 360;
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
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;    const norm = ((rot.degrees % 360) + 360) % 360;
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
    const lb = labelText(compileToScene(base, silent).primitives, 'L')!;
    const lr = labelText(compileToScene(rotated, silent).primitives, 'L')!;
    // 修双重旋转后：旋转 Node 的 label TextPrim 局部坐标 = 不旋转版（外层 node group 统一旋转一次）
    expect(lr.x).toBeCloseTo(lb.x);
    expect(lr.y).toBeCloseTo(lb.y);
  });

  it('数字角度 position 也走 axis-aligned（rotated Node 上不双重旋转）', () => {
    const labelSpec = { text: 'L', position: 30, distance: 10 };
    const base = scene([{ type: 'node', position: [0, 0], text: 'A', label: labelSpec }]);
    const rotated = scene([{ type: 'node', position: [0, 0], text: 'A', rotate: 90, label: labelSpec }]);
    const lb = labelText(compileToScene(base, silent).primitives, 'L')!;
    const lr = labelText(compileToScene(rotated, silent).primitives, 'L')!;
    expect(lr.x).toBeCloseTo(lb.x);
    expect(lr.y).toBeCloseTo(lb.y);
  });

  it('既有 node-label 定位语义不变：不旋转 Node label rotate 不改 TextPrim 位置', () => {
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
    const a = labelText(compileToScene(noRot, silent).primitives, 'L')!;
    const b = labelText(compileToScene(withRot, silent).primitives, 'L')!;
    // rotate 只改朝向（包 rotate group），不二次位移 label → TextPrim 中心不变
    expect(b.x).toBeCloseTo(a.x);
    expect(b.y).toBeCloseTo(a.y);
  });
});
