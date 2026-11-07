import { expect } from 'vitest';
import { literal } from 'zod';

import { createBoundaryStore } from '../src/compile/boundary';
import { bindPathTargets, compilePath, createPathTargetResolver, samplePathRoute } from '../src/compile/path';
import type { CompiledPath, PathCompileContext, PreparedPathCompilation } from '../src/compile/path';
import type { PreparedStrokeLabelEmit, PreparedStrokeLabelLayout } from '../src/compile/path/stroke';
import type { StrokeLabelSlots, StrokePathCompileContext } from '../src/compile/path/stroke/types';
import { pathTargetViewOf } from '../src/compile/path/target/view';
import { createPositionEvaluateContext } from '../src/compile/reference';
import type { PositionReferenceView } from '../src/compile/reference';
import { createPaintRegistry } from '../src/compile/resource';
import { composeScopeTransform } from '../src/compile/shared';
import { definePath } from '../src/contract';
import type { AnyPathDefinition, ScenePrimitive, Transform } from '../src/contract';
import {
  resolveArrowRegistry,
  resolveMarkRegistry,
  resolvePathRegistry,
  resolvePatternRegistry,
  resolveThemeRegistry,
} from '../src/providers';
import { resolvePath, resolveScopeInheritance, resolveStrokePathProviders } from '../src/resolve';
import type { PathResolution } from '../src/resolve';
import { PathSchema } from '../src/schemas';
import type { IRPathBase, IRPathLabel, IRPosition, IRStep } from '../src/schemas';
import { createBoundaryGeometry } from './_boundary-workloads';
import { textBenchmarkContext } from './_text-workloads';

/** 单路径的代表执行分支；scale为步骤或smooth过点数，不是外部调用次数 */
export type PathBenchmarkKind =
  | 'absolute'
  | 'relative-axis'
  | 'reference-clip'
  | 'curves-shapes'
  | 'smooth'
  | 'rounded-subpaths'
  | 'step-labels'
  | 'interrupt-labels'
  | 'marks'
  | 'combined'
  | 'iterable'
  | 'double-stroke'
  | 'materialized';

/** 从真实编译产物中选择调用方已确认有效的阶段，不模拟Weave失效策略 */
export type PathBenchmarkReuse =
  | 'none'
  | 'targets'
  | 'geometry'
  | 'labels-half'
  | 'labels-all'
  | 'label-content'
  | 'marks-placement'
  | 'marks-content'
  | 'layout'
  | 'drawing'
  | 'stroke'
  | 'all';

/** 同输入的各档prepared在报告中相邻展示，不把复用档另列为无基准的操作 */
export const pathBenchmarkReuseLabels: Record<PathBenchmarkReuse, string> = {
  none: '不复用',
  targets: '仅目标绑定',
  geometry: '目标与基础几何/采样',
  'labels-half': '几何与一半标签测量',
  'labels-all': '几何与全部标签测量',
  'label-content': '几何与全部标签测量/局部内容',
  'marks-placement': '几何与标记放置',
  'marks-content': '几何与标记放置/局部内容',
  layout: '完整stroke布局',
  drawing: '完整布局与部分绘制',
  stroke: '完整stroke输出',
  all: '完整Path输出',
};

/** 固定两位小数，避免不同场景使用不同精度 */
const roundPathBenchmark = (value: number): number => Math.round(value * 100) / 100;

/** 合法fixture不应产生诊断 */
const failPathBenchmarkWarning = (code: string, message: string): never => {
  throw new Error(`${code}: ${message}`);
};

/** 标签宽15、高10，位置均匀分布，避免规模增长时重叠成另一种负载 */
const createPathBenchmarkLabels = (count: number, interrupt: boolean): Array<IRPathLabel> =>
  Array.from({ length: count }, (_, index) => ({
    text: `L${index.toString().padStart(2, '0')}`,
    font: { size: 10 },
    position: (index + 1) / (count + 1),
    side: 'center',
    distance: 0,
    sloped: true,
    interrupt,
    gap: 2,
  }));

