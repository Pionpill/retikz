import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { GroupPrim, PathPrim, RectPrim, ScenePrimitive, TextPrim } from '@retikz/core';
import { renderPrim } from '../../src/render/renderPrim';

/** 测试在 node env 跑，不实际挂载——只检查返回的 React element 类型 / props 是否正确 */
type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

describe('renderPrim: rect', () => {
  const base: RectPrim = {
    type: 'rect',
    x: 1,
    y: 2,
    width: 30,
    height: 20,
    fill: '#fff',
    stroke: '#000',
    strokeWidth: 1.5,
  };

  it('rect prim → <rect> element，几何 / 样式字段透传', () => {
    const el = renderPrim(base, 0) as AnyEl;
    expect(el.type).toBe('rect');
    expect(el.props).toMatchObject({ x: 1, y: 2, width: 30, height: 20, fill: '#fff', stroke: '#000', strokeWidth: 1.5 });
  });

  it('cornerRadius → rx / ry 双向写入（SVG 圆角）', () => {
    const el = renderPrim({ ...base, cornerRadius: 6 }, 0) as AnyEl;
    expect(el.props.rx).toBe(6);
    expect(el.props.ry).toBe(6);
  });
});

describe('renderPrim: ellipse', () => {
  it('rotate 缺省时 transform=undefined（避免冗余属性）', () => {
    const el = renderPrim(
      { type: 'ellipse', cx: 0, cy: 0, rx: 10, ry: 5 },
      0,
    ) as AnyEl;
    expect(el.type).toBe('ellipse');
    expect(el.props.transform).toBeUndefined();
  });

  it('rotate 存在时 transform=`rotate(deg cx cy)`，围绕椭圆中心旋转', () => {
    const el = renderPrim(
      { type: 'ellipse', cx: 50, cy: 30, rx: 10, ry: 5, rotate: 45 },
      0,
    ) as AnyEl;
    expect(el.props.transform).toBe('rotate(45 50 30)');
  });
});

describe('renderPrim: path', () => {
  const base: PathPrim = {
    type: 'path',
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 10] },
    ],
    stroke: '#000',
    strokeWidth: 1,
  };

  it('path prim → <path> element，d 字符串由 commands 构造、stroke 透传', () => {
    const el = renderPrim(base, 0) as AnyEl;
    expect(el.type).toBe('path');
    expect(el.props).toMatchObject({ d: 'M 0 0 L 10 10', stroke: '#000' });
    expect(el.props.markerStart).toBeUndefined();
    expect(el.props.markerEnd).toBeUndefined();
  });

  it('arrowStart / arrowEnd 通过 ctx.arrowMarkerIdFor 映射为 url(#id)', () => {
    const el = renderPrim(
      { ...base, arrowStart: 'normal', arrowEnd: 'stealth' },
      0,
      { arrowMarkerIdFor: shape => `mk-${shape}` },
    ) as AnyEl;
    expect(el.props.markerStart).toBe('url(#mk-normal)');
    expect(el.props.markerEnd).toBe('url(#mk-stealth)');
  });

  it('有 arrowEnd 但 ctx 未提供 arrowMarkerIdFor → markerEnd 静默 undefined', () => {
    const el = renderPrim({ ...base, arrowEnd: 'normal' }, 0) as AnyEl;
    expect(el.props.markerEnd).toBeUndefined();
  });
});

describe('renderPrim: text', () => {
  const base: TextPrim = {
    type: 'text',
    x: 0,
    y: 0,
    fontSize: 14,
    align: 'middle',
    baseline: 'middle',
    lineHeight: 16,
    lines: [{ text: 'L1' }, { text: 'L2' }, { text: 'L3' }],
    measuredWidth: 0,
    measuredHeight: 0,
  };

  it('baseline=middle 的 3 行块：首行 dy = -(n-1)/2 × lineHeight 让整块在 y 居中', () => {
    const el = renderPrim(base, 0) as AnyEl;
    const tspans = (el.props.children as Array<AnyEl>);
    expect(tspans).toHaveLength(3);
    expect(tspans[0].props.dy).toBe(-16); // -(3-1)/2 × 16 = -16
    expect(tspans[1].props.dy).toBe(16);
    expect(tspans[2].props.dy).toBe(16);
  });

  it('baseline=top：首行 dy=0（块顶对齐）', () => {
    const el = renderPrim({ ...base, baseline: 'top' }, 0) as AnyEl;
    const tspans = el.props.children as Array<AnyEl>;
    expect(tspans[0].props.dy).toBe(0);
  });

  it('baseline=bottom：首行 dy = -(n-1) × lineHeight（块底对齐）', () => {
    const el = renderPrim({ ...base, baseline: 'bottom' }, 0) as AnyEl;
    const tspans = el.props.children as Array<AnyEl>;
    expect(tspans[0].props.dy).toBe(-32); // -(3-1) × 16
  });

  it('align→textAnchor 同名收窄；dominantBaseline 按 baseline 枚举映射', () => {
    const el = renderPrim({ ...base, align: 'start', baseline: 'top' }, 0) as AnyEl;
    expect(el.props.textAnchor).toBe('start');
    expect(el.props.dominantBaseline).toBe('text-before-edge');
    const el2 = renderPrim({ ...base, align: 'end', baseline: 'alphabetic' }, 0) as AnyEl;
    expect(el2.props.textAnchor).toBe('end');
    expect(el2.props.dominantBaseline).toBe('alphabetic');
  });

  it('单行文本：dy 仍按公式算（n=1 → middle 也是 0；-0 与 0 同等接受）', () => {
    const el = renderPrim({ ...base, lines: [{ text: 'only' }] }, 0) as AnyEl;
    const tspans = el.props.children as Array<AnyEl>;
    expect(tspans).toHaveLength(1);
    // 公式 (-(1-1) / 2) × 16 计算结果是 -0，对 SVG 而言与 0 等价
    expect(Math.abs(tspans[0].props.dy as number)).toBe(0);
  });
});

describe('renderPrim: group', () => {
  it('group prim → <g transform=...>，children 递归 renderPrim', () => {
    const group: GroupPrim = {
      type: 'group',
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      children: [
        { type: 'rect', x: 0, y: 0, width: 5, height: 5 },
        { type: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 2 },
      ],
    };
    const el = renderPrim(group, 0) as AnyEl;
    expect(el.type).toBe('g');
    expect(el.props.transform).toBe('translate(10 20)');
    const kids = el.props.children as Array<AnyEl>;
    expect(kids).toHaveLength(2);
    expect(kids[0].type).toBe('rect');
    expect(kids[1].type).toBe('ellipse');
  });

  it('group 内嵌套 group：renderPrim 递归正确', () => {
    const nested: ScenePrimitive = {
      type: 'group',
      transforms: [{ kind: 'translate', x: 0, y: 0 }],
      children: [
        {
          type: 'group',
          transforms: [{ kind: 'translate', x: 1, y: 1 }],
          children: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1 }],
        },
      ],
    };
    const el = renderPrim(nested, 0) as AnyEl;
    const inner = (el.props.children as Array<AnyEl>)[0];
    expect(inner.type).toBe('g');
    expect(inner.props.transform).toBe('translate(1 1)');
    expect((inner.props.children as Array<AnyEl>)[0].type).toBe('rect');
  });

  it('group transforms 缺省 / 空数组 → transform 属性 undefined', () => {
    const group: GroupPrim = {
      type: 'group',
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5 }],
    };
    const el = renderPrim(group, 0) as AnyEl;
    expect(el.props.transform).toBeUndefined();
  });
});
