import { describe, expect, it } from 'vitest';
import { gradientLineFromAngle } from '../src/shared/gradient';
import { sceneFitMatrix } from '../src/canvas/shared';

/**
 * 后端无关 / canvas 族共享纯函数锁定测试：渐变线端点（SVG+Canvas 共用）、meet-fit 适配矩阵（canvas+canvas-node 共用）。
 * 抽出共享层的意义就是防两端公式漂移，这里钉死契约。
 */

describe('gradientLineFromAngle', () => {
  it('0° → 水平线（左中→右中）', () => {
    expect(gradientLineFromAngle(0)).toEqual({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 });
  });

  it('缺省角度等价于 0°', () => {
    expect(gradientLineFromAngle(undefined)).toEqual(gradientLineFromAngle(0));
  });

  it('90° → 竖直线（上中→下中）', () => {
    const line = gradientLineFromAngle(90);
    expect(line.x1).toBeCloseTo(0.5);
    expect(line.x2).toBeCloseTo(0.5);
    expect(line.y1).toBeCloseTo(0);
    expect(line.y2).toBeCloseTo(1);
  });
});

describe('sceneFitMatrix', () => {
  const layout = { x: 0, y: 0, width: 100, height: 100 };

  it('宽于内容时 letterbox 居中（取较小缩放，水平留边）', () => {
    // css 200×100，scale=min(2,1)=1，offsetX=(200-100)/2=50，offsetY=0
    expect(sceneFitMatrix(layout, 200, 100, 1)).toEqual([1, 0, 0, 1, 50, 0]);
  });

  it('devicePixelRatio 整体放大缩放与平移', () => {
    expect(sceneFitMatrix(layout, 200, 100, 2)).toEqual([2, 0, 0, 2, 100, 0]);
  });

  it('layout 原点偏移计入平移', () => {
    // layout.x=10 → 平移再减 x*scale*dpr
    expect(sceneFitMatrix({ x: 10, y: 0, width: 100, height: 100 }, 100, 100, 1)).toEqual([1, 0, 0, 1, -10, 0]);
  });
});
