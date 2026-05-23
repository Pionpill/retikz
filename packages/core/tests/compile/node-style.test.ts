import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type {
  EllipsePrim,
  PathPrim,
  RectPrim,
  TextPrim,
} from '../../src/primitive';
import { line, move } from '../helpers/path-command-factory';
import { flattenPrims } from '../helpers/flatten';

const findRect = (ir: IR): RectPrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find(
    (p): p is RectPrim => p.type === 'rect',
  );

const findEllipse = (ir: IR): EllipsePrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find(
    (p): p is EllipsePrim => p.type === 'ellipse',
  );

const findShapePath = (ir: IR): PathPrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find(
    (p): p is PathPrim => p.type === 'path' && p.commands.some(c => c.kind === 'close'),
  );

const findText = (ir: IR): TextPrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find((p): p is TextPrim => p.type === 'text');

describe('Node 颜色 / 不透明度 (alpha.2)', () => {
  it('textColor 透传到 TextPrim.fill', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'A', textColor: 'red' }],
    };
    expect(findText(ir)?.fill).toBe('red');
  });

  it('未设 textColor 时 TextPrim.fill = currentColor', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    };
    expect(findText(ir)?.fill).toBe('currentColor');
  });

  it('opacity 同时挂在 shape 与 text primitive 上', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'A', opacity: 0.5 }],
    };
    expect(findRect(ir)?.opacity).toBe(0.5);
    expect(findText(ir)?.opacity).toBe(0.5);
  });

  it('fillOpacity 透传到 shape primitive（rect / ellipse / diamond path）', () => {
    const rectIR: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], fill: '#fef3c7', fillOpacity: 0.4 }],
    };
    expect(findRect(rectIR)?.fillOpacity).toBe(0.4);

    const circleIR: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          shape: 'circle',
          position: [0, 0],
          fill: '#fef3c7',
          fillOpacity: 0.4,
        },
      ],
    };
    expect(findEllipse(circleIR)?.fillOpacity).toBe(0.4);

    const diamondIR: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          shape: 'diamond',
          position: [0, 0],
          fill: '#fef3c7',
          fillOpacity: 0.4,
        },
      ],
    };
    expect(findShapePath(diamondIR)?.fillOpacity).toBe(0.4);
  });

  it('drawOpacity → shape primitive.strokeOpacity', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], drawOpacity: 0.3 }],
    };
    expect(findRect(ir)?.strokeOpacity).toBe(0.3);
  });
});

describe('Node 描边样式 (alpha.2)', () => {
  it('dashed → dashPattern 默认 [4, 2]', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], dashed: true }],
    };
    expect(findRect(ir)?.dashPattern).toEqual([4, 2]);
  });

  it('dotted → dashPattern 默认 [1, 2]', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], dotted: true }],
    };
    expect(findRect(ir)?.dashPattern).toEqual([1, 2]);
  });

  it('dashArray 显式值优先于 dashed / dotted', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          dashed: true,
          dotted: true,
          dashArray: [8, 3, 2, 3],
        },
      ],
    };
    expect(findRect(ir)?.dashPattern).toEqual([8, 3, 2, 3]);
  });

  it('dashed 优先于 dotted（两者同设时）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', position: [0, 0], dashed: true, dotted: true },
      ],
    };
    expect(findRect(ir)?.dashPattern).toEqual([4, 2]);
  });
});

describe('Node 尺寸约束 (alpha.2)', () => {
  it('roundedCorners → RectPrim.cornerRadius', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], roundedCorners: 8 }],
    };
    expect(findRect(ir)?.cornerRadius).toBe(8);
  });

  it('minimumWidth 撑开 bbox 宽度', () => {
    const small: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0] }],
    };
    const wide: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumWidth: 100 }],
    };
    expect(findRect(small)?.width).toBe(16);
    expect(findRect(wide)?.width).toBe(100);
    // 高度不受影响
    expect(findRect(wide)?.height).toBe(16);
  });

  it('minimumHeight 撑开 bbox 高度', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumHeight: 60 }],
    };
    expect(findRect(ir)?.height).toBe(60);
    expect(findRect(ir)?.width).toBe(16);
  });

  it('minimumSize 等价于同时设 minimumWidth + minimumHeight', () => {
    const sym: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumSize: 50 }],
    };
    expect(findRect(sym)?.width).toBe(50);
    expect(findRect(sym)?.height).toBe(50);
  });

  it('minimumWidth 优先于 minimumSize 别名', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          minimumSize: 30,
          minimumWidth: 80,
        },
      ],
    };
    expect(findRect(ir)?.width).toBe(80);
    expect(findRect(ir)?.height).toBe(30);
  });

  it('text 比 minimum 大时取 text 自身尺寸（不缩水）', () => {
    // long text 自然宽度 > minimumWidth=10 → 用 text 算出的宽
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: 'long enough text',
          minimumWidth: 10,
        },
      ],
    };
    const r = findRect(ir);
    expect(r!.width).toBeGreaterThan(10);
  });
});

describe('Node 缩放 (alpha.2)', () => {
  it('scale=2 同时放大 bbox 与字号', () => {
    const base: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'x' }],
    };
    const big: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'x', scale: 2 }],
    };
    const rb = findRect(base)!;
    const rB = findRect(big)!;
    // scale=2 → bbox 各方向都翻倍
    expect(rB.width).toBeCloseTo(rb.width * 2, 1);
    expect(rB.height).toBeCloseTo(rb.height * 2, 1);
    // text 同步放大
    const tb = findText(base)!;
    const tB = findText(big)!;
    expect(tB.fontSize).toBeCloseTo(tb.fontSize * 2, 1);
  });

  it('xScale / yScale 各自方向独立放大 bbox', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', position: [0, 0], xScale: 3, yScale: 1 },
      ],
    };
    const r = findRect(ir)!;
    // 默认 16x16；xScale=3 → 宽 48，高 16
    expect(r.width).toBeCloseTo(48, 1);
    expect(r.height).toBeCloseTo(16, 1);
  });

  it('xScale 优先于 scale 别名（X 方向）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', position: [0, 0], scale: 2, xScale: 4 },
      ],
    };
    const r = findRect(ir)!;
    // xScale=4 覆盖 scale=2 影响 X；Y 仍走 scale=2
    expect(r.width).toBeCloseTo(64, 1);
    expect(r.height).toBeCloseTo(32, 1);
  });

  it('scale 影响 path 端点位置（boundary 跟随放大）', () => {
    // A=(0,0) rectangle，scale=2 → bbox 32x32；
    // path A → (100,0) 端点贴在 east = 16 处（之前是 8）
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], scale: 2 },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const linePath = flattenPrims(compileToScene(ir).primitives).find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      expect(linePath.commands).toEqual([move([16, 0]), line([100, 0])]);
    }
  });
});