/** 每12步重置一个子路径，覆盖Bezier、bend、fold、圆弧和闭合形状 */
const createMixedPathStep = (index: number): IRStep => {
  const x = Math.floor(index / 12) * 200;
  switch (index % 12) {
    case 0:
      return { type: 'step', kind: 'move', to: [x, 0] };
    case 1:
      return { type: 'step', kind: 'curve', control: [x + 5, -10], to: [x + 10, 0] };
    case 2:
      return { type: 'step', kind: 'cubic', control1: [x + 12, 10], control2: [x + 18, -10], to: [x + 20, 0] };
    case 3:
      return { type: 'step', kind: 'bend', to: [x + 30, 10], bendAngle: 30 };
    case 4:
      return { type: 'step', kind: 'fold', via: '-|-', to: [x + 50, 0], fraction: 0.3 };
    case 5:
      return { type: 'step', kind: 'arc', center: [x + 50, 10], radius: 10, startAngle: -90, endAngle: 0 };
    case 6:
      return {
        type: 'step',
        kind: 'arc',
        center: [x + 70, 10],
        radius: { x: 10, y: 5 },
        startAngle: 180,
        endAngle: 270,
      };
    case 7:
      return { type: 'step', kind: 'circlePath', radius: 5 };
    case 8:
      return { type: 'step', kind: 'ellipsePath', radius: { x: 8, y: 4 } };
    case 9:
      return { type: 'step', kind: 'rectangle', from: [x + 80, 0], to: [x + 90, 10], cornerRadius: 2 };
    case 10:
      return { type: 'step', kind: 'line', to: [x + 100, 0] };
    default:
      return { type: 'step', kind: 'cycle' };
  }
};

/** 两个独立直角子路径，其中一个闭合，防止圆角算法跨move连接 */
const createRoundedPathStep = (index: number): IRStep => {
  const x = Math.floor(index / 8) * 80;
  const slot = index % 8;
  if (slot === 0 || slot === 4) return { type: 'step', kind: 'move', to: [x + slot * 10, 0] };
  if (slot === 7) return { type: 'step', kind: 'cycle' };
  return {
    type: 'step',
    kind: 'line',
    to: [
      x + (slot === 2 ? 10 : slot === 3 ? 20 : slot === 6 ? 50 : slot * 10),
      slot === 2 || slot === 3 || slot === 6 ? 10 : 0,
    ],
  };
};

/** 构造稳定的单路径声明；解析和所有随机性均不进入计时 */
const createPathBenchmarkSource = (kind: PathBenchmarkKind, scale: number): IRPathBase => {
  const source: IRPathBase = {
    type: 'path',
    id: 'bench-path',
    meta: { benchmark: 'path' },
    style: { stroke: '#123456', strokeWidth: 2 },
    children: Array.from({ length: scale }, (_, index): IRStep => {
      if (kind === 'curves-shapes') return createMixedPathStep(index);
      if (kind === 'rounded-subpaths') return createRoundedPathStep(index);
      if (kind === 'reference-clip')
        return { type: 'step', kind: index === 0 ? 'move' : 'line', to: { id: `p${index}` } };
      if (index === 0) return { type: 'step', kind: 'move', to: [0, 0] };
      if (kind === 'relative-axis' && index < scale - 1) {
        if (index % 4 === 1) return { type: 'step', kind: 'line', to: { relative: [10, 10] } };
        if (index % 4 === 2) return { type: 'step', kind: 'line', to: { relativeAccumulate: [20, 0] } };
        if (index % 4 === 3) return { type: 'step', kind: 'axis-line', axis: 'vertical', to: [0, index * 10] };
        return { type: 'step', kind: 'line', to: { relativeAccumulate: [10, 0] } };
      }
      return { type: 'step', kind: 'line', to: [index * 10, kind === 'absolute' ? (index % 2) * 10 : 0] };
    }),
  };
  if (kind === 'smooth')
    source.children = [
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: Array.from({ length: scale }, (_, index): IRPosition => [(index + 1) * 10, ((index + 1) % 2) * 10]),
      },
    ];
  if (kind === 'rounded-subpaths') source.cornerRadius = 2;
  const count = scale === 16 ? 1 : 16;
  if (kind === 'step-labels') {
    const labels = createPathBenchmarkLabels(count, false);
    for (let index = 0; index < count; index++) {
      const stepIndex = Math.floor(((index + 1) * (scale - 1)) / (count + 1));
      source.children![stepIndex] = { type: 'step', kind: 'line', to: [stepIndex * 10, 0], label: labels[index] };
    }
  }
  if (kind === 'interrupt-labels' || kind === 'combined') source.label = createPathBenchmarkLabels(count, true);
  if (kind === 'marks' || kind === 'combined')
    source.marks = Array.from({ length: count }, (_, index) => ({
      pos: (index + 1) / (count + 1),
      shape: 'plus',
      rotate: index % 2 === 0 ? 'auto' : 30,
      length: 6,
      width: 6,
    }));
  if (kind === 'combined') {
    source.arrow = { start: { shape: 'stealth' }, end: { shape: 'open' } };
    source.style = {
      stroke: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
      },
      strokeWidth: 2,
      opacity: 0.75,
    };
    source.rotate = 30;
    source.scale = { x: 1.2, y: 0.8 };
  }
  return source;
};

