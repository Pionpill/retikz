import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import { pathCommandsToD } from '../helpers/path-d';

describe('Coordinate placeholder', () => {
  it('coordinate 自身不发任何 primitive', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'm', position: [3, 2] },
      ],
    };
    const scene = compileToScene(ir);
    expect(scene.primitives).toHaveLength(0);
  });

  it('coordinate 不参与 viewBox 扩展（与"无 child"等价兜底）', () => {
    // 远离原点的 coordinate 不该撑大 viewBox：
    // 仅含 coordinate 时 allPoints 为空，viewBox 走 view-box.ts 的兜底 100x100@(0,0)
    const farIR: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'coordinate', id: 'far', position: [9999, 9999] }],
    };
    const emptyIR: IR = { version: 1, type: 'scene', children: [] };
    expect(compileToScene(farIR).viewBox).toEqual(compileToScene(emptyIR).viewBox);
  });

  it('path target 字符串可命中 coordinate id', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'A', position: [0, 0] },
        { type: 'coordinate', id: 'B', position: [10, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: 'B' },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const path = scene.primitives.find(p => p.type === 'path');
    expect(path).toBeDefined();
    if (path?.type === 'path') {
      // coordinate 是 0×0 rect，boundary point 即中心；M 0 0 L 10 0
      expect(pathCommandsToD(path.commands)).toMatch(/^M 0 0/);
      expect(pathCommandsToD(path.commands)).toMatch(/L 10 0/);
    }
  });

  it('node.position.of 可引用 coordinate id（mixed scenario）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'origin', position: [5, 5] },
        {
          type: 'node',
          id: 'A',
          position: { direction: 'right', of: 'origin', distance: 4 },
          text: 'A',
        },
      ],
    };
    const scene = compileToScene(ir);
    const rect = scene.primitives.find(p => p.type === 'rect');
    expect(rect).toBeDefined();
    if (rect?.type === 'rect') {
      // A 中心 = origin + (4, 0) = (9, 5)
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      expect(cx).toBeCloseTo(9);
      expect(cy).toBeCloseTo(5);
    }
  });

  it('coordinate 的 position 也支持 polar / at（链式）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'a', position: [0, 0] },
        // 极坐标：基于 'a' 的 0°，半径 5（笛卡尔角度，y 向下：cos(0)=1, sin(0)=0）
        { type: 'coordinate', id: 'b', position: { angle: 0, radius: 5, origin: 'a' } },
        // 相对定位：在 b 的 'right' 方向 distance=3
        { type: 'coordinate', id: 'c', position: { direction: 'right', of: 'b', distance: 3 } },
        // 用 c 当 path 端点验证位置
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'c' },
            { type: 'step', kind: 'line', to: [0, 0] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const path = scene.primitives.find(p => p.type === 'path');
    expect(path).toBeDefined();
    if (path?.type === 'path') {
      // c 在 (5+3, 0) = (8, 0)
      expect(pathCommandsToD(path.commands)).toMatch(/^M 8 0/);
    }
  });

  it('引用未定义的 of 抛错', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'b', position: { direction: 'right', of: 'a' } },
      ],
    };
    expect(() => compileToScene(ir)).toThrow(/Cannot resolve position for coordinate/);
  });

  it('coordinate 在 IR children 顺序里——前向引用不允许', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        // b 在 a 之前，前向引用应该失败
        { type: 'coordinate', id: 'b', position: { direction: 'right', of: 'a' } },
        { type: 'coordinate', id: 'a', position: [0, 0] },
      ],
    };
    expect(() => compileToScene(ir)).toThrow(/Cannot resolve position for coordinate/);
  });
});
