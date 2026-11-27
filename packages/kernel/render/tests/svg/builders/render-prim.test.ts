import type {
  GroupPrimitive,
  PathPrimitive,
  RectPrimitive,
  CompiledArrowEnd,
  ScenePrimitive,
  TextPrimitive,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { SvgNode } from '../../../src/svg';
import { buildPrim } from '../../../src/svg';

/** 验证原生 SVG 描述树的标签和属性 */

/** 构造一个已解析 CompiledArrowEnd（emit-in-compile 后的 PathPrimitive.arrowStart / arrowEnd 形态） */
const resolvedSpec = (shape: string): CompiledArrowEnd => ({
  shape,
  baseSize: 10,
  refX: 0,
  markerWidth: 6,
  markerHeight: 6,
  marker: [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
});

describe('buildPrim：矩形', () => {
  const base: RectPrimitive = {
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
    const el = buildPrim(base);

    expect(el.tag).toBe('rect');
    expect(el.attrs).toMatchObject({
      x: 1,
      y: 2,
      width: 30,
      height: 20,
      fill: '#fff',
      stroke: '#000',
      'stroke-width': 1.5,
    });
  });

  it('cornerRadius → rx / ry 双向写入（SVG 圆角）', () => {
    const el = buildPrim({ ...base, cornerRadius: 6 });

    expect(el.attrs.rx).toBe(6);
    expect(el.attrs.ry).toBe(6);
  });
});

describe('buildPrim：椭圆', () => {
  it('rotate 缺省时 transform=undefined（避免冗余属性）', () => {
    const el = buildPrim({ type: 'ellipse', cx: 0, cy: 0, rx: 10, ry: 5 });

    expect(el.tag).toBe('ellipse');
    expect(el.attrs.transform).toBeUndefined();
  });

  it('rotate 存在时 transform=`rotate(deg cx cy)`，围绕椭圆中心旋转', () => {
    const el = buildPrim({ type: 'ellipse', cx: 50, cy: 30, rx: 10, ry: 5, rotate: 45 });

    expect(el.attrs.transform).toBe('rotate(45 50 30)');
  });
});

describe('buildPrim：路径', () => {
  const base: PathPrimitive = {
    type: 'path',
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 10] },
    ],
    stroke: '#000',
    strokeWidth: 1,
  };

  it('path prim → <path> element，d 字符串由 commands 构造、stroke 透传', () => {
    const el = buildPrim(base);

    expect(el.tag).toBe('path');
    expect(el.attrs).toMatchObject({ d: 'M 0 0 L 10 10', stroke: '#000' });
    expect(el.attrs['marker-start']).toBeUndefined();
    expect(el.attrs['marker-end']).toBeUndefined();
  });

  it('arrowStart / arrowEnd 通过 ctx.arrowMarkerIdFor 映射为 url(#id)', () => {
    const el = buildPrim(
      { ...base, arrowStart: resolvedSpec('normal'), arrowEnd: resolvedSpec('stealth') },
      {
        arrowMarkerIdFor: spec => `mk-${spec.shape}`,
      },
    );

    expect(el.attrs['marker-start']).toBe('url(#mk-normal)');
    expect(el.attrs['marker-end']).toBe('url(#mk-stealth)');
  });

  it('有 arrowEnd 但 ctx 未提供 arrowMarkerIdFor → markerEnd 静默 undefined', () => {
    const el = buildPrim({ ...base, arrowEnd: resolvedSpec('normal') });

    expect(el.attrs['marker-end']).toBeUndefined();
  });
});

describe('buildPrim：文本', () => {
  const base: TextPrimitive = {
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
    const el = buildPrim(base);
    const tspans = el.children as Array<SvgNode>;

    expect(tspans).toHaveLength(3);
    expect(tspans[0].attrs.dy).toBe(-16); // -(3-1)/2 × 16 = -16
    expect(tspans[1].attrs.dy).toBe(16);
    expect(tspans[2].attrs.dy).toBe(16);
  });

  it('baseline=top：首行 dy=0（块顶对齐）', () => {
    const el = buildPrim({ ...base, baseline: 'top' });
    const tspans = el.children as Array<SvgNode>;

    expect(tspans[0].attrs.dy).toBe(0);
  });

  it('baseline=bottom：首行 dy = -(n-1) × lineHeight（块底对齐）', () => {
    const el = buildPrim({ ...base, baseline: 'bottom' });
    const tspans = el.children as Array<SvgNode>;

    expect(tspans[0].attrs.dy).toBe(-32); // -(3-1) × 16
  });

  it('align→textAnchor 同名收窄；dominantBaseline 按 baseline 枚举映射', () => {
    const el = buildPrim({ ...base, align: 'start', baseline: 'top' });

    expect(el.attrs['text-anchor']).toBe('start');
    expect(el.attrs['dominant-baseline']).toBe('text-before-edge');

    const el2 = buildPrim({ ...base, align: 'end', baseline: 'alphabetic' });

    expect(el2.attrs['text-anchor']).toBe('end');
    expect(el2.attrs['dominant-baseline']).toBe('alphabetic');
  });

  it('单行文本：dy 仍按公式算（n=1 → middle 也是 0；-0 与 0 同等接受）', () => {
    const el = buildPrim({ ...base, lines: [{ text: 'only' }] });
    const tspans = el.children as Array<SvgNode>;

    expect(tspans).toHaveLength(1);

    // 公式 (-(1-1) / 2) × 16 计算结果是 -0，对 SVG 而言与 0 等价
    expect(Math.abs(tspans[0].attrs.dy as number)).toBe(0);
  });
});

describe('buildPrim：组', () => {
  it('group prim → <g transform=...>，children 递归 buildPrim', () => {
    const group: GroupPrimitive = {
      type: 'group',
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      children: [
        { type: 'rect', x: 0, y: 0, width: 5, height: 5 },
        { type: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 2 },
      ],
    };
    const el = buildPrim(group);

    expect(el.tag).toBe('g');
    expect(el.attrs.transform).toBe('translate(10 20)');

    const kids = el.children as Array<SvgNode>;

    expect(kids).toHaveLength(2);
    expect(kids[0].tag).toBe('rect');
    expect(kids[1].tag).toBe('ellipse');
  });

  it('group 内嵌套 group：buildPrim 递归正确', () => {
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
    const el = buildPrim(nested);
    const inner = (el.children as Array<SvgNode>)[0];

    expect(inner.tag).toBe('g');
    expect(inner.attrs.transform).toBe('translate(1 1)');
    expect((inner.children as Array<SvgNode>)[0].tag).toBe('rect');
  });

  it('group transforms 缺省 / 空数组 → transform 属性 undefined', () => {
    const group: GroupPrimitive = {
      type: 'group',
      children: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5 }],
    };
    const el = buildPrim(group);

    expect(el.attrs.transform).toBeUndefined();
  });
});