/** 真实注册的Definition，分别消费iterable、同次stroke和独立派生几何/标签能力 */
const createPathBenchmarkDefinition = (
  kind: 'iterable' | 'double-stroke' | 'materialized',
  scale: number,
): AnyPathDefinition => {
  const leaves: Array<ScenePrimitive> = Array.from({ length: scale }, (_, index) =>
    index % 2 === 0
      ? { type: 'rect', x: index * 10, y: 0, width: 8, height: 6, fill: '#123456' }
      : {
          type: 'text',
          x: index * 10,
          y: 5,
          lines: [{ text: 'ab' }],
          fontSize: 10,
          lineHeight: 12,
          measuredWidth: 10,
          measuredHeight: 10,
          align: 'start',
          baseline: 'alphabetic',
          fill: '#123456',
        },
  );
  const derivedChildren: Array<IRStep> = Array.from({ length: scale }, (_, index) => ({
    type: 'step',
    kind: index === 0 ? 'move' : 'line',
    to: [20 + index * 10, 20],
  }));
  return definePath({
    name: kind,
    schema: PathSchema.extend({ kind: literal(kind) }),
    compile: context => {
      if (kind === 'iterable')
        return {
          primitives: (function* () {
            yield* leaves;
          })(),
          boundsPoints: (function* (): Generator<IRPosition> {
            yield [0, 0];
            yield [scale * 10, 10];
          })(),
        };
      if (kind === 'double-stroke') {
        const first = context.emitStroke();
        const second = context.emitStroke();
        if (first === null || second === null) throw new Error('Expected a drawable benchmark stroke');
        const primitives = Array.from(first.primitives);
        primitives[0].id = 'first-copy';
        return {
          primitives: [...primitives, ...second.primitives],
          boundsPoints: [...first.boundsPoints, ...second.boundsPoints],
        };
      }
      const commands = context.materializePath({ children: derivedChildren });
      const sample = samplePathRoute(commands, 0, 0.5)!;
      const label = context.resolveHostLabel({ text: 'host', font: { size: 10 }, side: 'center', distance: 0 });
      const host = context.emitHostLabels({ labels: [label], samples: [sample], sourcePath: ['label'] });
      const boundary = context.emitBoundaryLabels([
        {
          label: { text: 'edge', font: { size: 10 }, distance: 4 },
          point: [20 + (scale - 1) * 10, 20],
          outward: [0, -1],
          sourcePath: ['edge'],
        },
      ]);
      return context.wrapOutput({
        primitives: [
          {
            type: 'path',
            commands: [...commands],
            stroke: context.appearance.stroke,
            strokeWidth: context.appearance.strokeWidth,
          },
          ...host,
          ...boundary,
        ],
        boundsPoints: [
          [20, 20],
          [20 + (scale - 1) * 10, 20],
        ],
      });
    },
  });
};

