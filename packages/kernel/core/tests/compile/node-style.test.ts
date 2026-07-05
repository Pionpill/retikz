import { describe, expect, it } from 'vitest';

import type { EllipsePrim, PathPrim, RectPrim, TextPrim } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { NodeSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';
import { line, move } from '../helpers/path-command-factory';

const findRect = (ir: IRScene): RectPrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find((p): p is RectPrim => p.type === 'rect');

const findEllipse = (ir: IRScene): EllipsePrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find((p): p is EllipsePrim => p.type === 'ellipse');

const findShapePath = (ir: IRScene): PathPrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find(
    (p): p is PathPrim => p.type === 'path' && p.commands.some(c => c.kind === 'close'),
  );

const findText = (ir: IRScene): TextPrim | undefined =>
  flattenPrims(compileToScene(ir).primitives).find((p): p is TextPrim => p.type === 'text');

describe('Node 颜色 / 不透明度 (alpha.2)', () => {
  it('textColor 透传到 TextPrim.fill', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'A', textColor: 'red' }],
    };
    expect(findText(ir)?.fill).toBe('red');
  });

  it('未设 textColor 时 TextPrim.fill = currentColor', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    };
    expect(findText(ir)?.fill).toBe('currentColor');
  });

  it('opacity 同时挂在 shape 与 text primitive 上', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'A', opacity: 0.5 }],
    };
    expect(findRect(ir)?.opacity).toBe(0.5);
    expect(findText(ir)?.opacity).toBe(0.5);
  });

  it('fillOpacity 透传到 shape primitive（rect / ellipse / diamond path）', () => {
    const rectIR: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], fill: '#fef3c7', fillOpacity: 0.4 }],
    };
    expect(findRect(rectIR)?.fillOpacity).toBe(0.4);

    const circleIR: IRScene = {
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

    const diamondIR: IRScene = {
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

  it('strokeOpacity → shape primitive.strokeOpacity', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], strokeOpacity: 0.3 }],
    };
    expect(findRect(ir)?.strokeOpacity).toBe(0.3);
  });
});

describe('Node 描边样式 (alpha.2)', () => {
  it('dashed → dashPattern 默认 [4, 2]', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], dashed: true }],
    };
    expect(findRect(ir)?.dashPattern).toEqual([4, 2]);
  });

  it('dotted → dashPattern 默认 [1, 2]', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], dotted: true }],
    };
    expect(findRect(ir)?.dashPattern).toEqual([1, 2]);
  });

  it('dashPattern 显式值优先于 dashed / dotted', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          dashed: true,
          dotted: true,
          dashPattern: [8, 3, 2, 3],
        },
      ],
    };
    expect(findRect(ir)?.dashPattern).toEqual([8, 3, 2, 3]);
  });

  it('dashed 优先于 dotted（两者同设时）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], dashed: true, dotted: true }],
    };
    expect(findRect(ir)?.dashPattern).toEqual([4, 2]);
  });
});

describe('Node 尺寸约束 (alpha.2)', () => {
  it('cornerRadius → RectPrim.cornerRadius', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], cornerRadius: 8 }],
    };
    expect(findRect(ir)?.cornerRadius).toBe(8);
  });

  it('minimumSize.width 撑开 bbox 宽度', () => {
    const small: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0] }],
    };
    const wide: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumSize: { width: 100 } }],
    };
    expect(findRect(small)?.width).toBe(16);
    expect(findRect(wide)?.width).toBe(100);
    // 高度不受影响
    expect(findRect(wide)?.height).toBe(16);
  });

  it('minimumSize.height 撑开 bbox 高度', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumSize: { height: 60 } }],
    };
    expect(findRect(ir)?.height).toBe(60);
    expect(findRect(ir)?.width).toBe(16);
  });

  it('minimumSize number 等价于同时设 width + height', () => {
    const sym: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumSize: 50 }],
    };
    expect(findRect(sym)?.width).toBe(50);
    expect(findRect(sym)?.height).toBe(50);
  });

  it('minimumSize.width 优先于 minimumSize.default', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          minimumSize: { default: 30, width: 80 },
        },
      ],
    };
    expect(findRect(ir)?.width).toBe(80);
    expect(findRect(ir)?.height).toBe(30);
  });

  it('text 比 minimum 大时取 text 自身尺寸（不缩水）', () => {
    // long text 自然宽度 > minimumSize.width=10 → 用 text 算出的宽
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: 'long enough text',
          minimumSize: { width: 10 },
        },
      ],
    };
    const r = findRect(ir);
    expect(r!.width).toBeGreaterThan(10);
  });

  // C6：minimum 随 scale 缩 + floor 外接框（而非内框）
  it('minimum 随 scale 缩放：minimumSize=50 + scale=2 → bbox 100', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], minimumSize: 50, scale: 2 }],
    };
    // 旧实现 minimum 不乘 scale → 仍 50；现 50×2 = 100
    expect(findRect(ir)?.width).toBe(100);
    expect(findRect(ir)?.height).toBe(100);
  });

  it('minimum floor 外接框而非内框：ellipse minimumSize=100 → 直径 100（非 √2 倍）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], shape: { type: 'ellipse' }, minimumSize: 100 }],
    };
    const e = findEllipse(ir);
    // 旧实现把 100 floor 进内框半轴(50)，circumscribe 再 ×√2 → rx≈70.7（直径≈141）；
    // 现 floor 外接框 → rx=ry=50（直径 100）
    expect(e?.rx).toBeCloseTo(50, 6);
    expect(e?.ry).toBeCloseTo(50, 6);
  });

  it('minimumWidth / minimumHeight 旧字段被 schema 拒绝', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        minimumWidth: 100,
      }).success,
    ).toBe(false);
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        minimumHeight: 100,
      }).success,
    ).toBe(false);
  });
});

describe('Node 缩放 (alpha.2)', () => {
  it('scale=2 同时放大 bbox 与字号', () => {
    const base: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'x' }],
    };
    const big: IRScene = {
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

  it('scale.x / scale.y 各自方向独立放大 bbox', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], scale: { x: 3, y: 1 } }],
    };
    const r = findRect(ir)!;
    // 默认 16x16；scale.x=3 → 宽 48，高 16
    expect(r.width).toBeCloseTo(48, 1);
    expect(r.height).toBeCloseTo(16, 1);
  });

  it('scale.x 优先于 scale.default（X 方向）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], scale: { default: 2, x: 4 } }],
    };
    const r = findRect(ir)!;
    // scale.x=4 覆盖 scale.default=2 影响 X；Y 仍走 scale.default=2
    expect(r.width).toBeCloseTo(64, 1);
    expect(r.height).toBeCloseTo(32, 1);
  });

  it('xScale / yScale 旧字段被 schema 拒绝', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        xScale: 2,
      }).success,
    ).toBe(false);
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        yScale: 2,
      }).success,
    ).toBe(false);
  });

  it('scale 影响 path 端点位置（boundary 跟随放大）', () => {
    // A=(0,0) rectangle，scale=2 → bbox 32x32；
    // path A → (100,0) 端点贴在 right = 16 处（之前是 8）
    const ir: IRScene = {
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
