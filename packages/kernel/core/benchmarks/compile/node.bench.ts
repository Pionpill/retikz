import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { compileNode } from '../../src/compile/node';
import type { CompiledNode } from '../../src/compile/node';
import { emitNode } from '../../src/compile/node/emit';
import { layoutNode } from '../../src/compile/node/layout';
import { measureNodeBody } from '../../src/compile/node/measure';
import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '../../src/contract';
import type { LayoutAxisProposal, ScenePrimitive } from '../../src/contract';
import {
  createNodeBenchmarkFixture,
  createNodeBenchmarkUpdate,
  nodeBenchmarkReuseLabels,
  prepareNodeBenchmarkReuse,
  snapshotNodeBenchmarkInput,
} from '../_node-workloads';
import type { NodeBenchmarkKind, NodeBenchmarkReuse } from '../_node-workloads';

/** 完整输出树的叶图元，用于独立验证文字、公式、pin和资源引用 */
const flattenNodePrimitives = (primitives: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? flattenNodePrimitives(primitive.children) : [primitive],
  );

/** 比较最终可观察结果，局部缓存字段是否存在不属于等价输出契约 */
const verifyNodeCompilation = (actual: CompiledNode, expected: CompiledNode): void => {
  expect(actual.layout.overall).toEqual(expected.layout.overall);
  expect(actual.emit.overall).toEqual(expected.emit.overall);
  expect(actual.alignmentGuides).toEqual(expected.alignmentGuides);
  expect(actual.shape).toBe(expected.shape);
  expect(actual.boundary).toBe(expected.boundary);
};

/** fixture真实编译的独立尺寸、图元与输入不变性预期 */
const verifyNodeFixture = (fixture: ReturnType<typeof createNodeBenchmarkFixture>): void => {
  const { kind, scale, expected } = fixture;
  const { geometry, labels, text } = expected.layout.overall;
  expect(geometry.rect.x).toBe(12);
  expect(geometry.rect.y).toBe(24);
  if (kind === 'plain' || kind === 'gradient') {
    expect(geometry.contentSize).toEqual({ width: scale * 5, height: 14 });
    expect(text?.lines).toHaveLength(1);
  }
  if (kind === 'empty') expect(geometry.contentSize).toEqual({ width: 0, height: 0 });
  if (kind === 'mixed') {
    expect(geometry.contentSize.width).toBe(scale * 10);
    const paths = flattenNodePrimitives(expected.emit.overall.primitives).filter(
      primitive => primitive.type === 'path',
    );
    expect(paths).toHaveLength(scale);
  }
  if (kind === 'labels') {
    expect(geometry.contentSize.width).toBe(20);
    expect(labels).toHaveLength(scale);
    expect(
      flattenNodePrimitives(expected.emit.overall.primitives).filter(primitive => primitive.type === 'text'),
    ).toHaveLength(scale + 1);
    expect(labels?.filter(label => label.rotateDeg === 30)).toHaveLength(Math.floor(scale / 2));
    expect(
      flattenNodePrimitives(expected.emit.overall.primitives).filter(primitive => primitive.type === 'path'),
    ).toHaveLength(scale);
  }
  if (kind === 'fixed') {
    expect(geometry.rect.width).toBe(80);
    expect(geometry.contentSize.width).toBeLessThanOrEqual(80);
    expect(text?.lines).toHaveLength(64);
  }
  if (kind === 'lines') {
    expect(geometry.contentSize).toEqual({ width: 20, height: scale * 14 });
    expect(text?.lines).toHaveLength(scale);
  }
  expect(expected.emit.overall.primitives[0]).toMatchObject({ id: 'bench', meta: { benchmark: 'node' } });
  if (kind === 'gradient') {
    const resources = fixture.paintRegistry.getResources();
    expect(resources).toHaveLength(1);
    const leaves = flattenNodePrimitives(expected.emit.overall.primitives);
    expect(
      leaves.some(
        primitive =>
          'fill' in primitive &&
          typeof primitive.fill === 'object' &&
          primitive.fill.kind === 'resourceRef' &&
          primitive.fill.id === resources[0].id,
      ),
    ).toBe(true);
  }
  expect(snapshotNodeBenchmarkInput(fixture)).toBe(fixture.before);
};