/** 无额外字体缓存的真实编译环境；引用布局、变换及资源在计时外准备 */
export const createPathBenchmarkFixture = (kind: PathBenchmarkKind, scale: number) => {
  const source = createPathBenchmarkSource(kind, scale);
  const custom = kind === 'iterable' || kind === 'double-stroke' || kind === 'materialized';
  if (custom) source.kind = kind;
  if (kind === 'iterable') source.children = undefined;
  const arrowRegistry = resolveArrowRegistry();
  const registries = {
    pathRegistry: resolvePathRegistry(custom ? [createPathBenchmarkDefinition(kind, scale)] : undefined),
    arrowRegistry,
    markRegistry: resolveMarkRegistry(undefined, arrowRegistry),
    patternRegistry: resolvePatternRegistry(),
  };
  const theme = resolveScopeInheritance({}, resolveThemeRegistry()).theme;
  const boundaryStore = createBoundaryStore();
  const scopeChain: Array<Transform> = kind === 'reference-clip' ? [{ kind: 'translate', x: 20, y: 30 }] : [];
  const composedTransform = composeScopeTransform(scopeChain);
  const references = new Map<string, PositionReferenceView>();
  if (kind === 'reference-clip') {
    for (let index = 0; index < scale; index++) {
      const geometry = createBoundaryGeometry(false);
      geometry.geometry.rect = { x: 20 + index * 10, y: 30, width: 8, height: 8, rotate: 0 };
      references.set(`p${index}`, {
        state: 'resolved',
        geometry: index === 0 || index === scale - 1 ? geometry : { position: [20 + index * 10, 30] },
      });
    }
  }
  const positionContext = createPositionEvaluateContext({
    nodeDistance: 24,
    boundaryStore,
    transformChain: scopeChain,
    composedTransform,
    lookupReference: id => references.get(id),
  });
  const paintRegistry = createPaintRegistry(roundPathBenchmark);
  const resolve = (path: IRPathBase): PathResolution =>
    resolvePath(path, {
      ...registries,
      mode: 'light',
      rootFontSize: 10,
      gatingOn: false,
      scopeDefaults: {},
      round: roundPathBenchmark,
      irPath: ['children', 0],
      warn: failPathBenchmarkWarning,
    });
  const resolution = resolve(source);
  paintRegistry.register(resolution.canon.stroke);
  paintRegistry.register(resolution.canon.fill);
  const context: PathCompileContext = {
    scopeChain,
    scopeDefaults: {},
    theme,
    irPath: resolution.irPath,
    registries,
    targetResolver: createPathTargetResolver(() => positionContext),
    round: roundPathBenchmark,
    rootFontSize: 10,
    measureText: textBenchmarkContext.measureText,
    boundaryStore,
    registerPaint: paintRegistry.register,
    resources: paintRegistry.getResources,
    onWarn: warning => failPathBenchmarkWarning(warning.code, warning.message),
    resolveTransform: composeScopeTransform,
  };
  // 每次操作重新创建单次绑定缓存，避免协议内样本因长期持有resolver而变成查询命中
  const freshContext = (): PathCompileContext => ({
    ...context,
    targetResolver: createPathTargetResolver(() => positionContext),
  });
  const compile = (prepared?: PreparedPathCompilation, current: PathResolution = resolution): CompiledPath =>
    compilePath(current, freshContext(), prepared);
  const preparation = { compileCalls: 0 };
  const compileForPreparation = (current: PathResolution = resolution): CompiledPath => {
    preparation.compileCalls++;
    return compile(undefined, current);
  };
  const expected = compileForPreparation();
  const snapshot = (): string =>
    JSON.stringify({
      source,
      canon: resolution.canon,
      expected,
      targets: [...(expected.targets ?? [])],
      references: [...references],
    });
  const before = snapshot();
  return {
    kind,
    scale,
    source,
    resolution,
    context,
    freshContext,
    resolve,
    compile,
    expected,
    before,
    paintRegistry,
    preparation,
    compileForPreparation,
    snapshot,
  };
};

/** 展开可观察叶图元，组层级仍在完整输出等价断言中检查 */
export const flattenPathBenchmarkPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? flattenPathBenchmarkPrimitives(primitive.children) : [primitive],
  );

