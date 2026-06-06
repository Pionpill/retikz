import { describe, expect, it } from 'vitest';
import { boundaryPointOf, layoutNode } from '../../src/compile/node';
import { NameStack } from '../../src/compile/name-stack';
import type { IRNode } from '../../src/ir/node';
import { type ContourSegment, filletContour } from '../../src/geometry/roundedContour';
import { BUILTIN_SHAPES } from '../../src/shapes';

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 10,
  height: 10,
  ascent: 8,
});

/** 用固定 minimumSize 造一个 40×40 居中正方 rectangle 节点（半边 20） */
const layoutSquare = (node: IRNode) =>
  layoutNode(node, measureText, new NameStack(), undefined, [], undefined, BUILTIN_SHAPES);

/** 40×40 正方轮廓的 4 条 CW Line 段（用于独立复算 fillet 弧，断言边界端点落弧上） */
const square40Segments = (): Array<ContourSegment> => [
  { kind: 'line', from: [-20, -20], to: [20, -20] },
  { kind: 'line', from: [20, -20], to: [20, 20] },
  { kind: 'line', from: [20, 20], to: [-20, 20] },
  { kind: 'line', from: [-20, 20], to: [-20, -20] },
];

describe('顶层 Node.cornerRadius 连接边界感知（P1）', () => {
  it('顶层 cornerRadius 的 boundary 端点落在 fillet 弧上（≠ 直角顶点）', () => {
    const node: IRNode = {
      type: 'node',
      id: 'a',
      position: [0, 0],
      cornerRadius: 8,
      minimumWidth: 40,
      minimumHeight: 40,
    };
    const layout = layoutSquare(node);
    // 朝右上角方向取边界点
    const toward = [100, -100] as [number, number];
    const hit = boundaryPointOf(layout, toward);

    // 直角矩形顶点 = [20,-20]；命中点应离中心更近（落在 fillet 弧上）
    const dHit = Math.hypot(hit[0], hit[1]);
    const dCorner = Math.hypot(20, 20);
    expect(dHit).toBeLessThan(dCorner - 1e-3);

    // 命中点到某个 fillet 圆心距离 ≈ 8（确实落在 r=8 的弧上）
    const fillets = filletContour(square40Segments(), 8);
    const onArc = fillets.some(
      f => Math.abs(Math.hypot(hit[0] - f.center[0], hit[1] - f.center[1]) - 8) < 1e-3,
    );
    expect(onArc).toBe(true);
  });

  it('顶层 cornerRadius 与等价 shape params 形式端点一致', () => {
    const top: IRNode = {
      type: 'node',
      id: 'a',
      position: [0, 0],
      cornerRadius: 8,
      minimumWidth: 40,
      minimumHeight: 40,
    };
    const viaParams: IRNode = {
      type: 'node',
      id: 'b',
      position: [0, 0],
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
      minimumWidth: 40,
      minimumHeight: 40,
    };
    const toward = [100, -100] as [number, number];
    const hitTop = boundaryPointOf(layoutSquare(top), toward);
    const hitParams = boundaryPointOf(layoutSquare(viaParams), toward);
    expect(hitTop[0]).toBeCloseTo(hitParams[0]);
    expect(hitTop[1]).toBeCloseTo(hitParams[1]);
  });

  it('params 显式给 cornerRadius 时不被顶层覆盖（params 优先）', () => {
    const both: IRNode = {
      type: 'node',
      id: 'a',
      position: [0, 0],
      cornerRadius: 8,
      shape: { type: 'rectangle', params: { cornerRadius: 2 } },
      minimumWidth: 40,
      minimumHeight: 40,
    };
    const onlyParams: IRNode = {
      type: 'node',
      id: 'b',
      position: [0, 0],
      shape: { type: 'rectangle', params: { cornerRadius: 2 } },
      minimumWidth: 40,
      minimumHeight: 40,
    };
    const toward = [100, -100] as [number, number];
    const hitBoth = boundaryPointOf(layoutSquare(both), toward);
    const hitOnly = boundaryPointOf(layoutSquare(onlyParams), toward);
    expect(hitBoth[0]).toBeCloseTo(hitOnly[0]);
    expect(hitBoth[1]).toBeCloseTo(hitOnly[1]);
  });
});
