import type { IRNode, IRScope } from '@retikz/core';
import { pointAtArcAngle } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { createPlotLocator } from '../../../src/pipeline';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 400, height: 400 } };

const share = [
  { label: 'A', value: 25, offset: 0 },
  { label: 'B', value: 75, offset: 18 },
];

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

const sectorNodes = (layer: IRScope): Array<IRNode> => {
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

const sectorParams = (
  node: IRNode,
): { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number } => {
  const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;

  expect(shape?.type).toBe('sector');
  return shape!.params as { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
};

const vectorPosition = (node: IRNode): [number, number] => {
  const { position } = node;

  expect(Array.isArray(position)).toBe(true);

  if (!Array.isArray(position) || typeof position[0] !== 'number' || typeof position[1] !== 'number') {
    throw new Error('expected cartesian node position');
  }

  return [position[0], position[1]];
};

const pieSpec = (extraMark: Record<string, unknown> = {}, innerRadius = 0): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'share' },
    transform: [{ operation: { kind: 'stack', params: { y: 'value' } } }],
    coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', innerRadius },
    scales: [
      { type: 'linear', name: 'angle', domainPadding: 0 },
      { type: 'linear', name: 'radius', domainPadding: 0 },
    ],
    marks: [
      {
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
        ...extraMark,
      },
    ],
  });

describe('IntervalMark.pull 扇形几何形状', () => {
  it('恒定拉力沿最终中角移动扇区节点中心', () => {
    const spec = pieSpec({ properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 20 } });
    const nodes = sectorNodes(firstLayer(spec, { share }));

    expect(nodes).toHaveLength(2);

    const params = sectorParams(nodes[0]);

    expect(params.startAngle).toBeCloseTo(0, 6);
    expect(params.endAngle).toBeCloseTo(90, 6);
    expect(nodes[0].position).toEqual(pointAtArcAngle([200, 200], 20, 45));
  });

  it('字段绑定拉动仅移动具有非零字段值的行', () => {
    const nodes = sectorNodes(
      firstLayer(
        pieSpec({
          encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label', pull: 'offset' },
        }),
        {
          share,
        },
      ),
    );

    expect(nodes[0].position).toEqual([200, 200]);
    expect(nodes[1].position).toEqual(pointAtArcAngle([200, 200], 18, 225));
  });

  it('地图通过指定比例拉动并暴露相同的移位定位器锚点', () => {
    const spec = pieSpec({
      encodings: {
        bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } },
        color: 'label',
        pull: { field: 'offset', scale: 'pull' },
        series: 'label',
      },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 99 },
    });
    spec.scales.push({ type: 'linear', name: 'pull', domain: [0, 18], range: [0, 36] });
    const nodes = sectorNodes(firstLayer(spec, { share }));
    expect(nodes[0].position).toEqual([200, 200]);
    expect(nodes[1].position).toEqual(pointAtArcAngle([200, 200], 36, 225));
    const locator = createPlotLocator(spec, { share }, { ...opts, environment: {} });
    expect(locator.series('B')?.position).toEqual(locator.datum(1)?.position);
    expect(locator.datum(1)?.position).toEqual(pointAtArcAngle(vectorPosition(nodes[1]), 100, 225));
  });

  it('padAngle 和拉动使用填充扇区中角，无需重写半径', () => {
    const nodes = sectorNodes(
      firstLayer(
        pieSpec(
          { properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 12, padAngle: 10 } },
          0.5,
        ),
        { share },
      ),
    );
    const params = sectorParams(nodes[0]);

    expect(params.startAngle).toBeCloseTo(5, 6);
    expect(params.endAngle).toBeCloseTo(85, 6);
    expect(params.innerRadius).toBeCloseTo(100, 6);
    expect(params.outerRadius).toBeCloseTo(200, 6);
    expect(nodes[0].position).toEqual(pointAtArcAngle([200, 200], 12, 45));
  });

  it('拉零匹配省略的拉', () => {
    const pulled = sectorNodes(
      firstLayer(pieSpec({ properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 0 } }), {
        share,
      }),
    );
    const plain = sectorNodes(firstLayer(pieSpec(), { share }));

    expect(pulled.map(node => node.position)).toEqual(plain.map(node => node.position));
    expect(pulled.map(sectorParams)).toEqual(plain.map(sectorParams));
  });

  it('大的有限拉力保持扇形半径和角度不变', () => {
    const nodes = sectorNodes(
      firstLayer(pieSpec({ properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 260 } }), {
        share,
      }),
    );
    const params = sectorParams(nodes[0]);

    expect(params.innerRadius).toBeCloseTo(0, 6);
    expect(params.outerRadius).toBeCloseTo(200, 6);
    expect(params.startAngle).toBeCloseTo(0, 6);
    expect(params.endAngle).toBeCloseTo(90, 6);
    expect(nodes[0].position).toEqual(pointAtArcAngle([200, 200], 260, 45));
  });

  it('笛卡尔区间拒绝拉力而不是忽略它', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: { position: { x: { field: 'label' }, y: { field: 'value' } } },
          properties: { pull: 8 },
        },
      ],
    });

    expect(() => expandOf(spec, { share })).toThrow(/pull|sector/i);
  });

  it('字段绑定的 pull 无效时明确报错', () => {
    const spec = pieSpec({
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label', pull: 'offset' },
    });

    expect(() => expandOf(spec, { share: [{ label: 'A', value: 1, offset: -1 }] })).toThrow(/pull|non-negative/i);
    expect(() => expandOf(spec, { share: [{ label: 'A', value: 1, offset: 'far' }] })).toThrow(/pull|numeric/i);
  });

  it('定位器基准锚遵循拉动的扇形几何形状', () => {
    const spec = pieSpec({ properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 20 } });
    const locator = createPlotLocator(spec, { share }, { ...opts, environment: {} });
    const node = sectorNodes(firstLayer(spec, { share }))[0];
    const params = sectorParams(node);
    const midRadius = (params.innerRadius + params.outerRadius) / 2;
    const midAngle = (params.startAngle + params.endAngle) / 2;

    expect(locator.datum(0)?.position).toEqual(pointAtArcAngle(vectorPosition(node), midRadius, midAngle));
  });

  it('定位器系列质心采用拉力基准锚', () => {
    const spec = pieSpec({
      encodings: {
        bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } },
        color: 'label',
        pull: 'offset',
        series: 'label',
      },
    });
    const locator = createPlotLocator(spec, { share }, { ...opts, environment: {} });

    expect(locator.series('B')?.position).toEqual(locator.datum(1)?.position);
  });

  it('弦插值应用 padAngle 并在轮廓投影之前拉动', () => {
    const spec = pieSpec({
      properties: {
        bounds: { x: { kind: 'extent' }, y: { kind: 'full' } },
        pull: 20,
        interpolation: 'chord',
        padAngle: 10,
      },
    });
    const node = sectorNodes(firstLayer(spec, { share }))[0];

    expect((node.shape as { type?: string } | undefined)?.type).toBe('contour');
    expect(createPlotLocator(spec, { share }, { ...opts, environment: {} }).datum(0)?.position).toEqual(node.position);
  });
});