const reuseModes: Array<NodeBenchmarkReuse> = ['none', 'content', 'body', 'layout', 'drawing', 'all'];
const completeInputs: Array<{ kind: NodeBenchmarkKind; scale: number; modes: Array<NodeBenchmarkReuse> }> = [
  { kind: 'plain', scale: 1024, modes: reuseModes },
  { kind: 'mixed', scale: 64, modes: reuseModes },
  {
    kind: 'labels',
    scale: 16,
    modes: ['none', 'content', 'body', 'labels-half', 'labels-all', 'layout', 'drawing', 'all'],
  },
  ...(
    [
      { kind: 'empty', scale: 0 },
      { kind: 'plain', scale: 32 },
      { kind: 'mixed', scale: 8 },
      { kind: 'labels', scale: 1 },
      { kind: 'fixed', scale: 1024 },
    ] satisfies Array<{ kind: NodeBenchmarkKind; scale: number }>
  ).map(input => ({ ...input, modes: ['none'] satisfies Array<NodeBenchmarkReuse> })),
];

for (const { kind, scale, modes } of completeInputs) {
  for (const reuse of modes) {
    defineBenchmark(
      {
        id: `compile/node/complete-${kind}-${reuse}/${scale}`,
        dimensions: ['完整节点编译', `${kind} · ${scale}`, nodeBenchmarkReuseLabels[reuse]],
      },
      () => {
        const fixture = createNodeBenchmarkFixture(kind, scale);
        verifyNodeFixture(fixture);
        const prepared = prepareNodeBenchmarkReuse(fixture.expected, reuse);
        return {
          run: () => compileNode(fixture.canon, fixture.context, prepared),
          verify: result => {
            verifyNodeCompilation(result, fixture.expected);
            expect(snapshotNodeBenchmarkInput(fixture)).toBe(fixture.before);
          },
        };
      },
    );
  }
}

const proposals: Array<{ name: string; proposal: LayoutAxisProposal }> = [
  { name: 'exact', proposal: { kind: LayoutAxisProposalKind.Exact, value: 700 } },
  { name: 'range', proposal: { kind: LayoutAxisProposalKind.Range, min: 0, max: 700 } },
  { name: 'intrinsic', proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum } },
];
for (const { name, proposal } of proposals) {
  for (const reuse of ['none', 'shape'] as const) {
    defineBenchmark(
      {
        id: `compile/node/body-${name}-${reuse}/1024`,
        dimensions: ['主体宽度求解', `${name} · 1024字符`, reuse === 'none' ? '不复用' : '仅形状尺寸'],
      },
      () => {
        const fixture = createNodeBenchmarkFixture('words', 1024, { proposal });
        const expected = measureNodeBody(fixture.canon, fixture.context);
        const prepared = reuse === 'shape' ? { shape: expected.shape } : undefined;
        if (name === 'intrinsic') {
          // 最宽英文词35；当前折行保留最后一行尾空格，最终内容宽度40
          expect(expected.content.textWidth).toBe(40);
          expect(fixture.expected.layout.overall.text?.lines).toHaveLength(128);
          expect(expected.content.lines?.[0].text).toBe('abcdefg');
          expect(expected.content.lines?.at(-1)?.text).toBe('abcdefg ');
        } else {
          const { size } = expected.shape;
          const allocationWidth = (size.width + 12) * Math.cos(Math.PI / 6) + (size.height + 8) * 0.5;
          expect(allocationWidth).toBeLessThanOrEqual(700);
          expect(expected.shape.contentWidthBudget).toBeLessThan(5120);
          expect(fixture.expected.layout.overall.text!.lines.length).toBeGreaterThan(1);
        }
        return {
          run: () => measureNodeBody(fixture.canon, fixture.context, prepared),
          verify: result => {
            expect(result).toEqual(expected);
            expect(snapshotNodeBenchmarkInput(fixture)).toBe(fixture.before);
          },
        };
      },
    );
  }
}

