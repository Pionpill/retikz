import { compileToScene } from '@retikz/core';
import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { resolveFieldPath } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { defineLabelChannel } from '../../../src/contract';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 200, height: 100 } };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

const markLayer = (root: IRScope, index: number): IRScope => root.children[index] as IRScope;

const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(layer.children);

  return out;
};

const baseSpec = (marks: unknown): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks,
    guides: [],
  });

describe('契约标记宿主标签下沉', () => {
  it('path-mark-host-path-label：PathMark label lowering 到 core Path.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { label: { text: 'trend', position: 'midway', side: 'top', sloped: true } },
        },
      ]),
      {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));

    expect(path.label).toEqual({ text: 'trend', position: 'midway', side: 'top', sloped: true });
    expect(path.children.some(step => 'label' in step && step.label !== undefined)).toBe(false);
  });

  it('路径标记宿主路径标签接受规范的侧面名称', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { label: { text: 'trend', position: 'midway', side: 'top' } },
        },
      ]),
      {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));

    expect(path.label).toEqual({ text: 'trend', position: 'midway', side: 'top' });
  });

  it('在下沉过程中保留多行路径标签文本块', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            label: { text: ['first line', { segments: [{ text: 'trend ' }, { tex: 'x' }] }], position: 'midway' },
          },
        },
      ]),
      {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));

    expect(path.label).toEqual({
      text: ['first line', { segments: [{ text: 'trend ' }, { tex: 'x' }] }],
      position: 'midway',
    });
  });

  it('relation-path-host-label：RelationMark 顶层 label lowering 到 core Path.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          encodings: {
            label: { text: 'label' },
            source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
            target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
          },
          properties: { label: { position: 0.5, side: 'top' }, geometry: { kind: 'path' } },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1, label: 'A to B' }],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));

    expect(path.label).toEqual({ text: 'A to B', position: 0.5, side: 'top' });
    expect(path.children.some(step => 'label' in step && step.label !== undefined)).toBe(false);
  });

  it('RelationMark 标签下沉到 Ribbon kindOptions.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          encodings: {
            source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
            target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
          },
          properties: {
            label: { text: 'flow', position: 'midway', side: 'center', sloped: true },
            geometry: { kind: 'ribbon', width: 12 },
          },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1 }],
      },
    );

    const [ribbon] = collectPaths(markLayer(root, 0));

    expect(ribbon.kind).toBe('ribbon');
    expect(ribbon.kindOptions).toMatchObject({ width: { kind: 'fixed', value: 12 } });
    expect(ribbon.kindOptions?.label).toEqual({ text: 'flow', position: 'midway', side: 'center', sloped: true });
    expect(ribbon.label).toBeUndefined();
  });
});

describe('标签字段样式和简写', () => {
  it('在下沉之前保留混合标签索引并映射字体叶', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          encodings: {
            position: { x: { field: 'x' }, y: { field: 'y' } },
            label: ['name', { text: 'value', font: { size: 'size', weight: 'weight' }, distance: 'gap' }],
          },
          properties: { label: ['fallback', { font: { family: 'serif' }, side: 'bottom' }] },
        },
      ]),
      {
        d: [
          { x: 0, y: 0, name: 'A', value: 42, size: 18, weight: 700, gap: 9 },
          { x: 1, y: 1, name: 'B', value: 99, size: 30, weight: 400, gap: 2 },
        ],
      },
    );
    expect(collectPaths(markLayer(root, 0))[0].label).toEqual([
      { text: 'A' },
      { text: '42', font: { family: 'serif', size: 18, weight: 700 }, side: 'bottom', distance: 9 },
    ]);
  });

  it('拒绝缺失的样式数据，而不是回退到固定属性', () => {
    expect(() =>
      expandOf(
        baseSpec([
          {
            type: 'path',
            encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, label: { font: { size: 'size' } } },
            properties: { label: { text: 'constant', font: { size: 12 } } },
          },
        ]),
        {
          d: [
            { x: 0, y: 0, size: null },
            { x: 1, y: 1, size: 18 },
          ],
        },
      ),
    ).toThrow(/label.*size/i);
  });
});

const collectNodes = (scope: IRScope): Array<IRNode> =>
  scope.children.flatMap(child =>
    child.type === 'node' ? [child as IRNode] : child.type === 'scope' ? collectNodes(child as IRScope) : [],
  );

const constantPoint = (label: unknown, properties: unknown = 'fixed') => ({
  type: 'point',
  encodings: { position: { x: { value: 0 }, y: { value: 0 } }, label },
  properties: { label: properties },
});

const fixedDomains = (marks: unknown): IRPlot => {
  const spec = baseSpec(marks);
  return {
    ...spec,
    scales: [
      { type: 'linear', name: 'x', domain: [0, 1] },
      { type: 'linear', name: 'y', domain: [0, 1] },
    ],
  };
};

