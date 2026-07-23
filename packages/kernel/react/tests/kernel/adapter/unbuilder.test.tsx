import type { IRChild, IRPathBase, IRScene } from '@retikz/core';
import type { ReactElement } from 'react';

import { CompositeBaseSchema, CURRENT_IR_VERSION, defineComposite, lowerIRToKernel } from '@retikz/core';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildIR } from '../../../src/kernel/adapter';
import { convertIRToReactNode } from '../../../src/kernel/adapter';
import { TIKZ_NODE, TIKZ_PATH, TIKZ_STEP } from '../../../src/kernel/protocol';
import { Draw } from '../../../src/sugar';

const emptyScene: IRScene = {
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: [],
};

const PanelSchema = CompositeBaseSchema.extend({
  namespace: z.literal('demo'),
  type: z.literal('panel'),
  id: z.string(),
});

/** demo.panel → 同 id 的 Tier 1 node */
const panelComposite = defineComposite({
  namespace: 'demo',
  type: 'panel',
  schema: PanelSchema,
  expand: panel => ({ type: 'node', id: panel.id, position: [0, 0], text: panel.id }),
});

/** demo.path → 带 steps 的 Tier 1 path */
const pathComposite = defineComposite({
  namespace: 'demo',
  type: 'path',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('demo'), type: z.literal('path') }),
  expand: () => ({
    type: 'path',
    stroke: '#123456',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 20] },
    ],
  }),
});

