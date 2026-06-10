import { type ReactElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { IR, IRChild } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';
import { Draw } from '../../src/sugar/Draw';
import { TIKZ_NODE, TIKZ_PATH, TIKZ_STEP } from '../../src/kernel/_displayNames';
import { buildIR } from '../../src/kernel/builder';
import { convertIRToReactNode } from '../../src/kernel/unbuilder';

const emptyScene: IR = {
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: [],
};

/** 把 ReactNode 收成 ReactElement 数组，过滤掉 null/string 等非 element 项 */
const toElements = (node: ReturnType<typeof convertIRToReactNode>): Array<ReactElement> => {
  const arr = Array.isArray(node) ? node : [node];
  return arr.filter(isValidElement);
};

describe('convertIRToReactNode', () => {
  it('空 scene → 空数组', () => {
    const out = convertIRToReactNode(emptyScene);
    expect(toElements(out)).toHaveLength(0);
  });

  it('单 Node 还原为 <Node /> element，displayName 与关键 props 原样', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [10, 20],
          text: 'Hi',
          fill: '#fff',
          stroke: '#000',
          strokeWidth: 2,
        },
      ],
    };
    const [el] = toElements(convertIRToReactNode(ir));
    expect((el.type as { displayName?: string }).displayName).toBe(TIKZ_NODE);
    expect(el.props).toMatchObject({
      id: 'A',
      position: [10, 20],
      text: 'Hi',
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 2,
    });
  });

  it('IR Node 上 undefined 字段不写进 element props', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0] }],
    };
    const [el] = toElements(convertIRToReactNode(ir));
    expect(el.props).not.toHaveProperty('id');
    expect(el.props).not.toHaveProperty('text');
    expect(el.props).not.toHaveProperty('fill');
  });

  it('Path + 2 Step 还原：<Path> 含两个 <Step> children，displayName / kind / to 全对', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: 'red',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    };
    const [pathEl] = toElements(convertIRToReactNode(ir));
    expect((pathEl.type as { displayName?: string }).displayName).toBe(TIKZ_PATH);
    expect(pathEl.props).toMatchObject({ stroke: 'red' });

    const stepEls = toElements(pathEl.props.children as ReturnType<typeof convertIRToReactNode>);
    expect(stepEls).toHaveLength(2);
    expect((stepEls[0].type as { displayName?: string }).displayName).toBe(TIKZ_STEP);
    expect(stepEls[0].props).toMatchObject({ kind: 'move', to: { id: 'A' } });
    expect(stepEls[1].props).toMatchObject({ kind: 'line', to: [100, 100] });
  });

  it('Kernel-only round-trip：IR → React → IR 等价', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        { type: 'node', id: 'B', position: [50, 0], text: 'B' },
        {
          type: 'path',
          stroke: 'blue',
          strokeWidth: 1,
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: { id: 'B' } },
          ],
        },
      ],
    };
    const back = buildIR(convertIRToReactNode(ir));
    expect(back).toEqual(ir);
  });

  it('Sugar 降级：<Draw> → IR → React 还原成 <Path>，二次 round-trip IR 稳定', () => {
    const ir1 = buildIR(<Draw way={['A', [10, 0]]} stroke="red" />);
    const ir2 = buildIR(convertIRToReactNode(ir1));
    expect(ir2).toEqual(ir1);

    const [pathEl] = toElements(convertIRToReactNode(ir1));
    expect((pathEl.type as { displayName?: string }).displayName).toBe(TIKZ_PATH);
    expect((pathEl.type as { displayName?: string }).displayName).not.toBe('Draw');
  });

  it("折角 step 'step' round-trip：via 字段透传保留", () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [10, 5] },
          ],
        },
      ],
    };
    const back = buildIR(convertIRToReactNode(ir));
    expect(back).toEqual(ir);
  });

  it("Path fill / fillRule round-trip", () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: '#3b82f6',
          fillRule: 'evenodd',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const back = buildIR(convertIRToReactNode(ir));
    expect(back).toEqual(ir);
  });

  it('zIndex round-trip：Node / Path / Scope 各自透传保留（重点验 path 手写分支不漏）', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A', zIndex: -1 },
        {
          type: 'path',
          zIndex: 10,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
        {
          type: 'scope',
          zIndex: 5,
          children: [{ type: 'node', position: [20, 0], text: 'B' }],
        },
      ],
    };
    const back = buildIR(convertIRToReactNode(ir));
    expect(back).toEqual(ir);
  });

  it("Node shape round-trip：4 种 shape 字段透传保留", () => {
    for (const shape of ['rectangle', 'circle', 'ellipse', 'diamond'] as const) {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [{ type: 'node', id: 'A', shape, position: [0, 0], text: 'A' }],
      };
      const back = buildIR(convertIRToReactNode(ir));
      expect(back).toEqual(ir);
    }
  });

  it("path-level arrow round-trip：'->'/'<-'/'<->' 字段透传保留", () => {
    for (const arrow of ['->', '<-', '<->'] as const) {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            arrow,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      const back = buildIR(convertIRToReactNode(ir));
      expect(back).toEqual(ir);
    }
  });

  it("cycle step round-trip：无 to / via 字段保留", () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const back = buildIR(convertIRToReactNode(ir));
    expect(back).toEqual(ir);
  });

  it('curve step round-trip：control 字段透传保留', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', to: [10, 0], control: [5, 8] },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  it('cubic step round-trip：control1 / control2 字段透传保留', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 0], control1: [3, 5], control2: [7, 5] },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  it('bend step round-trip：bendDirection 必填、bendAngle 可选', () => {
    const irWithAngle: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: 45 },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(irWithAngle))).toEqual(irWithAngle);

    const irNoAngle: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'right' },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(irNoAngle))).toEqual(irNoAngle);
  });

  it("arc step round-trip：startAngle / endAngle / radius 透传保留", () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  it("circlePath step round-trip：radius 透传保留", () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 5 },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  it("ellipsePath step round-trip：radiusX / radiusY 透传保留", () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radiusX: 8, radiusY: 4 },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  describe('step.label round-trip', () => {
    it('line + label round-trip 完整保留 text/position/side', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'line',
                to: [10, 0],
                label: { text: 'x', position: 'near-end', side: 'sloped' },
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('八种带 label 的 kind 全部 round-trip', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0], label: { text: 'L' } },
              { type: 'step', kind: 'fold', via: '-|', to: [20, 5], label: { text: 'F' } },
              { type: 'step', kind: 'curve', control: [25, -5], to: [30, 0], label: { text: 'Q' } },
              {
                type: 'step',
                kind: 'cubic',
                control1: [33, -3],
                control2: [37, -3],
                to: [40, 0],
                label: { text: 'C' },
              },
              {
                type: 'step',
                kind: 'bend',
                bendDirection: 'left',
                to: [50, 0],
                label: { text: 'B' },
              },
              {
                type: 'step',
                kind: 'arc',
                startAngle: 0,
                endAngle: 90,
                radius: 5,
                label: { text: 'A' },
              },
              { type: 'step', kind: 'circlePath', radius: 4, label: { text: 'O' } },
              { type: 'step', kind: 'ellipsePath', radiusX: 6, radiusY: 3, label: { text: 'E' } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('IR 中没有 label 字段时 round-trip 不会凭空多出 label', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });
  });

  describe('alpha.3 P2：path 级视觉属性 round-trip', () => {
    it('lineCap / lineJoin 双向保留', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            lineCap: 'round',
            lineJoin: 'bevel',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
              { type: 'step', kind: 'line', to: [10, 10] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('thickness 语义档位双向保留', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            thickness: 'veryThick',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('opacity / fillOpacity / drawOpacity 三件双向保留', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            fill: 'red',
            opacity: 0.8,
            fillOpacity: 0.4,
            drawOpacity: 0.6,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
              { type: 'step', kind: 'line', to: [10, 10] },
              { type: 'step', kind: 'cycle' },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });
  });

  describe('alpha.4/5 新增形态 round-trip', () => {
    it('round-trips AtPosition Node：{ direction, of, distance }', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { direction: 'right', of: 'A', distance: 50 },
            text: 'B',
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips AtPosition 8 方向枚举全覆盖', () => {
      const directions = [
        'above',
        'below',
        'left',
        'right',
        'above-left',
        'above-right',
        'below-left',
        'below-right',
      ] as const;
      for (const direction of directions) {
        const ir: IR = {
          version: CURRENT_IR_VERSION,
          type: 'scene',
          children: [
            { type: 'node', id: 'A', position: [0, 0], text: 'A' },
            {
              type: 'node',
              id: 'B',
              position: { direction, of: 'A' },
              text: 'B',
            },
          ],
        };
        expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
      }
    });

    it('round-trips OffsetPosition Node：{ of, offset }（of 字符串 / 笛卡尔 / 嵌套 polar）', () => {
      // of = 字符串
      const irString: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [30, 10] },
            text: 'B',
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irString))).toEqual(irString);

      // of = 笛卡尔
      const irCartesian: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'C',
            position: { of: [50, 50], offset: [10, 0] },
            text: 'C',
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irCartesian))).toEqual(irCartesian);

      // of = 嵌套 polar
      const irPolar: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'D',
            position: {
              of: { origin: 'A', angle: 30, radius: 50 },
              offset: [0, 5],
            },
            text: 'D',
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irPolar))).toEqual(irPolar);
    });

    it('round-trips OffsetPosition Step.to：path 内 step 用 { of, offset }', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A' } },
              { type: 'step', kind: 'line', to: { of: 'A', offset: [50, 0] } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips arrowDetail 顶层 + start / end 子对象 merge', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            arrow: '<->',
            arrowDetail: {
              shape: 'stealth',
              color: '#1f2937',
              opacity: 0.7,
              start: { shape: 'open', color: '#dc2626' },
              end: { scale: 1.5, fill: '#fde68a' },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it.each([
      'at-start',
      'very-near-start',
      'near-start',
      'midway',
      'near-end',
      'very-near-end',
      'at-end',
    ] as const)("round-trips StepLabel.position keyword '%s'", position => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'line',
                to: [100, 0],
                label: { text: 'L', position },
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it.each([0, 0.25, 0.5, 0.75, 1])(
      'round-trips StepLabel.position 数值 t = %s',
      position => {
        const ir: IR = {
          version: CURRENT_IR_VERSION,
          type: 'scene',
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                {
                  type: 'step',
                  kind: 'line',
                  to: [100, 0],
                  label: { text: 'L', position },
                },
              ],
            },
          ],
        };
        expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
      },
    );

    it('round-trips IRTarget `relative` / `relativeAccumulate`（alpha.5 字段去缩写）', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { relative: [10, 0] } },
              { type: 'step', kind: 'line', to: { relativeAccumulate: [5, 5] } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips IRScope：仅 children（无 id / transforms / localNamespace）', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'scope',
            children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips IRScope：含 id / localNamespace / 6 种 transform 变体复合', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'hub', position: [10, 0], text: 'H' },
          {
            type: 'scope',
            id: 'cluster',
            localNamespace: true,
            transforms: [
              { kind: 'translate', x: 5, y: 5 },
              { kind: 'polar-translate', origin: 'hub', angle: 30, radius: 20 },
              { kind: 'at-translate', direction: 'right', of: 'hub', distance: 10 },
              { kind: 'offset-translate', of: 'hub', offset: [3, 0] },
              { kind: 'rotate', degrees: 45, cx: 1, cy: 2 },
              { kind: 'scale', x: 2, y: 1.5 },
            ],
            children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips 嵌套 IRScope', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 50, y: 0 }],
            children: [
              {
                type: 'scope',
                transforms: [{ kind: 'rotate', degrees: 90 }],
                children: [
                  { type: 'node', id: 'inner', position: [0, 0], text: 'I' },
                ],
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips IRScope 含 path 子节点', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 10, y: 0 }],
            children: [
              { type: 'node', id: 'A', position: [0, 0], text: 'A' },
              { type: 'node', id: 'B', position: [30, 0], text: 'B' },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: { id: 'A' } },
                  { type: 'step', kind: 'line', to: { id: 'B' } },
                ],
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips IRScope 样式继承字段（alpha.2）：级联 + 四通道 + resetStyle + node/path color + step label 样式', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'scope',
            color: 'blue',
            stroke: 'red',
            strokeWidth: 2,
            opacity: 0.8,
            nodeDefault: { shape: 'circle', fill: 'lightblue', font: { size: 12 } },
            pathDefault: { stroke: 'green', dashPattern: [4, 2] },
            labelDefault: { textColor: 'gray', font: { size: 10 } },
            arrowDefault: { shape: 'stealth', scale: 1.5 },
            resetStyle: ['label', 'arrow'],
            children: [
              { type: 'node', id: 'A', position: [0, 0], text: 'A', color: 'navy' },
              {
                type: 'path',
                color: 'crimson',
                children: [
                  { type: 'step', kind: 'move', to: { id: 'A' } },
                  {
                    type: 'step',
                    kind: 'line',
                    to: [40, 0],
                    label: { text: 'e', textColor: 'orange', opacity: 0.6, font: { size: 9 } },
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips Coordinate 占位节点（alpha.4 ADR-02）', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'coordinate', id: 'pivot', position: [50, 50] },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'pivot' } },
              { type: 'step', kind: 'line', to: [100, 50] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips Node.label 单对象 + 数组形态（alpha.4 ADR-03）', () => {
      // 单对象
      const irSingle: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'tag', position: 'above', distance: 5 },
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irSingle))).toEqual(irSingle);

      // 数组形态：多 label
      const irArray: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'B',
            position: [0, 0],
            text: 'B',
            label: [
              { text: 'top', position: 'above' },
              { text: 'right', position: 'right', textColor: '#666' },
              { text: '30°', position: 30 },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irArray))).toEqual(irArray);
    });
  });

  describe('能力补全阶段（alpha.7–9）新增形态 round-trip', () => {
    it('round-trips Node fill PaintSpec：linearGradient / radialGradient / pattern / image', () => {
      const fills = [
        { kind: 'linearGradient' as const, angle: 90, stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#fff' }] },
        { kind: 'radialGradient' as const, stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#d33' }] },
        { kind: 'pattern' as const, shape: 'lines', color: '#08f', size: 8, rotation: 45 },
        { kind: 'image' as const, href: 'a.png', fit: 'cover' as const },
      ];
      for (const fill of fills) {
        const ir: IR = {
          version: CURRENT_IR_VERSION,
          type: 'scene',
          children: [{ type: 'node', id: 'A', position: [0, 0], shape: 'rectangle', fill }],
        };
        expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
      }
    });

    it('round-trips Node maxTextWidth + label.pin（true / 对象样式）', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'long text wraps',
            maxTextWidth: 60,
            label: [
              { text: 'p1', pin: true },
              { text: 'p2', position: 'right', pin: { stroke: 'red', strokeWidth: 2, dashPattern: [2, 2] } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips Scope.clip：circle / rect / ellipse / polygon', () => {
      const clips = [
        { kind: 'circle' as const, cx: 0, cy: 0, r: 80 },
        { kind: 'rect' as const, x: -10, y: -10, width: 40, height: 30 },
        { kind: 'ellipse' as const, cx: 0, cy: 0, rx: 30, ry: 20 },
        { kind: 'polygon' as const, points: [[0, 0], [40, 0], [20, 40]] as Array<[number, number]> },
      ];
      for (const clip of clips) {
        const ir: IR = {
          version: CURRENT_IR_VERSION,
          type: 'scene',
          children: [{ type: 'scope', clip, children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }] }],
        };
        expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
      }
    });

    it('round-trips between 定位：Node.position / Coordinate.position / Step.to', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [-50, 0], text: 'A' },
          { type: 'node', id: 'B', position: [50, 0], text: 'B' },
          { type: 'node', id: 'mid', position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 }, text: 'm' },
          { type: 'coordinate', id: 'q', position: { between: [[0, 0], [90, 0]], t: 0.333 } },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 100] },
              { type: 'step', kind: 'line', to: { between: [{ id: 'A' }, { id: 'B' }], t: 0.25 } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips Path rotate / scale（等比 + 非等比）/ marks', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            rotate: 30,
            scale: { x: 2, y: 1.5 },
            marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth', scale: 1.2 } }],
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
          {
            type: 'path',
            scale: 2,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips bend out/in/looseness（asymmetric / self-loop）', () => {
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'bend', to: [100, 0], outAngle: 30, inAngle: 150, looseness: 1.2 },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('generator step 无 React DSL 表示（IR-only）：convertIRToReactNode 明确抛错', () => {
      // generator 是 IR 级能力（经 <Layout ir={...}> 用），暂无 <Step kind="generator"> JSX sugar；
      // IR→JSX 反构对它 fail-loud（加 React DSL 属新功能，留待后续 alpha）。
      const ir: IR = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'generator', name: 'parabola', params: { bend: [5, 5], samples: 20 } },
            ],
          },
        ],
      };
      expect(() => convertIRToReactNode(ir)).toThrow(/generator step has no React DSL/);
    });
  });

  it('未知 child.type → 抛 "unknown IR child type" 错误', () => {
    const badIR = {
      version: CURRENT_IR_VERSION,
      type: 'scene' as const,
      children: [{ type: 'bogus' } as unknown as IRChild],
    };
    expect(() => convertIRToReactNode(badIR)).toThrow(/convertIRToReactNode: unknown IR child type/);
  });
});
