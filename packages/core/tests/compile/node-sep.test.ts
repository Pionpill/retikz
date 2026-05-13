import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive } from '../../src/primitive';
import { line, move } from '../helpers/path-command-factory';

const findRect = (prims: Array<ScenePrimitive>) =>
  prims.find(p => p.type === 'rect');

const rectSize = (ir: IR) => {
  const r = findRect(compileToScene(ir).primitives);
  return r?.type === 'rect' ? { w: r.width, h: r.height } : undefined;
};

describe('Node inner / outer sep（padding / margin 分轴）', () => {
  it('padding={p} 等价于 innerXSep={p} innerYSep={p}（对称别名）', () => {
    const a: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], padding: 12 }],
    };
    const b: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          innerXSep: 12,
          innerYSep: 12,
        },
      ],
    };
    expect(rectSize(a)).toEqual(rectSize(b));
  });

  it('innerXSep / innerYSep 分轴时 width / height 各自跟着 sep 变', () => {
    const wide: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          innerXSep: 30,
          innerYSep: 4,
        },
      ],
    };
    const tall: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          innerXSep: 4,
          innerYSep: 30,
        },
      ],
    };
    const w = rectSize(wide);
    const t = rectSize(tall);
    expect(w?.w).toBeGreaterThan(w!.h);
    expect(t?.h).toBeGreaterThan(t!.w);
    // 横向 vs 纵向对称：wide.width === tall.height 且 wide.height === tall.width
    expect(w?.w).toBe(t?.h);
    expect(w?.h).toBe(t?.w);
  });

  it('axis-specific 字段优先于 padding 别名（innerXSep 覆盖 X，padding 仍管 Y）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          padding: 8,
          innerXSep: 20,
        },
      ],
    };
    const sym: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          innerXSep: 20,
          innerYSep: 8,
        },
      ],
    };
    expect(rectSize(ir)).toEqual(rectSize(sym));
  });

  it('outerSep 优先于 margin 别名', () => {
    // 用 path 端点贴边距离来观察 outerSep 是否生效（rect 自身不包含 outerSep）。
    // 默认无 text、innerXSep / innerYSep = 8，rect 16x16；A=(0,0)、B=(100,0)；
    // outerSep=10 时端点应在 A 右边 8 + 10 = 18 处。
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], margin: 4, outerSep: 10 },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      // outerSep=10 取胜，端点 = 8 (innerXSep default) + 10 = 18
      expect(linePath.commands).toEqual([move([18, 0]), line([100, 0])]);
    }
  });

  it('outerSep 默认取 margin 别名（无显式 outerSep）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], margin: 5 },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      // margin=5 → 端点 8 + 5 = 13
      expect(linePath.commands).toEqual([move([13, 0]), line([100, 0])]);
    }
  });

  it('未设任何 sep / padding / margin → 走默认 (padding 默认 8，outerSep 默认 0)', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0] }],
    };
    expect(rectSize(ir)).toEqual({ w: 16, h: 16 });
  });
});