/** 独立检查已知几何和装饰结果，不仅以同一实现的输出自证 */
export const verifyPathBenchmarkFixture = (
  fixture: ReturnType<typeof createPathBenchmarkFixture>,
  compiled: CompiledPath = fixture.expected,
): void => {
  const { kind, scale } = fixture;
  expect(compiled.emit).not.toBeNull();
  const leaves = flattenPathBenchmarkPrimitives(compiled.emit!.primitives);
  const paths = leaves.filter(primitive => primitive.type === 'path');
  const commands = compiled.stroke?.layout?.geometry?.commands ?? paths.at(0)?.commands ?? [];
  expect(compiled.emit!.boundsPoints.every(point => point.every(Number.isFinite))).toBe(true);
  if (kind === 'iterable') {
    expect(leaves).toHaveLength(scale);
    expect(leaves.filter(primitive => primitive.type === 'rect')).toHaveLength(scale / 2);
    expect(leaves.filter(primitive => primitive.type === 'text')).toHaveLength(scale / 2);
    expect(compiled.emit!.boundsPoints).toEqual([
      [0, 0],
      [scale * 10, 10],
    ]);
  } else if (kind === 'materialized') {
    expect(commands).toHaveLength(scale);
    expect(commands[0]).toEqual({ kind: 'move', to: [20, 20] });
    expect(commands.at(-1)).toEqual({ kind: 'line', to: [20 + (scale - 1) * 10, 20] });
    expect(
      leaves
        .filter(primitive => primitive.type === 'text')
        .flatMap(primitive => primitive.lines.map(line => line.text)),
    ).toEqual(['host', 'edge']);
    expect(compiled.stroke).toBeUndefined();
    expect(compiled.emit!.boundsPoints.length).toBeGreaterThan(2);
  } else if (kind === 'curves-shapes') {
    for (const commandKind of ['quad', 'cubic', 'arc', 'ellipseArc', 'close'])
      expect(commands.some(command => command.kind === commandKind)).toBe(true);
    // 每组圆/椭圆由完整360°弧闭合，圆角矩形贡献一个close；cycle可能以线段连接到原move
    const blocks = Math.floor(scale / 12);
    expect(commands.filter(command => command.kind === 'close')).toHaveLength(blocks);
    expect(
      commands.filter(
        command =>
          command.kind === 'ellipseArc' &&
          command.startAngle === 0 &&
          command.endAngle === 360 &&
          command.radiusX === 5 &&
          command.radiusY === 5,
      ),
    ).toHaveLength(blocks);
    expect(
      commands.filter(
        command =>
          command.kind === 'ellipseArc' &&
          command.startAngle === 0 &&
          command.endAngle === 360 &&
          command.radiusX === 8 &&
          command.radiusY === 4,
      ),
    ).toHaveLength(blocks);
  } else if (kind === 'rounded-subpaths') {
    expect(commands.filter(command => command.kind === 'move')).toHaveLength(scale / 4);
    expect(commands.filter(command => command.kind === 'close')).toHaveLength(scale / 8);
    expect(commands.some(command => command.kind === 'arc')).toBe(true);
  } else {
    expect(commands).toHaveLength(kind === 'smooth' ? scale + 1 : scale);
    const start: IRPosition = kind === 'reference-clip' ? [4, 0] : [0, 0];
    const end: IRPosition =
      kind === 'reference-clip'
        ? [(scale - 1) * 10 - 4, 0]
        : kind === 'smooth'
          ? [scale * 10, 0]
          : [(scale - 1) * 10, kind === 'absolute' ? 10 : 0];
    expect(commands[0]).toEqual({ kind: 'move', to: start });
    expect(commands.at(-1)).toMatchObject({ to: end });
    if (kind === 'smooth') expect(commands.slice(1).every(command => command.kind === 'cubic')).toBe(true);
    if (kind === 'relative-axis')
      expect(commands.slice(1, 5)).toEqual([
        { kind: 'line', to: [10, 10] },
        { kind: 'line', to: [20, 0] },
        { kind: 'line', to: [20, 30] },
        { kind: 'line', to: [30, 30] },
      ]);
    const count = scale === 16 ? 1 : 16;
    const hasLabels = kind === 'step-labels' || kind === 'interrupt-labels' || kind === 'combined';
    const texts = leaves.filter(primitive => primitive.type === 'text');
    expect(texts).toHaveLength(hasLabels ? count : 0);
    if (hasLabels)
      expect(texts.flatMap(primitive => primitive.lines.map(line => line.text))).toEqual(
        Array.from({ length: count }, (_, index) => `L${index.toString().padStart(2, '0')}`),
      );
    if (kind === 'interrupt-labels' || kind === 'combined') {
      expect(compiled.stroke?.layout?.body?.kind).toBe('interrupted');
      if (kind === 'interrupt-labels') expect(paths).toHaveLength(count + 1);
    }
    if (kind === 'marks' || kind === 'combined') {
      const marks = compiled.stroke?.layout?.marks ?? [];
      expect(marks).toHaveLength(count);
      marks.forEach((mark, index) => {
        expect(mark.placement?.point[0]).toBeCloseTo(((scale - 1) * 10 * (index + 1)) / (count + 1), 8);
        expect(mark.placement?.point[1]).toBe(0);
      });
    }
    if (kind === 'combined') {
      expect(fixture.paintRegistry.getResources()).toHaveLength(1);
      expect(compiled.emit!.primitives[0]).toMatchObject({ type: 'group', id: 'bench-path' });
      expect(compiled.stroke?.emit?.arrows?.start?.content?.length).toBeGreaterThan(0);
      expect(compiled.stroke?.emit?.arrows?.end?.content?.length).toBeGreaterThan(0);
      expect(JSON.stringify(compiled.emit)).toContain('resourceRef');
    }
    if (kind === 'double-stroke') {
      expect(paths).toHaveLength(2);
      expect(paths[0].id).toBe('first-copy');
      expect(paths[1].id).toBe('bench-path');
    }
  }
};