describe('标签依赖关系和目标契约', () => {
  it('仅样式字段创建真实的行实例，空结果保持为空', () => {
    const spec = fixedDomains([constantPoint({ font: { size: 'size' } })]);
    expect(collectNodes(expandOf(spec, { d: [{ size: 12 }, { size: 24 }] })).map(node => node.label)).toEqual([
      { text: 'fixed', font: { size: 12 } },
      { text: 'fixed', font: { size: 24 } },
    ]);
    expect(collectNodes(expandOf(spec, { d: [] }))).toHaveLength(0);
  });

  it('常量简写产生没有数据的单个标签', () => {
    const spec = fixedDomains([constantPoint(undefined)]);
    expect(collectNodes(expandOf(spec, { d: [] }))[0].label).toEqual({ text: 'fixed' });
  });

  it('解析数字字体比例并保留系列和样式字段', () => {
    const spec = fixedDomains([
      constantPoint({
        font: {
          size: { field: 'value', scale: 'fontSize' },
          weight: { field: 'value', scale: 'weight' },
          family: 'family',
          style: 'style',
        },
      }),
    ]);
    spec.scales.push(
      { type: 'linear', name: 'fontSize', domain: [0, 10], range: [10, 30] },
      { type: 'linear', name: 'weight', domain: [0, 10], range: [400, 800] },
    );
    const nodes = collectNodes(expandOf(spec, { d: [{ value: 5, family: 'serif', style: 'italic' }] }));
    expect(nodes[0].label).toEqual({
      text: 'fixed',
      font: { size: 20, weight: 600, family: 'serif', style: 'italic' },
    });
  });

  it('独立于宿主映射标签颜色和标量不透明度', () => {
    const spec = fixedDomains([constantPoint({ textColor: { field: 'category', scale: 'colors' }, opacity: 'alpha' })]);
    spec.scales.push({ type: 'ordinal', name: 'colors', domain: ['a', 'b'], range: ['red', 'blue'] });
    const labels = collectNodes(
      expandOf(spec, {
        d: [
          { category: 'a', alpha: 0 },
          { category: 'b', alpha: 10 },
        ],
      }),
    ).map(node => node.label);
    expect(labels).toEqual([
      { text: 'fixed', textColor: 'red', opacity: 0.2 },
      { text: 'fixed', textColor: 'blue', opacity: 1 },
    ]);
  });

  it('在组合字段和固定属性后检查最终宿主约束', () => {
    expect(() =>
      expandOf(fixedDomains([constantPoint({ placement: 'placement' }, { text: 'x', pin: true })]), {
        d: [{ placement: 'inside' }],
      }),
    ).toThrow(/label.*host constraints/i);
  });

  it('当较早的标签缺少内容时，不会改变样式索引', () => {
    const root = expandOf(fixedDomains([constantPoint(['missing', { text: 'name', font: { size: 'size' } }])]), {
      d: [{ missing: null, name: 'second', size: 15 }],
    });
    expect(collectNodes(root)[0].label).toEqual({ text: 'second', font: { size: 15 } });
  });

  it('对自定义标签通道使用相同的注册表和依赖路径', () => {
    const definition = defineLabelChannel({
      channel: 'label.emphasis',
      hosts: ['node'],
      resolve: (_context, binding) => ({
        resolver: row => resolveFieldPath(row, typeof binding === 'string' ? binding : binding.field) === 'high',
      }),
      deliver: (label, value) => {
        label.font = { ...label.font, weight: value ? 'bold' : 'normal' };
      },
    });
    const root = expandOf(
      fixedDomains([constantPoint({ emphasis: 'active' })]),
      { d: [{ active: 'high' }, { active: 'low' }] },
      { ...opts, definitions: { channels: [definition] } },
    );
    expect(collectNodes(root).map(node => node.label)).toEqual([
      { text: 'fixed', font: { weight: 'bold' } },
      { text: 'fixed', font: { weight: 'normal' } },
    ]);
  });

  it('拒绝原始标签位置未注册的目标和未知比例', () => {
    expect(() => expandOf(fixedDomains([constantPoint({ unknown: 'value' })]), { d: [{ value: 1 }] })).toThrow(
      /label\[0\].unknown/,
    );
    expect(() =>
      expandOf(fixedDomains([constantPoint({ font: { size: { field: 'value', scale: 'missing' } } })]), {
        d: [{ value: 1 }],
      }),
    ).toThrow(/label\[0\].font.size/);
  });
});

it('使用布尔分类值进行标签方向', () => {
  const root = expandOf(fixedDomains([constantPoint({ keepUpright: 'upright', rotate: 'angle' })]), {
    d: [{ upright: true, angle: 180 }],
  });
  expect(collectNodes(root)[0].label).toEqual({ text: 'fixed', keepUpright: true, rotate: 180 });
});

it('将编码的字体叶子编译到与固定标签值相同的测量场景中', () => {
  const encoded = expandOf(fixedDomains([constantPoint({ font: { size: 'size', weight: 'weight' } })]), {
    d: [{ size: 24, weight: 700 }],
  });
  const fixed = expandOf(fixedDomains([constantPoint(undefined, { text: 'fixed', font: { size: 24, weight: 700 } })]), {
    d: [],
  });
  const compile = (scope: IRScope) => compileToScene({ version: 1, type: 'scene', children: [scope] }).scene;
  expect(compile(encoded)).toEqual(compile(fixed));
});