for (const anchorDepth of [3, 24] as const) {
  defineBenchmark(
    {
      id: `compile/node/layout-anchor/${anchorDepth}`,
      dimensions: ['锚点布局', `${anchorDepth}项混合变换链`, '主体已准备'],
    },
    () => {
      const fixture = createNodeBenchmarkFixture('plain', 32, { anchorDepth });
      const prepared = prepareNodeBenchmarkReuse(fixture.expected, 'body')?.layout;
      const width = 160;
      const expectedX = anchorDepth === 3 ? (-106 - width) / 2 : (240 - 8806 + 128 * width) / 1296;
      const expectedY = anchorDepth === 3 ? -224 / 3 : (100 + 9842) / 1296;
      return {
        run: () => layoutNode(fixture.canon, fixture.context, prepared),
        verify: result => {
          expect(result.overall).toEqual(fixture.expected.layout.overall);
          expect(result.overall.geometry.rect.x).toBeCloseTo(expectedX, 8);
          expect(result.overall.geometry.rect.y).toBeCloseTo(expectedY, 8);
          expect(snapshotNodeBenchmarkInput(fixture)).toBe(fixture.before);
        },
      };
    },
  );
}

for (const { name, kind, scale } of [
  { name: 'plain', kind: 'lines', scale: 64 },
  { name: 'mixed', kind: 'mixed', scale: 64 },
  { name: 'labels', kind: 'labels', scale: 16 },
  { name: 'gradient', kind: 'gradient', scale: 1 },
] satisfies Array<{ name: string; kind: NodeBenchmarkKind; scale: number }>) {
  defineBenchmark(
    { id: `compile/node/emit-${name}/${scale}`, dimensions: ['独立绘制', `${name} · ${scale}`, '布局与资源已准备'] },
    () => {
      const fixture = createNodeBenchmarkFixture(kind, scale);
      verifyNodeFixture(fixture);
      return {
        run: () => emitNode(fixture.canon, fixture.expected.layout.overall, fixture.context),
        verify: result => {
          expect(result.overall).toEqual(fixture.expected.emit.overall);
          expect(snapshotNodeBenchmarkInput(fixture)).toBe(fixture.before);
        },
      };
    },
  );
}

for (const kind of ['move', 'color', 'label'] as const) {
  for (const reuse of ['none', 'partial'] as const) {
    defineBenchmark(
      {
        id: `compile/node/update-${kind}-${reuse}/${kind === 'color' ? 32 : 16}`,
        dimensions: ['真实更新', kind, reuse === 'none' ? '完整重算' : '有效部分复用'],
      },
      () => {
        const update = createNodeBenchmarkUpdate(kind);
        const before = JSON.stringify({
          source: update.source,
          canon: {
            text: update.canon.text,
            layout: update.canon.layout,
            labels: update.canon.labels,
            style: update.canon.style,
          },
        });
        expect(update.expected.emit.overall).not.toEqual(update.fixture.expected.emit.overall);
        if (kind === 'move') expect(update.expected.layout.overall.geometry.rect).toMatchObject({ x: 80, y: 100 });
        if (kind === 'color')
          expect(
            flattenNodePrimitives(update.expected.emit.overall.primitives)
              .filter(primitive => primitive.type === 'text')
              .every(primitive => primitive.fill === '#abcdef'),
          ).toBe(true);
        if (kind === 'label') expect(update.expected.layout.overall.labels?.[0].lineLayout.width).toBe(65);
        return {
          run: () => compileNode(update.canon, update.fixture.context, reuse === 'none' ? undefined : update.prepared),
          verify: result => {
            verifyNodeCompilation(result, update.expected);
            expect(
              JSON.stringify({
                source: update.source,
                canon: {
                  text: update.canon.text,
                  layout: update.canon.layout,
                  labels: update.canon.labels,
                  style: update.canon.style,
                },
              }),
            ).toBe(before);
            expect(snapshotNodeBenchmarkInput(update.fixture)).toBe(update.fixture.before);
          },
        };
      },
    );
  }
}