/** 只比较最终可观察结果，不要求复用档携带全部局部缓存字段 */
export const verifyPathBenchmarkResult = (
  fixture: ReturnType<typeof createPathBenchmarkFixture>,
  actual: CompiledPath,
  expected: CompiledPath = fixture.expected,
): void => {
  expect(actual.emit).toEqual(expected.emit);
  expect(actual.targets).toEqual(expected.targets);
  expect(actual.style).toEqual(expected.style);
  expect(fixture.snapshot()).toBe(fixture.before);
};

/** 仅保留标签排版，位置需要由当前路径重算 */
const pathLabelMeasurements = (
  slots: StrokeLabelSlots<PreparedStrokeLabelLayout> | undefined,
): StrokeLabelSlots<PreparedStrokeLabelLayout> => ({
  host: slots?.host?.map(slot => ({ measurement: slot.measurement })),
  steps: slots?.steps?.map(slot => ({ measurement: slot.measurement })),
});

/** 仅保留未放置的标签内容，避免端点更新后复用旧位置 */
const pathLabelContents = (
  slots: StrokeLabelSlots<PreparedStrokeLabelEmit> | undefined,
): StrokeLabelSlots<PreparedStrokeLabelEmit> => ({
  host: slots?.host?.map(slot => ({ content: slot.content })),
  steps: slots?.steps?.map(slot => ({ content: slot.content })),
});

/** 从真实产物选取同输入有效的prepared；半数测量保留源槽位，不复用标签位置 */
export const preparePathBenchmarkReuse = (
  compiled: CompiledPath,
  reuse: PathBenchmarkReuse,
): PreparedPathCompilation | undefined => {
  if (reuse === 'none') return undefined;
  const { targets, stroke } = compiled;
  if (reuse === 'targets') return { targets };
  if (reuse === 'all') return compiled;
  if (reuse === 'stroke') return { targets, stroke };
  if (reuse === 'layout') return { targets, stroke: { layout: stroke?.layout } };
  if (reuse === 'drawing')
    return {
      targets,
      stroke: {
        layout: stroke?.layout,
        emit: {
          body: stroke?.emit?.body,
          labels: {
            host: stroke?.emit?.labels?.host?.map((slot, index, slots) =>
              index < slots.length / 2 ? { overall: slot.overall } : {},
            ),
            steps: stroke?.emit?.labels?.steps?.map((slot, index, slots) =>
              index < slots.length / 2 ? { overall: slot.overall } : {},
            ),
          },
          marks: stroke?.emit?.marks?.map((slot, index, slots) =>
            index < slots.length / 2 ? { overall: slot.overall } : {},
          ),
        },
      },
    };
  const geometry = { geometry: stroke?.layout?.geometry, metrics: stroke?.layout?.metrics };
  if (reuse === 'geometry') return { targets, stroke: { layout: geometry } };
  if (reuse === 'marks-placement' || reuse === 'marks-content')
    return {
      targets,
      stroke: {
        layout: { ...geometry, marks: stroke?.layout?.marks },
        ...(reuse === 'marks-content'
          ? { emit: { marks: stroke?.emit?.marks?.map(slot => ({ content: slot.content })) } }
          : {}),
      },
    };
  const measurements = pathLabelMeasurements(stroke?.layout?.labels);
  if (reuse === 'labels-half') {
    for (const kind of ['host', 'steps'] as const) {
      let count = 0;
      const slots = measurements[kind];
      const half = (slots?.filter(slot => slot.measurement !== undefined).length ?? 0) / 2;
      measurements[kind] = slots?.map(slot => (slot.measurement !== undefined && count++ < half ? slot : {}));
    }
  }
  return {
    targets,
    stroke: {
      layout: { ...geometry, labels: measurements },
      ...(reuse === 'label-content' ? { emit: { labels: pathLabelContents(stroke?.emit?.labels) } } : {}),
    },
  };
};

