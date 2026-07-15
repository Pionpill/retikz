import type { IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

/**
 * Text mark / datum label 下沉契约测试。
 * priority-1 宿主 label（位置 mark 加 label → 填 datum Node.label，零新建 Node）、priority-2 兜底自由 TextMark
 * （新建带 text 的 core Node、与 point 同源投影）、text 内容 field/value/displayFormat、运行时 resolveLabel 逃生舱、
 * 内容缺失跳过、坐标系无关投影、color → textColor 分子 Scope、dx/dy 微调、pin 引线
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const WIDTH = 400;
const HEIGHT = 300;

const expandOf = (
  spec: IRPlotSpec,
  datasets: Datasets,
  options: LowerPlotsOptions = { width: WIDTH, height: HEIGHT },
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 收集 scope 树内所有 node */
const nodesOf = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 最小 cartesian2D interval spec：x = month (band)、y = revenue (linear)，可选 label */
const intervalSpec = (label?: Record<string, unknown>, id?: string): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'band', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'interval',
        ...(id !== undefined ? { id } : {}),
        ...(label !== undefined ? { label } : {}),
        encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
      },
    ],
    guides: [],
  });

/** 最小 cartesian2D text mark spec（priority-2 兜底自由文本） */
const textSpec = (encoding: Record<string, unknown>, extra: Record<string, unknown> = {}): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', ...extra, encoding: { x: { field: 'px' }, y: { field: 'py' }, ...encoding } }],
    guides: [],
  });

const BAR_ROWS: Datasets = {
  d: [
    { month: 'Jan', revenue: 1234.5 },
    { month: 'Feb', revenue: 980 },
  ],
};
const POINT_ROWS: Datasets = {
  d: [
    { px: 1, py: 2, label: 'A', cat: 'x' },
    { px: 3, py: 4, label: 'B', cat: 'y' },
  ],
};

describe('contract priority-1 宿主 label（填 datum Node.label）', () => {
  it('label-host-node：interval label → 每个 datum Node.label 被填上 NodeLabelSchema，不新建额外 Node', () => {
    const spec = intervalSpec({ content: { field: 'revenue' }, position: 'top', distance: 6 });
    const layer = expandOf(spec, BAR_ROWS);
    const nodes = nodesOf(layer);
    // 每行一个柱 Node（无额外 text Node）
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      expect(node.label).toBeDefined();
      const label = node.label as { text: string; position?: string; distance?: number };
      expect(label.position).toBe('top');
      expect(label.distance).toBe(6);
      expect(typeof label.text).toBe('string');
    }
    expect((nodes[0].label as { text: string }).text).toBe('1234.5');
    expect((nodes[1].label as { text: string }).text).toBe('980');
  });

  it('label-display-format：displayFormat 套在 field 上 → datum Node.label 文本为格式化串', () => {
    const spec = intervalSpec({ content: { field: 'revenue', displayFormat: ',.0f' } });
    const nodes = nodesOf(expandOf(spec, BAR_ROWS));
    expect((nodes[0].label as { text: string }).text).toBe('1,235');
    expect((nodes[1].label as { text: string }).text).toBe('980');
  });

  it('label-pin-leader：label.pin=true → 宿主 Node.label 带引线', () => {
    const spec = intervalSpec({ content: { value: 'X' }, pin: true });
    const nodes = nodesOf(expandOf(spec, BAR_ROWS));
    expect((nodes[0].label as { pin?: boolean }).pin).toBe(true);
  });

  it('label-value-constant：value → 所有 datum Node.label 同一常量串', () => {
    const spec = intervalSpec({ content: { value: 'TOP' } });
    const nodes = nodesOf(expandOf(spec, BAR_ROWS));
    expect((nodes[0].label as { text: string }).text).toBe('TOP');
    expect((nodes[1].label as { text: string }).text).toBe('TOP');
  });

  it('label-resolve-runtime：resolveLabel(row) 覆盖 field/displayFormat，且 IR 内不含函数', () => {
    const spec = intervalSpec({ content: { field: 'revenue', displayFormat: ',.0f' } }, 'bars');
    const layer = expandOf(spec, BAR_ROWS, {
      width: WIDTH,
      height: HEIGHT,
      resolveLabel: { bars: row => `${row.month}=${row.revenue}` },
    });
    const nodes = nodesOf(layer);
    expect((nodes[0].label as { text: string }).text).toBe('Jan=1234.5');
    // IR 序列化往返不变（不含函数）
    expect(() => JSON.stringify(layer)).not.toThrow();
    expect(JSON.stringify(layer)).not.toContain('function');
  });

  it('label-field-null-skip：label.content.field 解析 null 的行不挂 label（datum Node 仍在）', () => {
    const spec = intervalSpec({ content: { field: 'note' } });
    const layer = expandOf(spec, {
      d: [
        { month: 'Jan', revenue: 10, note: 'hi' },
        { month: 'Feb', revenue: 20 },
      ],
    });
    const nodes = nodesOf(layer);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].label).toBeDefined();
    expect(nodes[1].label).toBeUndefined();
  });
});

