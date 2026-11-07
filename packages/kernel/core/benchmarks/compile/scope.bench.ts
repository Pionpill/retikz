import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  compileScope,
  prepareScopePlacement,
  projectScopeCompileLayouts,
  projectScopeOutputBounds,
} from '../../src/compile/scope';
import type { CompiledScope, ScopePlacementPreparation } from '../../src/compile/scope';
import { layoutScopeEnvelope } from '../../src/compile/scope/envelope';
import { lowerScopePlacementTransforms } from '../../src/compile/scope/placement/layout';
import type { Transform } from '../../src/contract';
import {
  createScopeBenchmarkBounds,
  createScopeBenchmarkFixture,
  createScopeBenchmarkTransforms,
  createScopeBenchmarkUpdate,
  prepareScopeBenchmarkReuse,
  resolveScopeBenchmarkSource,
  scopeBenchmarkReuseLabels,
  snapshotScopeBenchmarkInput,
} from '../_scope-workloads';
import type { ScopeBenchmarkReuse } from '../_scope-workloads';
import { createSharedTransformWorkload } from '../_shared-transform-workloads';

/** 最终输出等价不要求局部prepared字段同时存在 */
const verifyScopeCompilation = (result: CompiledScope, expected: CompiledScope): void => {
  expect(result.layout.overall).toEqual(expected.layout.overall);
  expect(result.emit.overall).toEqual(expected.emit.overall);
  expect(result.shape).toBe(expected.shape);
  expect(result.boundary).toEqual(expected.boundary);
  expect(result.zIndex).toBe(3);
  expect(result.emit.overall).not.toHaveProperty('children');
};

