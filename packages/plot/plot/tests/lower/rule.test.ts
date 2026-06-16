import type { IRNode, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema, type RuleMark } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';
import { lowerMark } from '../../src/lower/mark';
import { createCartesianFrame, createPolarFrame } from '../../src/lower/project';
import type { PositionScale } from '../../src/lower/scale';

/** core Path 的最小形态（鸭子类型断言端点；避免引入 core 内部 IRPath 类型耦合） */
type RulePath = { type: 'path'; children: Array<{ kind: string; to: [number, number] }>; pathDefault?: unknown };

/**
 * ADR-03（alpha.11）：rule mark（参考标注；line 下沉 core Path、band 复用 ADR-01 projectCell）下沉契约测试。
 * 验证 line 几何（满铺 / extent 截断 / per-datum / color）、band → projectCell 区域（rect / sector / 可连接）、
 * 取向 fail-loud、extent 单设 fail-loud、band 上界不匹配 fail-loud、坐标系矩阵 fail-loud、polar 径向线 / 常半径环、rule + bar z-order。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const WIDTH = 400;
const HEIGHT = 400;
const cartOpts: LowerPlotsOptions = { width: WIDTH, height: HEIGHT };

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 连续 linear PositionScale 桩（bandwidth = 0） */
const linearStub = (domain: [number, number], range: [number, number]): PositionScale => {
  let r: [number, number] = range;
  const [d0, d1] = domain;
  return {
    coordinate: (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? r[0] + ((value - d0) / (d1 - d0)) * (r[1] - r[0]) : NaN),
    get bandwidth() {
      return 0;
    },
    ticks: () => ({ values: [], labels: [] }),
    range: () => [r[0], r[1]],
    setRange: next => {
      r = [next[0], next[1]];
    },
  };
};

/** 收集图层内所有 path（线 rule） */
const pathsOf = (layer: IRScope): Array<RulePath> => {
  const out: Array<RulePath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as unknown as RulePath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 收集图层内所有 node（band rule） */
const nodesOf = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 取一条 path 的 [move 点, line 点]（move + 单 line step 的两端） */
const endpointsOf = (path: RulePath): [[number, number], [number, number]] => {
  const steps = path.children;
  const move = steps.find(s => s.kind === 'move')!;
  const lines = steps.filter(s => s.kind === 'line');
  return [move.to, lines[lines.length - 1].to];
};

/** cartesian2D 帧：x 域 [0,10]→像素 [0,400]，y 域 [0,100]→像素 [400,0]（y 倒置） */
const cartFrame = () => createCartesianFrame(linearStub([0, 10], [0, 400]), linearStub([0, 100], [400, 0]));

// ── happy path：cartesian line ──────────────────────────────────────────────────────────
describe('rule cartesian line 几何', () => {
  it('rule-horizontal-fullspan', () => {
    // y=80 水平 rule，跨满 x 域 [0,400]；y 像素 = 400 - 80/100*400 = 80
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 80 } } };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    const paths = pathsOf(layer);
    expect(paths).toHaveLength(1);
    const [a, b] = endpointsOf(paths[0]);
    expect(a).toEqual([0, 80]);
    expect(b).toEqual([400, 80]);
  });

  it('rule-vertical-fullspan', () => {
    // x=5 竖直 rule，跨满 y 域 [400,0]；x 像素 = 5/10*400 = 200
    const mark: RuleMark = { type: 'rule', encoding: { x: { value: 5 } } };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    const [a, b] = endpointsOf(pathsOf(layer)[0]);
    expect(a).toEqual([200, 400]);
    expect(b).toEqual([200, 0]);
  });

  it('rule-per-datum-field', () => {
    // 每行一条水平 rule（y=limit field）；3 行 → 3 条 path
    const mark: RuleMark = { type: 'rule', encoding: { y: { field: 'limit' } } };
    const rows = [{ limit: 20 }, { limit: 50 }, { limit: 90 }];
    const layer = lowerMark(mark, rows, cartFrame()) as IRScope;
    expect(pathsOf(layer)).toHaveLength(3);
  });

  it('rule-per-datum-color-field-grouped-stroke', () => {
    // color field → 按色分子 Scope 上提 stroke
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'limit', type: 'continuous' }, { name: 'cat', type: 'categorical' }] },
      coordinate: { type: 'cartesian2D', y: '__y' },
      scales: [
        { type: 'linear', name: '__y' },
        { type: 'ordinal', name: '__color' },
      ],
      marks: [{ type: 'rule', encoding: { y: { field: 'limit' }, color: { field: 'cat', scale: '__color' } } }],
    });
    const layer = expandOf(spec, { d: [{ limit: 20, cat: 'a' }, { limit: 50, cat: 'b' }, { limit: 90, cat: 'a' }] }, cartOpts).children[0] as IRScope;
    // 2 色 → 2 个分色子 Scope（各带 pathDefault.stroke）
    const colorScopes = (layer.children as Array<{ type?: string; pathDefault?: { stroke?: string } }>).filter(c => c.type === 'scope' && c.pathDefault?.stroke !== undefined);
    expect(colorScopes).toHaveLength(2);
    expect(pathsOf(layer)).toHaveLength(3);
  });

  it('rule-single-line-color-value', () => {
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 80 }, color: { value: 'crimson' } } };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    expect((layer.pathDefault as { stroke?: string }).stroke).toBe('crimson');
  });

  it('constant-rule-with-color-field-fail-loud', () => {
    // 常量 rule（单条 full-span）+ color 字段 = 一条线配 N 色，语义矛盾 → fail-loud（不静默塌成 row0 色）
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 80 }, color: { field: 'cat', scale: '__color' } } };
    expect(() => lowerMark(mark, [{ cat: 'a' }, { cat: 'b' }], cartFrame())).toThrow(/constant rule|color field/i);
  });
});