describe('contract priority-2 兜底自由 TextMark（新建带 text 的 Node）', () => {
  it('text-field-content：text={field} → 每行 Node.text = 字段值转串', () => {
    const nodes = nodesOf(expandOf(textSpec({ text: { field: 'label' } }), POINT_ROWS));
    expect(nodes).toHaveLength(2);
    expect(nodes[0].text).toBe('A');
    expect(nodes[1].text).toBe('B');
  });

  it('text-value-constant：text={value} → 所有行 Node.text 同一常量串', () => {
    const nodes = nodesOf(expandOf(textSpec({ text: { value: 'lbl' } }), POINT_ROWS));
    expect(nodes.map(n => n.text)).toEqual(['lbl', 'lbl']);
  });

  it('text-position-parity-with-point：同 x/y 的 TextMark 与 point 投影出的 Node.position 逐字节相等', () => {
    const textNodes = nodesOf(expandOf(textSpec({ text: { field: 'label' } }), POINT_ROWS));
    const pointSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' } } }],
      guides: [],
    });
    const pointNodes = nodesOf(expandOf(pointSpec, POINT_ROWS));
    expect(textNodes.map(n => n.position)).toEqual(pointNodes.map(n => n.position));
  });

  it('text-field-null-skip：text.field 解析 null 的行被跳过（不产 Node）', () => {
    const nodes = nodesOf(
      expandOf(textSpec({ text: { field: 'label' } }), {
        d: [
          { px: 1, py: 2, label: 'A' },
          { px: 3, py: 4 },
        ],
      }),
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0].text).toBe('A');
  });

  it('text-empty-rows：全跳过 → 该 text 图层不产（无 node）', () => {
    const layer = expandOf(textSpec({ text: { field: 'label' } }), { d: [{ px: 1, py: 2 }] });
    expect(nodesOf(layer)).toHaveLength(0);
  });

  it('text-dx-dy：dx/dy 微调 → Node.position 相对锚点偏移', () => {
    const base = nodesOf(expandOf(textSpec({ text: { field: 'label' } }), POINT_ROWS));
    const shifted = nodesOf(expandOf(textSpec({ text: { field: 'label' } }, { dx: 5, dy: -8 }), POINT_ROWS));
    const [bx, by] = base[0].position as [number, number];
    expect(shifted[0].position).toEqual([bx + 5, by - 8]);
  });

  it('text-color-grouped-scope：color 通道 → 文本色按色分子 Scope（textColor 落 nodeDefault，非 fill）', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'c' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          color: { kind: 'field', value: 'cat', scale: 'c' },
          encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label' } },
        },
      ],
      guides: [],
    });
    const layer = expandOf(spec, POINT_ROWS);
    // 子 Scope 的 nodeDefault 带 textColor、不带 fill
    const scopes: Array<{ nodeDefault?: Record<string, unknown> }> = [];
    const walk = (children: ReadonlyArray<unknown>): void => {
      for (const child of children) {
        const c = child as { type?: string; nodeDefault?: Record<string, unknown>; children?: ReadonlyArray<unknown> };
        if (c.type === 'scope') {
          if (c.nodeDefault) scopes.push(c);
          if (c.children) walk(c.children);
        }
      }
    };
    walk(layer.children);
    const withDefault = scopes.filter(s => s.nodeDefault !== undefined);
    expect(withDefault.length).toBeGreaterThanOrEqual(2);
    for (const s of withDefault) {
      expect(s.nodeDefault).toHaveProperty('textColor');
      expect(s.nodeDefault).toHaveProperty('fill', 'none');
      expect(s.nodeDefault).toHaveProperty('stroke', 'none');
      expect(s.nodeDefault).toHaveProperty('strokeWidth', 0);
    }
  });

  it('text-polar-projection：polar2D 下 text 经 projectRoles 投影（坐标系无关，不 fail-loud）', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label' } } }],
      guides: [],
    });
    const nodes = nodesOf(expandOf(spec, POINT_ROWS));
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      const [x, y] = node.position as [number, number];
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('text-resolve-runtime：resolveLabel(row) 覆盖 text.field（按 mark id 注入）', () => {
    const nodes = nodesOf(
      expandOf(textSpec({ text: { field: 'label' } }, { id: 't1' }), POINT_ROWS, {
        width: WIDTH,
        height: HEIGHT,
        resolveLabel: { t1: row => `<${row.label}>` },
      }),
    );
    expect(nodes[0].text).toBe('<A>');
    expect(nodes[1].text).toBe('<B>');
  });
});

describe('contract schema accept/reject', () => {
  it('text-channel-both-reject：text 通道同时设 field 与 value → refine 拒', () => {
    expect(() => textSpec({ text: { field: 'label', value: 'x' } })).toThrow();
  });

  it('text-channel-neither-reject：text 通道 field/value 都缺 → refine 拒', () => {
    expect(() => textSpec({ text: {} })).toThrow();
  });

  // 行为变更（mark 模型重构）：text 已并入 point —— 没有 text 通道的 point 是合法的散点 glyph（非 text Node），不再被拒。
  it('point-without-text-channel-accepted-as-glyph：无 text 通道的 point 合法且下沉为 glyph Node（非 text Node）', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' } } }],
      guides: [],
    });
    const nodes = nodesOf(expandOf(spec, POINT_ROWS));
    expect(nodes).toHaveLength(2);
    // glyph（散点）—— 不携带 text 内容
    expect(nodes.every(n => n.text === undefined)).toBe(true);
  });

  it('label-content-both-reject：宿主 label.content 同时设 field 与 value → refine 拒', () => {
    expect(() => intervalSpec({ content: { field: 'revenue', value: 'x' } })).toThrow();
  });
});