/** 对已返回的Core原子产物检查复用消费证据，避免空prepared或整体短路冒充局部复用 */
export const verifyPathBenchmarkReuse = (
  fixture: ReturnType<typeof createPathBenchmarkFixture>,
  reuse: PathBenchmarkReuse,
  prepared: PreparedPathCompilation | undefined,
  actual: CompiledPath,
): void => {
  if (reuse === 'none') {
    expect(prepared).toBeUndefined();
    return;
  }
  expect(prepared?.targets?.size).toBe(1024);
  expect(actual.targets).toBe(prepared?.targets);
  if (reuse === 'targets') {
    expect(prepared?.stroke).toBeUndefined();
    expect(actual.stroke?.layout?.geometry).not.toBe(fixture.expected.stroke?.layout?.geometry);
    return;
  }
  if (reuse === 'all') {
    expect(actual.emit).toBe(fixture.expected.emit);
    return;
  }
  expect(prepared?.emit).toBeUndefined();
  if (reuse === 'stroke') {
    expect(actual.stroke?.emit?.overall).toBe(fixture.expected.stroke?.emit?.overall);
    return;
  }
  expect(prepared?.stroke?.emit?.overall).toBeUndefined();
  if (reuse === 'layout' || reuse === 'drawing') {
    expect(actual.stroke?.layout?.overall).toBe(fixture.expected.stroke?.layout?.overall);
    if (reuse === 'layout') expect(prepared?.stroke?.emit).toBeUndefined();
    else {
      expect(actual.stroke?.emit?.body).toBe(fixture.expected.stroke?.emit?.body);
      const slots = prepared?.stroke?.emit?.labels?.host ?? [];
      expect(slots.filter(slot => slot.overall !== undefined)).toHaveLength(8);
      slots.forEach((slot, index) => {
        if (slot.overall !== undefined) expect(actual.stroke?.emit?.labels?.host?.[index].overall).toBe(slot.overall);
      });
      prepared?.stroke?.emit?.marks?.forEach((slot, index) => {
        if (slot.overall !== undefined) expect(actual.stroke?.emit?.marks?.[index].overall).toBe(slot.overall);
      });
    }
    return;
  }
  expect(prepared?.stroke?.layout?.overall).toBeUndefined();
  expect(actual.stroke?.layout?.geometry).toBe(fixture.expected.stroke?.layout?.geometry);
  expect(actual.stroke?.layout?.metrics).toBe(fixture.expected.stroke?.layout?.metrics);
  if (reuse === 'geometry') {
    expect(prepared?.stroke?.layout?.labels).toBeUndefined();
    expect(prepared?.stroke?.layout?.marks).toBeUndefined();
    return;
  }
  if (reuse === 'marks-placement' || reuse === 'marks-content') {
    const slots = prepared?.stroke?.layout?.marks ?? [];
    expect(slots).toHaveLength(16);
    slots.forEach((slot, index) => expect(actual.stroke?.layout?.marks?.[index].placement).toBe(slot.placement));
    if (reuse === 'marks-content') {
      const contents = prepared?.stroke?.emit?.marks ?? [];
      expect(contents).toHaveLength(16);
      contents.forEach((slot, index) => {
        expect(slot.content?.length).toBeGreaterThan(0);
        expect(slot.overall).toBeUndefined();
        expect(actual.stroke?.emit?.marks?.[index].content).toBe(slot.content);
      });
    }
    return;
  }
  const slots = prepared?.stroke?.layout?.labels?.host ?? [];
  expect(slots.filter(slot => slot.measurement !== undefined)).toHaveLength(reuse === 'labels-half' ? 8 : 16);
  slots.forEach((slot, index) => {
    expect(slot.placement).toBeUndefined();
    if (slot.measurement !== undefined)
      expect(actual.stroke?.layout?.labels?.host?.[index].measurement).toBe(slot.measurement);
  });
  if (reuse === 'label-content') {
    const contents = prepared?.stroke?.emit?.labels?.host ?? [];
    expect(contents).toHaveLength(16);
    contents.forEach((slot, index) => {
      expect(slot.content).toBeDefined();
      expect(slot.overall).toBeUndefined();
      expect(actual.stroke?.emit?.labels?.host?.[index].content).toBe(slot.content);
    });
  }
};