// ── happy path：cartesian band → projectCell rect ───────────────────────────────────────
describe('rule cartesian band 几何（projectCell rect）', () => {
  it('rule-band-cartesian-rect', () => {
    // 水平 band y∈[70,90]，跨满 x 域 → rect Node。y 像素：70→120、90→40 → 高 80、中心 80；x 满铺 [0,400] → 宽 400、中心 200
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 70 } }, yTo: 90 };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    const nodes = nodesOf(layer);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].minimumWidth).toBe(400);
    expect(nodes[0].minimumHeight).toBe(80);
    expect(nodes[0].position).toEqual([200, 80]);
  });

  it('rule-band-vertical-rect', () => {
    // 竖直 band x∈[2,5]，跨满 y 域 → rect。x 像素 80..200 → 宽 120、中心 140；y 满铺 [400,0] → 高 400、中心 200
    const mark: RuleMark = { type: 'rule', encoding: { x: { value: 2 } }, xTo: 5 };
    const nodes = nodesOf(lowerMark(mark, [{}], cartFrame()) as IRScope);
    expect(nodes[0].minimumWidth).toBe(120);
    expect(nodes[0].minimumHeight).toBe(400);
    expect(nodes[0].position).toEqual([140, 200]);
  });

  it('rule-band-per-datum-field', () => {
    // per-datum band y∈[lo,hi]，多行 → 每行一个 band Node
    const mark: RuleMark = { type: 'rule', encoding: { y: { field: 'lo' } }, yTo: 'hi' };
    const rows = [{ lo: 10, hi: 30 }, { lo: 60, hi: 80 }];
    const nodes = nodesOf(lowerMark(mark, rows, cartFrame()) as IRScope);
    expect(nodes).toHaveLength(2);
  });

  it('rule-band-color-value-fill', () => {
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 70 }, color: { value: 'amber' } }, yTo: 90 };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    expect((layer.nodeDefault as { fill?: string }).fill).toBe('amber');
  });

  it('rule-band-compiles-to-scene', () => {
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 70 } }, yTo: 90 };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] })).not.toThrow();
  });
});