/** AABB手算及对跖支撑证明圆的最优半径，同时验证全部内部角点被包含 */
const verifyScopeFixture = (fixture: ReturnType<typeof createScopeBenchmarkFixture>): void => {
  const geometry = fixture.expected.layout.overall.geometry;
  const expected =
    fixture.canon.envelope.kind === 'circle'
      ? { x: 10, y: 20, width: 200, height: 200, rotate: 0 }
      : fixture.data.expectedRect;
  for (const key of ['x', 'y', 'width', 'height', 'rotate'] as const)
    expect(geometry.rect[key]).toBeCloseTo(expected[key], 8);
  expect(geometry.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  for (const [x, y] of fixture.data.points) {
    if (fixture.canon.envelope.kind === 'circle') expect(Math.hypot(x - 10, y - 20)).toBeLessThanOrEqual(100 + 1e-8);
    else {
      expect(Math.abs(x - expected.x)).toBeLessThanOrEqual(expected.width / 2 + 1e-8);
      expect(Math.abs(y - expected.y)).toBeLessThanOrEqual(expected.height / 2 + 1e-8);
    }
  }
  expect(fixture.expected.emit.overall).toMatchObject({
    type: 'group',
    id: 'scope-bench',
    meta: { benchmark: 'scope' },
  });
  if (fixture.context.resolvedClipPath !== undefined) {
    expect(fixture.context.resolvedClipPath.commands).toHaveLength(128);
    expect(fixture.clipRegistry.getResources()).toHaveLength(1);
    expect(fixture.expected.emit.overall.clipRef).toBe(fixture.clipRegistry.getResources()[0].id);
  }
};

const completeModes: Array<ScopeBenchmarkReuse> = ['none', 'envelope', 'preparation', 'placement', 'layout', 'all'];
for (const { kind, count } of [
  { kind: 'rectangle', count: 32 },
  { kind: 'rectangle', count: 1024 },
  { kind: 'circle', count: 128 },
] as const) {
  for (const reuse of completeModes)
    defineBenchmark(
      {
        id: `compile/scope/complete-${kind}-${reuse}/${count}`,
        dimensions: ['完整Scope编译', `${kind} · ${count}子布局`, scopeBenchmarkReuseLabels[reuse]],
      },
      () => {
        const fixture = createScopeBenchmarkFixture(kind, count);
        verifyScopeFixture(fixture);
        const prepared = prepareScopeBenchmarkReuse(fixture.expected, reuse);
        return {
          run: () => compileScope(fixture.canon, fixture.context, prepared),
          verify: result => {
            verifyScopeCompilation(result, fixture.expected);
            expect(snapshotScopeBenchmarkInput(fixture)).toBe(fixture.before);
          },
        };
      },
    );
}

for (const reuse of ['none', 'clip', 'layout+clip', 'all'] as const)
  defineBenchmark(
    {
      id: `compile/scope/clipped-${reuse}/32`,
      dimensions: ['裁剪Scope编译', '32子布局 · 128裁剪命令', scopeBenchmarkReuseLabels[reuse]],
    },
    () => {
      const fixture = createScopeBenchmarkFixture('rectangle', 32, true);
      verifyScopeFixture(fixture);
      const prepared = prepareScopeBenchmarkReuse(fixture.expected, reuse);
      const resources = structuredClone(fixture.clipRegistry.getResources());
      return {
        run: () => compileScope(fixture.canon, fixture.context, prepared),
        verify: result => {
          verifyScopeCompilation(result, fixture.expected);
          expect(fixture.clipRegistry.getResources()).toEqual(resources);
          expect(snapshotScopeBenchmarkInput(fixture)).toBe(fixture.before);
        },
      };
    },
  );

defineBenchmark({ id: 'compile/scope/empty/0', dimensions: ['完整Scope编译', '空Scope', '不复用'] }, () => {
  const fixture = createScopeBenchmarkFixture('rectangle', 0);
  verifyScopeFixture(fixture);
  return {
    run: () => compileScope(fixture.canon, fixture.context),
    verify: result => {
      verifyScopeCompilation(result, fixture.expected);
      expect(result.layout.overall.transforms).toEqual([]);
      expect(result.emit.overall).not.toHaveProperty('clipRef');
      expect(snapshotScopeBenchmarkInput(fixture)).toBe(fixture.before);
    },
  };
});

for (const { kind, count } of [
  { kind: 'rectangle', count: 32 },
  { kind: 'rectangle', count: 1024 },
  { kind: 'circle', count: 16 },
  { kind: 'circle', count: 128 },
] as const)
  defineBenchmark(
    {
      id: `compile/scope/envelope-${kind}/${count}`,
      dimensions: ['子布局包络', kind, `${count}子布局`],
    },
    () => {
      const fixture = createScopeBenchmarkFixture(kind, count);
      verifyScopeFixture(fixture);
      return {
        run: () => layoutScopeEnvelope(fixture.canon, fixture.data.layouts),
        verify: result => {
          expect(result).toEqual(fixture.expected.layout.overall.geometry);
          expect(snapshotScopeBenchmarkInput(fixture)).toBe(fixture.before);
        },
      };
    },
  );

for (const count of [3, 24] as const)
  for (const stage of ['prepare', 'placement'] as const)
    defineBenchmark<ScopePlacementPreparation | Array<Transform>>(
      {
        id: `compile/scope/${stage}/${count}`,
        dimensions: [
          '放置阶段',
          stage === 'prepare' ? '原点pivot前置准备' : '包络pivot最终放置',
          `${count}项变换 · 真实引用`,
        ],
      },
      () => {
        const fixture = createScopeBenchmarkFixture('rectangle', 32);
        const source = { ...fixture.source, transforms: createScopeBenchmarkTransforms(count, stage === 'placement') };
        const canon = resolveScopeBenchmarkSource(source);
        const input = { type: 'scope' as const, ...canon.transform };
        const preparation = prepareScopePlacement(input, fixture.context);
        const expectedOwn: Array<Transform> = Array.from({ length: count / 3 }, (): Array<Transform> =>
          stage === 'prepare'
            ? [
                { kind: 'translate', x: 202, y: 103 },
                { kind: 'rotate', degrees: 90 },
                { kind: 'scale', x: 2, y: 3 },
              ]
            : [
                { kind: 'translate', x: 202, y: 103 },
                { kind: 'rotate', degrees: 90, cx: 10, cy: 20 },
                { kind: 'translate', x: 10, y: 20 },
                { kind: 'scale', x: 2, y: 3 },
                { kind: 'translate', x: -10, y: -20 },
              ],
        ).flat();
        expect(preparation.positionTarget).toEqual([240, 100]);
        const intrinsic = {
          shape: canon.envelope.shape,
          boundary: { ...canon.envelope.shape, isShape: true },
          geometry: fixture.expected.layout.overall.geometry,
        };
        const before = JSON.stringify({ source, transform: canon.transform });
        if (stage === 'prepare')
          return {
            run: () => prepareScopePlacement(input, fixture.context),
            verify: result => {
              if (Array.isArray(result)) throw new Error('Expected placement preparation');
              expect(result.positionTarget).toEqual([240, 100]);
              expect(result.preliminaryTransforms).toEqual(expectedOwn);
              expect(JSON.stringify({ source, transform: canon.transform })).toBe(before);
            },
          };
        expect(preparation.preliminaryTransforms).toBeUndefined();
        // 每组三项对点的独立公式：G(x,y)=(272-3y,103+2x)，中心pivot为(10,20)
        let origin = [0, 0];
        for (let repeat = 0; repeat < count / 3; repeat++) origin = [272 - 3 * origin[1], 103 + 2 * origin[0]];
        return {
          run: () =>
            lowerScopePlacementTransforms(
              input,
              fixture.context,
              intrinsic,
              preparation.positionTarget,
              preparation.preliminaryTransforms,
            ),
          verify: result => {
            if (!Array.isArray(result)) throw new Error('Expected final placement transforms');
            expect(result.slice(1)).toEqual(expectedOwn);
            expect(result[0].kind).toBe('translate');
            if (result[0].kind !== 'translate') throw new Error('Expected alignment translation');
            expect(result[0].x).toBeCloseTo(240 - origin[0], 8);
            expect(result[0].y).toBeCloseTo(100 - origin[1], 8);
            expect(JSON.stringify({ source, transform: canon.transform })).toBe(before);
          },
        };
      },
    );

for (const { named, count } of [
  { named: false, count: 32 },
  { named: false, count: 1024 },
  { named: true, count: 1 },
])
  defineBenchmark(
    {
      id: `compile/scope/publish-${named ? 'named' : 'anonymous'}/${count}`,
      dimensions: ['向父级发布布局', named ? '命名单包络' : '匿名透传', `${count}实际投影布局`],
    },
    () => {
      const fixture = createScopeBenchmarkFixture('rectangle', named ? 32 : count);
      const envelope = {
        shape: fixture.expected.shape,
        boundary: fixture.expected.boundary,
        geometry: fixture.expected.layout.overall.geometry,
      };
      const input = named ? { id: 'scope-bench' } : {};
      const transforms = createSharedTransformWorkload(3).chain;
      const originals = named ? [envelope] : fixture.data.layouts;
      return {
        run: () => projectScopeCompileLayouts(input, envelope, fixture.data.layouts, transforms),
        verify: result => {
          expect(result).toHaveLength(count);
          result.forEach((layout, index) => {
            const original = originals[index];
            if ('position' in layout && 'position' in original) {
              expect(layout.position[0]).toBeCloseTo(16 - 3 * original.position[1], 8);
              expect(layout.position[1]).toBeCloseTo(-6 - 2 * original.position[0], 8);
            } else if (!('position' in layout) && !('position' in original)) {
              const rect = original.geometry.rect;
              expect(layout.geometry.rect.x).toBeCloseTo(16 - 3 * rect.y, 8);
              expect(layout.geometry.rect.y).toBeCloseTo(-6 - 2 * rect.x, 8);
              expect(layout.geometry.rect.width).toBe(rect.width * 2);
              expect(layout.geometry.rect.height).toBe(rect.height * 3);
              expect(layout.geometry.rect.rotate).toBeCloseTo((rect.rotate ?? 0) + Math.PI / 2, 8);
              expect(layout.geometry.margin).toEqual({
                top: original.geometry.margin.top * 3,
                right: original.geometry.margin.right * 2,
                bottom: original.geometry.margin.bottom * 3,
                left: original.geometry.margin.left * 2,
              });
              expect(layout.shape).toBe(original.shape);
            } else throw new Error('Layout contribution kind changed');
          });
          expect(snapshotScopeBenchmarkInput(fixture)).toBe(fixture.before);
        },
      };
    },
  );

for (const decoration of [false, true])
  for (const count of decoration ? [8, 128] : [32, 1024])
    defineBenchmark(
      {
        id: `compile/scope/bounds-${decoration ? 'decoration' : 'layout'}/${count}`,
        dimensions: ['输出边界投影', decoration ? '装饰 · 真实裁剪' : '普通布局 · 阴影透传', `${count}项贡献`],
      },
      () => {
        const workload = createScopeBenchmarkBounds(count, decoration);
        const before = JSON.stringify(workload);
        return {
          run: () => projectScopeOutputBounds(workload.bounds, workload.group, workload.resources),
          verify: result => {
            expect(result).toHaveLength(count);
            result.forEach((contribution, index) => {
              if (decoration) {
                expect(contribution.decoration).toBe(true);
                expect(Math.min(...contribution.boundsPoints.map(point => point[0]))).toBe(11);
                expect(Math.max(...contribution.boundsPoints.map(point => point[0]))).toBe(51);
                expect(Math.min(...contribution.boundsPoints.map(point => point[1]))).toBe(-7);
                expect(Math.max(...contribution.boundsPoints.map(point => point[1]))).toBe(23);
              } else {
                expect(contribution.boundsPoints).toEqual([
                  [11 + 2 * index, -13],
                  [19 + 2 * index, 11],
                ]);
                expect(contribution.shadow).toBe(workload.bounds[index].shadow);
              }
            });
            expect(JSON.stringify(workload)).toBe(before);
          },
        };
      },
    );

for (const kind of ['move', 'children', 'animation'] as const)
  for (const reuse of ['none', 'partial'] as const)
    defineBenchmark(
      {
        id: `compile/scope/update-${kind}-${reuse}/32`,
        dimensions: ['真实更新', kind, reuse === 'none' ? '完整重算' : '有效部分复用'],
      },
      () => {
        const update = createScopeBenchmarkUpdate(kind);
        const before = JSON.stringify({
          source: update.source,
          layouts: update.context.layouts,
          animations: update.context.animations,
          transform: update.canon.transform,
        });
        if (kind === 'move')
          expect(update.expected.layout.overall.transforms[0]).toEqual({ kind: 'translate', x: 80, y: 100 });
        if (kind === 'children') expect(update.expected.layout.overall.geometry.rect).toMatchObject({ x: 40, y: 60 });
        if (kind === 'animation') expect(update.expected.emit.overall.animations).toEqual(update.context.animations);
        expect(kind === 'animation' ? update.expected.emit.overall : update.expected.layout.overall).not.toEqual(
          kind === 'animation' ? update.fixture.expected.emit.overall : update.fixture.expected.layout.overall,
        );
        return {
          run: () => compileScope(update.canon, update.context, reuse === 'none' ? undefined : update.prepared),
          verify: result => {
            verifyScopeCompilation(result, update.expected);
            expect(
              JSON.stringify({
                source: update.source,
                layouts: update.context.layouts,
                animations: update.context.animations,
                transform: update.canon.transform,
              }),
            ).toBe(before);
            expect(snapshotScopeBenchmarkInput(update.fixture)).toBe(update.fixture.before);
          },
        };
      },
    );
