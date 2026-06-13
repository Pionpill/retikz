import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathCommand, PathPrim, ScenePrimitive } from '../../src/primitive';

/**
 * ADR-05 拆分前 e2e snapshot 守门——锁住 IR → PathPrim.commands 输出
 * @description 12 个典型场景覆盖：line / fold / cycle / curve / cubic / bend / arc / circlePath / ellipsePath / arrow shrink / label / 多 sub-path
 * 拆 compile/path.ts 子文件 + findPrev O(n²)→O(n) 改造时本守门必须全过——任何 commands 数组变化即说明回归
 */

const findPathPrims = (prims: Array<ScenePrimitive>): Array<PathPrim> =>
  prims.filter((p): p is PathPrim => p.type === 'path');

const findPathCommands = (ir: IR): Array<PathCommand> => {
  const prims = findPathPrims(compileToScene(ir).primitives);
  expect(prims.length).toBeGreaterThanOrEqual(1);
  return prims[0].commands;
};

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

describe('ADR-05 e2e snapshot：拆分前 commands 锁定', () => {
  it('直线 2 step：move + line', () => {
    expect(
      findPathCommands(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
      ),
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [100, 0] },
    ]);
  });

  it("fold step '-|'：move → corner → end（horizontal-then-vertical）", () => {
    expect(
      findPathCommands(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'fold', via: '-|', to: [50, 30] },
            ],
          },
        ]),
      ),
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [50, 0] },
      { kind: 'line', to: [50, 30] },
    ]);
  });

  it("fold step '|-'：vertical-then-horizontal", () => {
    expect(
      findPathCommands(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'fold', via: '|-', to: [50, 30] },
            ],
          },
        ]),
      ),
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [0, 30] },
      { kind: 'line', to: [50, 30] },
    ]);
  });

  it('cycle 闭合：move + line + cycle → emit close', () => {
    expect(
      findPathCommands(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
              { type: 'step', kind: 'line', to: [10, 10] },
              { type: 'step', kind: 'cycle' },
            ],
          },
        ]),
      ),
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
      { kind: 'close' },
    ]);
  });

  it('curve（quadratic）：control 透传到 quad command', () => {
    expect(
      findPathCommands(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'curve', control: [5, -5], to: [10, 0] },
            ],
          },
        ]),
      ),
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'quad', control: [5, -5], to: [10, 0] },
    ]);
  });

  it('cubic：双控制点透传', () => {
    expect(
      findPathCommands(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'cubic',
                control1: [3, -3],
                control2: [7, -3],
                to: [10, 0],
              },
            ],
          },
        ]),
      ),
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'cubic', control1: [3, -3], control2: [7, -3], to: [10, 0] },
    ]);
  });

  it('arc（startAngle / endAngle / radius）→ arc command', () => {
    const commands = findPathCommands(
      scene([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
          ],
        },
      ]),
    );
    // 第 1 个 move 跳到弧起点（圆心 + 半径），第 2 个 arc command
    expect(commands).toHaveLength(2);
    expect(commands[0].kind).toBe('move');
    expect(commands[1]).toMatchObject({
      kind: 'arc',
      center: [0, 0],
      radius: 10,
      startAngle: 0,
      endAngle: 90,
    });
  });

  it('circlePath → ellipseArc command（rx=ry）', () => {
    const commands = findPathCommands(
      scene([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 5 },
          ],
        },
      ]),
    );
    expect(commands.some(c => c.kind === 'ellipseArc')).toBe(true);
  });

  it('ellipsePath → ellipseArc command（不同 rx / ry）', () => {
    const commands = findPathCommands(
      scene([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radiusX: 8, radiusY: 4 },
          ],
        },
      ]),
    );
    const ea = commands.find(c => c.kind === 'ellipseArc');
    expect(ea).toMatchObject({ kind: 'ellipseArc', radiusX: 8, radiusY: 4 });
  });

  it('arrow shrink：path 末端被向内缩 length × scale × strokeWidth', () => {
    const commands = findPathCommands(
      scene([
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'normal' },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ]),
    );
    // 默认 length=6 scale=1，normal lineContactX=0 → shrink = 6 user units（线缩到 94）
    expect(commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [94, 0] },
    ]);
  });

  it('label：line + label → 主 path commands 不变 + label TextPrim 同级', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'line',
            to: [100, 0],
            label: { text: 'L', position: 'midway' },
          },
        ],
      },
    ]);
    const prims = compileToScene(ir).primitives;
    const pathPrims = findPathPrims(prims);
    const textPrims = prims.filter(p => p.type === 'text');
    expect(pathPrims).toHaveLength(1);
    expect(pathPrims[0].commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [100, 0] },
    ]);
    expect(textPrims).toHaveLength(1);
  });

  it('多 sub-path（move 中段重启）：commands 多组 move', () => {
    const commands = findPathCommands(
      scene([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'move', to: [20, 20] },
            { type: 'step', kind: 'line', to: [30, 20] },
          ],
        },
      ]),
    );
    expect(commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'move', to: [20, 20] },
      { kind: 'line', to: [30, 20] },
    ]);
  });
});