// ── 边界：extent / 单行 / 空数据 ─────────────────────────────────────────────────────────
describe('rule 边界', () => {
  it('rule-extent-partial', () => {
    // 竖直 rule x=5，y 从 extent [20,60] 截断（非满铺）；y 像素 20→320、60→160
    const mark: RuleMark = { type: 'rule', extentField: 'lo', extentToField: 'hi', encoding: { x: { value: 5 } } };
    const layer = lowerMark(mark, [{ lo: 20, hi: 60 }], cartFrame()) as IRScope;
    const [a, b] = endpointsOf(pathsOf(layer)[0]);
    expect(a).toEqual([200, 320]);
    expect(b).toEqual([200, 160]);
  });

  it('rule-band-extent-partial', () => {
    // 水平 band y∈[70,90]，x 从 extent [2,8] 截断；x 像素 80..320 → 宽 240、中心 200
    const mark: RuleMark = { type: 'rule', extentField: 'a', extentToField: 'b', encoding: { y: { value: 70 } }, yTo: 90 };
    const nodes = nodesOf(lowerMark(mark, [{ a: 2, b: 8 }], cartFrame()) as IRScope);
    expect(nodes[0].minimumWidth).toBe(240);
    expect(nodes[0].position).toEqual([200, 80]);
  });

  it('rule-single-row', () => {
    const mark: RuleMark = { type: 'rule', encoding: { y: { field: 'v' } } };
    const layer = lowerMark(mark, [{ v: 42 }], cartFrame()) as IRScope;
    expect(pathsOf(layer)).toHaveLength(1);
  });

  it('rule-empty-rows-null', () => {
    const mark: RuleMark = { type: 'rule', encoding: { y: { field: 'v' } } };
    expect(lowerMark(mark, [], cartFrame())).toBeNull();
  });

  it('rule-nonfinite-extent-skipped', () => {
    const mark: RuleMark = { type: 'rule', extentField: 'lo', extentToField: 'hi', encoding: { x: { value: 5 } } };
    // 缺 extent 字段 → coordinate NaN → 跳过 → null
    expect(lowerMark(mark, [{}], cartFrame())).toBeNull();
  });
});

// ── 错误路径：取向 / extent / band 上界 / 坐标系矩阵 fail-loud ─────────────────────────────
describe('rule fail-loud', () => {
  it('rule-orientation-conflict-both', () => {
    const mark = { type: 'rule', encoding: { x: { value: 5 }, y: { value: 80 } } } as RuleMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/exactly one of encoding\.x|orientation|both/i);
  });

  it('rule-orientation-conflict-neither', () => {
    const mark = { type: 'rule', encoding: {} } as RuleMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/exactly one of encoding\.x|orientation|neither/i);
  });

  it('rule-extent-unpaired', () => {
    const mark = { type: 'rule', extentField: 'lo', encoding: { x: { value: 5 } } } as RuleMark;
    expect(() => lowerMark(mark, [{ lo: 1 }], cartFrame())).toThrow(/extentField|extentToField|together/i);
  });

  it('rule-band-bound-mismatch-x-with-yTo', () => {
    const mark = { type: 'rule', yTo: 90, encoding: { x: { value: 5 } } } as RuleMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/yTo|match the bound dimension|xTo/i);
  });

  it('rule-band-bound-mismatch-y-with-xTo', () => {
    const mark = { type: 'rule', xTo: 5, encoding: { y: { value: 80 } } } as RuleMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/xTo|match the bound dimension|yTo/i);
  });

  it('rule-coord-1d-fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian1D', x: '__x' },
      scales: [{ type: 'linear', name: '__x' }],
      marks: [{ type: 'rule', encoding: { x: { value: 5 } } }],
    });
    expect(() => expandOf(spec, { d: [{}] }, cartOpts)).toThrow(/cartesian1D|not supported|rule/i);
  });

  it('rule-coord-ternary-fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'ternary2D' },
      scales: [],
      marks: [{ type: 'rule', encoding: { x: { value: 5 } } }],
    });
    expect(() => expandOf(spec, { d: [{}] }, cartOpts)).toThrow(/ternary2D|not supported|rule/i);
  });
});