/** demo.loop → 自身，用于深度错误透传 */
const loopComposite = defineComposite({
  namespace: 'demo',
  type: 'loop',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('demo'), type: z.literal('loop') }),
  expand: () => ({ namespace: 'demo', type: 'loop' }),
});

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
    const ir: IRScene = {
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

  it('Node anchor-to-anchor position 往返保持原结构', () => {
    const position = {
      kind: 'anchor' as const,
      target: { id: 'A', anchor: 'bottom-left' as const, offset: [6, -2] as [number, number] },
      selfAnchor: 'top-left' as const,
    };
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ type: 'node', id: 'B', position }],
    };

    const [element] = toElements(convertIRToReactNode(ir));
    expect(element.props.position).toEqual(position);
    expect(buildIR(element)).toEqual(ir);
  });

  it('IR Node 上 undefined 字段不写进 element props', () => {
    const ir: IRScene = {
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
    const ir: IRScene = {
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
    const ir: IRScene = {
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

  it('Ribbon round-trip：IR → React → IR 等价', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          ribbon: {
            start: { width: 8, direction: 0 },
            end: { width: 2, direction: [1, 0] },
            samples: true,
          },
          fill: 'steelblue',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const [ribbonEl] = toElements(convertIRToReactNode(ir));
    expect((ribbonEl.type as { displayName?: string }).displayName).toBe(TIKZ_PATH);
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  it('Boundary Ribbon round-trip：IR → React → IR 等价', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          fill: '#bfdbfe',
          ribbon: {
            mode: 'boundary',
            upper: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
            lower: [
              { type: 'step', kind: 'move', to: [0, 4] },
              { type: 'step', kind: 'line', to: [10, 4] },
            ],
          },
        },
      ],
    };
    const [ribbonEl] = toElements(convertIRToReactNode(ir));
    expect((ribbonEl.type as { displayName?: string }).displayName).toBe(TIKZ_PATH);
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
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
    const ir: IRScene = {
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

  it('Path fill / fillRule round-trip', () => {
    const ir: IRScene = {
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
    const ir: IRScene = {
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

  it('Node shape round-trip：4 种 shape 字段透传保留', () => {
    for (const shape of ['rectangle', 'circle', 'ellipse', 'diamond'] as const) {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [{ type: 'node', id: 'A', shape, position: [0, 0], text: 'A' }],
      };
      const back = buildIR(convertIRToReactNode(ir));
      expect(back).toEqual(ir);
    }
  });

  it("path-level arrow round-trip：'->'/'<-'/'<->' 字段透传保留", () => {
    const cases: Array<NonNullable<IRPathBase['marks']>> = [
      [{ pos: 1, mark: { kind: 'arrow' } }],
      [{ pos: 0, mark: { kind: 'arrow' } }],
      [
        { pos: 0, mark: { kind: 'arrow' } },
        { pos: 1, mark: { kind: 'arrow' } },
      ],
    ];
    for (const marks of cases) {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            marks,
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

  it('cycle step round-trip：无 to / via 字段保留', () => {
    const ir: IRScene = {
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
    const ir: IRScene = {
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
    const ir: IRScene = {
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
    const irWithAngle: IRScene = {
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

    const irNoAngle: IRScene = {
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

  it('arc step round-trip：startAngle / endAngle / radius 透传保留', () => {
    const ir: IRScene = {
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

  it('circlePath step round-trip：radius 透传保留', () => {
    const ir: IRScene = {
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

  it('ellipsePath step round-trip：radius object 透传保留', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radius: { x: 8, y: 4 } },
          ],
        },
      ],
    };
    expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
  });

  describe('step.label round-trip', () => {
    it('line + label round-trip 完整保留 text/position/side', () => {
      const ir: IRScene = {
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
                label: { text: 'x', position: 'near-end', sloped: true },
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('八种带 label 的 kind 全部 round-trip', () => {
      const ir: IRScene = {
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
              { type: 'step', kind: 'ellipsePath', radius: { x: 6, y: 3 }, label: { text: 'E' } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('IR 中没有 label 字段时 round-trip 不会凭空多出 label', () => {
      const ir: IRScene = {
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

  describe('path 级视觉属性 round-trip', () => {
    it('lineCap / lineJoin 双向保留', () => {
      const ir: IRScene = {
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

    it('strokeWidth 数值双向保留', () => {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            strokeWidth: 3,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('opacity / fillOpacity / strokeOpacity 三件双向保留', () => {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            fill: 'red',
            opacity: 0.8,
            fillOpacity: 0.4,
            strokeOpacity: 0.6,
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

  describe('扩展形态 round-trip', () => {
    it('round-trips AtPosition Node：{ direction, of, distance }', () => {
      const ir: IRScene = {
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
        'top',
        'bottom',
        'left',
        'right',
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ] as const;
      for (const direction of directions) {
        const ir: IRScene = {
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
      const irString: IRScene = {
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
      const irCartesian: IRScene = {
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
      const irPolar: IRScene = {
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
      const ir: IRScene = {
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
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            marks: [
              {
                pos: 0,
                mark: { kind: 'arrow', shape: 'open', color: '#dc2626', opacity: 0.7 },
              },
              {
                pos: 1,
                mark: { kind: 'arrow', shape: 'stealth', color: '#1f2937', opacity: 0.7, scale: 1.5, fill: '#fde68a' },
              },
            ],
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it.each(['at-start', 'very-near-start', 'near-start', 'midway', 'near-end', 'very-near-end', 'at-end'] as const)(
      "round-trips StepLabel.position keyword '%s'",
      position => {
        const ir: IRScene = {
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

    it.each([0, 0.25, 0.5, 0.75, 1])('round-trips StepLabel.position 数值 t = %s', position => {
      const ir: IRScene = {
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

    it('round-trips IRTarget `relative` / `relativeAccumulate`', () => {
      const ir: IRScene = {
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
      const ir: IRScene = {
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

    it('round-trips IRScope：含 placement / pivot / id / localNamespace 的 transform 复合', () => {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'hub', position: [10, 0], text: 'H' },
          {
            type: 'scope',
            id: 'cluster',
            localNamespace: true,
            placement: {
              target: { id: 'hub', anchor: 'top-right', offset: [4, -2] },
              selfAnchor: 'top-left',
            },
            transforms: [
              { kind: 'translate', x: 5, y: 5 },
              { kind: 'polar-translate', origin: 'hub', angle: 30, radius: 20 },
              { kind: 'at-translate', direction: 'right', of: 'hub', distance: 10 },
              { kind: 'offset-translate', of: 'hub', offset: [3, 0] },
              { kind: 'rotate', degrees: 45, pivot: [1, 2] },
              { kind: 'scale', x: 2, y: 1.5, pivot: 'center' },
            ],
            children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips 嵌套 IRScope', () => {
      const ir: IRScene = {
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
                children: [{ type: 'node', id: 'inner', position: [0, 0], text: 'I' }],
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips IRScope 含 path 子节点', () => {
      const ir: IRScene = {
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

    it('round-trips IRScope 样式继承字段：级联 + 四通道 + resetStyle + node/path color + step label 样式', () => {
      const ir: IRScene = {
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

    it('round-trips Coordinate 占位节点', () => {
      const ir: IRScene = {
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

    it('round-trips Node.label 单对象 + 数组形态', () => {
      // 单对象
      const irSingle: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'tag', position: 'top', distance: 5 },
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irSingle))).toEqual(irSingle);

      // 数组形态：多 label
      const irArray: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'B',
            position: [0, 0],
            text: 'B',
            label: [
              { text: 'top', position: 'top' },
              { text: 'right', position: 'right', textColor: '#666' },
              { text: '30°', position: 30 },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(irArray))).toEqual(irArray);
    });
  });

  describe('补充能力新增形态 round-trip', () => {
    it('round-trips Node fill PaintSpec：linearGradient / radialGradient / pattern / image', () => {
      const fills = [
        {
          kind: 'linearGradient' as const,
          angle: 90,
          stops: [
            { offset: 0, color: '#000' },
            { offset: 1, color: '#fff' },
          ],
        },
        {
          kind: 'radialGradient' as const,
          stops: [
            { offset: 0, color: '#fff' },
            { offset: 1, color: '#d33' },
          ],
        },
        { kind: 'pattern' as const, shape: 'lines', color: '#08f', size: 8, rotation: 45 },
        { kind: 'image' as const, href: 'a.png', fit: 'cover' as const },
      ];
      for (const fill of fills) {
        const ir: IRScene = {
          version: CURRENT_IR_VERSION,
          type: 'scene',
          children: [{ type: 'node', id: 'A', position: [0, 0], shape: 'rectangle', fill }],
        };
        expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
      }
    });

    it('round-trips Node maxTextWidth + label.pin（true / 对象样式）', () => {
      const ir: IRScene = {
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
        {
          kind: 'polygon' as const,
          points: [
            [0, 0],
            [40, 0],
            [20, 40],
          ] as Array<[number, number]>,
        },
      ];
      for (const clip of clips) {
        const ir: IRScene = {
          version: CURRENT_IR_VERSION,
          type: 'scene',
          children: [{ type: 'scope', clip, children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }] }],
        };
        expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
      }
    });

    it('round-trips between 定位：Node.position / Coordinate.position / Step.to', () => {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [-50, 0], text: 'A' },
          { type: 'node', id: 'B', position: [50, 0], text: 'B' },
          { type: 'node', id: 'mid', position: { between: [{ id: 'A' }, { id: 'B' }], fraction: 0.5 }, text: 'm' },
          {
            type: 'coordinate',
            id: 'q',
            position: {
              between: [
                [0, 0],
                [90, 0],
              ],
              fraction: 0.333,
            },
          },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 100] },
              { type: 'step', kind: 'line', to: { between: [{ id: 'A' }, { id: 'B' }], fraction: 0.25 } },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
    });

    it('round-trips Path rotate / scale（等比 + 非等比）/ marks', () => {
      const ir: IRScene = {
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
      const ir: IRScene = {
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

    it('round-trips generator step：name / to / params / label', () => {
      const ir: IRScene = {
        version: CURRENT_IR_VERSION,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'generator',
                name: 'parabola',
                to: [160, 0],
                params: { control: [80, -70] },
                label: { text: 'p', position: 'near-end' },
              },
            ],
          },
        ],
      };
      expect(buildIR(convertIRToReactNode(ir))).toEqual(ir);
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

  it('Tier 2 composite 经 definitions lowering 后生成等价 Kernel JSX', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 'panel-a' }],
    };
    const options = { composites: [panelComposite] };

    expect(buildIR(convertIRToReactNode(ir, options))).toEqual(lowerIRToKernel(ir, options));
  });

  it('scope 内 composite lowering 后保留 scope 与 path children', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'scope',
          id: 'group',
          color: '#abcdef',
          children: [{ namespace: 'demo', type: 'path' }],
        },
      ],
    };
    const options = { composites: [pathComposite] };

    expect(buildIR(convertIRToReactNode(ir, options))).toEqual(lowerIRToKernel(ir, options));
  });

  it('缺失 composite definition 时错误保留 key 与 IR path', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 'missing' }],
    };

    expect(() => convertIRToReactNode(ir)).toThrow(/^convertIRToReactNode:.*demo\.panel.*children\[0\]/);
  });

  it('invalid composite payload 错误保留 provider 与 path', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 123 as unknown as string }],
    };

    expect(() => convertIRToReactNode(ir, { composites: [panelComposite] })).toThrow(
      /^convertIRToReactNode:.*demo\.panel.*children\[0\]/,
    );
  });

  it('composite depth 错误经 unbuilder 前缀包装且不产生部分 JSX', () => {
    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'loop' }],
    };

    expect(() => convertIRToReactNode(ir, { composites: [loopComposite], maxCompositeDepth: 1 })).toThrow(
      /^convertIRToReactNode:.*COMPOSITE_NEST_TOO_DEEP/,
    );
  });
});