/** 同一最终输入的完整重算/部分复用，不包含有效性比较和跨次缓存恢复 */
export const createPathBenchmarkUpdate = (kind: 'color' | 'label' | 'endpoint') => {
  const fixture = createPathBenchmarkFixture('interrupt-labels', kind === 'color' ? 16 : 1024);
  const { stroke } = fixture.expected;
  const source: IRPathBase = { ...fixture.source };
  let prepared: PreparedPathCompilation;
  if (kind === 'color') {
    source.style = { ...source.style, stroke: '#abcdef' };
    prepared = { targets: fixture.expected.targets, stroke: { layout: stroke?.layout } };
  } else if (kind === 'label') {
    source.label = createPathBenchmarkLabels(16, true).map((label, index) =>
      index === 0 ? { ...label, text: 'changed-label' } : label,
    );
    const host = stroke?.layout?.labels?.host;
    const drawing = stroke?.emit?.labels?.host;
    prepared = {
      targets: fixture.expected.targets,
      stroke: {
        layout: {
          geometry: stroke?.layout?.geometry,
          metrics: stroke?.layout?.metrics,
          labels: { host: host?.map((slot, index) => (index === 0 ? {} : slot)) },
        },
        emit: { labels: { host: drawing?.map((slot, index) => (index === 0 ? {} : slot)) } },
      },
    };
  } else {
    source.children = fixture.source.children?.map((step, index, steps) =>
      index === steps.length - 1 ? { type: 'step', kind: 'line', to: [(steps.length - 1) * 10 + 100, 60] } : step,
    );
    prepared = {
      stroke: {
        layout: { labels: pathLabelMeasurements(stroke?.layout?.labels) },
        emit: { labels: pathLabelContents(stroke?.emit?.labels) },
      },
    };
  }
  const resolution = fixture.resolve(source);
  const expected = fixture.compileForPreparation(resolution);
  const before = JSON.stringify({ source, canon: resolution.canon, prepared });
  return { fixture, source, resolution, expected, prepared, before };
};

/** 布局/绘制阶段直接消费已绑定输入和真实目标视图；不重复测目标绑定 */
export const createPathBenchmarkStroke = () => {
  const fixture = createPathBenchmarkFixture('combined', 1024);
  const bound = bindPathTargets(fixture.resolution, fixture.freshContext());
  const resolution = resolveStrokePathProviders(bound, {
    ...fixture.context.registries,
    mode: 'light',
    rootFontSize: 10,
    gatingOn: false,
    round: fixture.context.round,
    warn: failPathBenchmarkWarning,
  });
  const context: StrokePathCompileContext = {
    round: fixture.context.round,
    measureText: fixture.context.measureText,
    targetView: pathTargetViewOf(
      bound.targets,
      failPathBenchmarkWarning,
      fixture.context.boundaryStore,
      fixture.context.resolveTransform,
    ),
    options: {
      registerPaint: fixture.context.registerPaint,
      resources: fixture.context.resources,
      scopeChain: fixture.context.scopeChain,
      onWarn: fixture.context.onWarn,
    },
  };
  return { fixture, resolution, context };
};