// ── 交互：polar line / band + z-order ────────────────────────────────────────────────────
describe('rule polar', () => {
  const polarFrame = (continuousAngle = true) =>
    createPolarFrame({
      center: [200, 200],
      innerRadius: 0,
      outerRadius: 150,
      startAngle: 0,
      endAngle: 360,
      continuousAngle,
      primary: linearStub([0, 360], [0, 360]),
      secondary: linearStub([0, 100], [0, 150]),
    });

  it('rule-polar-radial-line', () => {
    // 竖直 rule x=90（常量角度）→ 径向线 inner(r=0)→outer(r=150)，单 line step
    const mark: RuleMark = { type: 'rule', encoding: { x: { value: 90 } } };
    const layer = lowerMark(mark, [{}], polarFrame()) as IRScope;
    const paths = pathsOf(layer);
    expect(paths).toHaveLength(1);
    expect(paths[0].children.filter(s => s.kind === 'line')).toHaveLength(1);
  });

  it('rule-polar-constant-radius-ring', () => {
    // 水平 rule y=50（常量半径）→ 常半径环，沿角向 [0,360] 段采样（多 line step 弯成弧）
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 50 } } };
    const layer = lowerMark(mark, [{}], polarFrame(true)) as IRScope;
    expect(pathsOf(layer)[0].children.filter(s => s.kind === 'line').length).toBeGreaterThan(1);
  });

  it('rule-band-polar-ring-sector', () => {
    // 水平 band y∈[40,60]（半径区间）→ projectCell 环带 sector（innerRadius=coord(40)=60、outerRadius=coord(60)=90）
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 40 } }, yTo: 60 };
    const layer = lowerMark(mark, [{}], polarFrame()) as IRScope;
    const node = nodesOf(layer)[0];
    const shape = node.shape as { type: string; params: { innerRadius: number; outerRadius: number } };
    expect(shape.type).toBe('sector');
    expect(shape.params.innerRadius).toBeCloseTo(60, 6);
    expect(shape.params.outerRadius).toBeCloseTo(90, 6);
  });

  it('rule-band-polar-connectable', () => {
    // band sector Node 可被另一 core Path 指向式连接（守 §8.1，与 ADR-01 cell Node connectable 同断言）：
    //   line step 指向 Node id → compile 自动 clip 到边界、不抛
    const mark: RuleMark = { type: 'rule', encoding: { y: { value: 40 } }, yTo: 60 };
    const node: IRNode = { ...nodesOf(lowerMark(mark, [{}], polarFrame()) as IRScope)[0], id: 'ring' };
    const scene = {
      version: 1 as const,
      type: 'scene' as const,
      children: [
        { type: 'scope' as const, nodeDefault: { padding: 0, strokeWidth: 0 }, children: [node] },
        { type: 'path' as const, children: [{ type: 'step' as const, kind: 'move' as const, to: [-200, -200] as [number, number] }, { type: 'step' as const, kind: 'line' as const, to: { id: 'ring' } }] },
      ],
    };
    expect(() => compileToScene(scene)).not.toThrow();
  });
});

describe('rule + bar z-order', () => {
  it('rule-zorder-with-bar', () => {
    // 同 scope 内 bar + rule（line）按声明序产出图层（z-order parity）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      scales: [
        { type: 'band', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      marks: [
        { type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } },
        { type: 'rule', encoding: { y: { value: 5 } } },
      ],
    });
    const expanded = expandOf(spec, { d: [{ cat: 'a', v: 3 }, { cat: 'b', v: 8 }] }, cartOpts);
    // 图层序 = 声明序：bar 在前、rule 在后
    const barLayer = expanded.children[0] as IRScope;
    const ruleLayer = expanded.children[1] as IRScope;
    expect(nodesOf(barLayer)).toHaveLength(2);
    expect(pathsOf(ruleLayer)).toHaveLength(1);
  });
});
