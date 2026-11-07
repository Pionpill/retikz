import { createBoundaryStore } from '../src/compile/boundary';
import type { CompiledBoundaryGeometry } from '../src/compile/boundary';
import { createPositionEvaluateContext } from '../src/compile/reference';
import type { CompiledReferenceGeometry } from '../src/compile/reference';
import { createClipRegistry } from '../src/compile/resource';
import type { CompileBounds } from '../src/compile/scene';
import { compileScope } from '../src/compile/scope';
import type {
  CompiledScope,
  InputScopeCompile,
  PreparedScopeCompilation,
  ScopeCompileContext,
} from '../src/compile/scope';
import type { GroupPrimitive, PathCommand, SceneClipPath } from '../src/contract';
import { resolveClipRegistry, resolveShapeRegistry, resolveThemeRegistry } from '../src/providers';
import { resolveScope, resolveScopeInheritance } from '../src/resolve/scope';
import type { IRAnimationTrack, IRPosition, IRTransform } from '../src/schemas';

/** 同输入的Core阶段产物复用；有效性和跨次资源恢复由调用方负责 */
export type ScopeBenchmarkReuse =
  | 'none'
  | 'envelope'
  | 'preparation'
  | 'placement'
  | 'layout'
  | 'clip'
  | 'layout+clip'
  | 'all';

/** 报告中的阶段名称 */
export const scopeBenchmarkReuseLabels: Record<ScopeBenchmarkReuse, string> = {
  none: '不复用',
  envelope: '仅包络',
  preparation: '仅前置准备',
  placement: '仅最终放置',
  layout: '整体布局',
  clip: '仅裁剪',
  'layout+clip': '整体布局与裁剪',
  all: '整体布局与绘制',
};

/** 使用真实resolver准备Canonical，不把解析计入Scope编译 */
export const resolveScopeBenchmarkSource = (source: InputScopeCompile) => {
  const themeRegistry = resolveThemeRegistry();
  return resolveScope(source, {
    nodeDistance: 24,
    themeRegistry,
    parent: resolveScopeInheritance({}, themeRegistry),
    shapeRegistry: resolveShapeRegistry(),
    clipRegistry: resolveClipRegistry(),
    irPath: [],
  });
};

/** 三项IR变换含真实引用；包络pivot在子布局完成后才能求解 */
export const createScopeBenchmarkTransforms = (count: 3 | 24, envelopePivot: boolean): Array<IRTransform> =>
  Array.from({ length: count / 3 }, (): Array<IRTransform> => [
    { kind: 'offset-translate', of: 'target', offset: [2, 3] },
    { kind: 'rotate', degrees: 90, pivot: envelopePivot ? 'center' : 'origin' },
    { kind: 'scale', x: 2, y: 3, pivot: envelopePivot ? 'center' : 'origin' },
  ]).flat();

/** 对跖坐标支撑已知最小圆，内部混合坐标与旋转带margin节点；顺序固定 */
export const createScopeBenchmarkLayouts = (count: number, shape: CompiledBoundaryGeometry['shape']) => {
  const layouts: Array<CompiledReferenceGeometry> = [];
  const points: Array<IRPosition> = [];
  for (let index = 0; index < count; index++) {
    if (index < 2 || (index > 3 && index % 3 === 0)) {
      const position: IRPosition =
        index === 0 ? [110, 20] : index === 1 ? [-90, 20] : [10 + (index % 21) - 10, 20 + (index % 31) - 15];
      layouts.push({ position });
      points.push(position);
      continue;
    }
    const x = index < 4 ? 10 : 10 + (index % 61) - 30;
    const y = index === 2 ? -40 : index === 3 ? 80 : 20 + (index % 101) - 50;
    const rotate = index < 4 || index % 2 === 0 ? Math.PI / 6 : 0;
    const margin = { top: 2, right: 4, bottom: 2, left: 4 };
    layouts.push({
      shape,
      boundary: { ...shape, isShape: true },
      geometry: { rect: { x, y, width: 6, height: 8, rotate }, margin },
    });
    // 外扩半宽7、半高6，独立展开旋转角点，不调用被测包络/边界helper
    for (const dx of [-7, 7])
      for (const dy of [-6, 6])
        points.push([
          x + dx * Math.cos(rotate) - dy * Math.sin(rotate),
          y + dx * Math.sin(rotate) + dy * Math.cos(rotate),
        ]);
  }
  const expectedRect =
    count === 0
      ? { x: 0, y: 0, width: 0, height: 0, rotate: 0 }
      : {
          x: 10,
          y: 20,
          width: 200,
          height: 120 + 7 + 6 * Math.sqrt(3),
          rotate: 0,
        };
  return { layouts, points, expectedRect };
};

/** 128条命令构成同一个20×10矩形，边界细分顺序固定；登记仍拥有规范化和身份计算 */
const createScopeBenchmarkClip = (): SceneClipPath => {
  const commands: Array<PathCommand> = [{ kind: 'move', to: [0, 0] }];
  const corners: Array<IRPosition> = [
    [0, 0],
    [20, 0],
    [20, 10],
    [0, 10],
    [0, 0],
  ];
  for (let side = 0; side < 4; side++) {
    const steps = side < 2 ? 32 : 31;
    for (let step = 1; step <= steps; step++)
      commands.push({
        kind: 'line',
        to: [
          corners[side][0] + ((corners[side + 1][0] - corners[side][0]) * step) / steps,
          corners[side][1] + ((corners[side + 1][1] - corners[side][1]) * step) / steps,
        ],
      });
  }
  commands.push({ kind: 'close' });
  return { commands, fillRule: 'nonzero' };
};

/** 真实context及固定子布局，背景锚点缓存和裁剪资源在计时外预置为暖态 */
export const createScopeBenchmarkFixture = (kind: 'rectangle' | 'circle', count: number, clipped = false) => {
  const source: InputScopeCompile = {
    type: 'scope',
    id: 'scope-bench',
    meta: { benchmark: 'scope' },
    zIndex: 3,
    boundingShape: kind,
    position: { kind: 'anchor', target: { id: 'target', anchor: 'right' }, selfAnchor: 'origin' },
    transforms: createScopeBenchmarkTransforms(3, true),
  };
  if (count === 0) {
    source.position = undefined;
    source.transforms = [];
  }
  const canon = resolveScopeBenchmarkSource(source);
  const nodeShape = resolveScopeBenchmarkSource({ type: 'scope' }).envelope.shape;
  const data = createScopeBenchmarkLayouts(count, nodeShape);
  const clipRegistry = createClipRegistry(value => Math.round(value * 1e6) / 1e6);
  const target: CompiledBoundaryGeometry = {
    shape: nodeShape,
    boundary: { ...nodeShape, isShape: true },
    geometry: {
      rect: { x: 200, y: 100, width: 80, height: 60, rotate: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
  const positionContext = createPositionEvaluateContext({
    nodeDistance: 24,
    boundaryStore: createBoundaryStore(),
    lookupReference: id => (id === 'target' ? { state: 'resolved', geometry: target } : undefined),
  });
  const context: ScopeCompileContext = {
    positionContext,
    layouts: data.layouts,
    resolvedClipPath: clipped ? createScopeBenchmarkClip() : undefined,
    registerClip: clipRegistry.register,
    registerClipPath: clipRegistry.registerPath,
    irPath: [],
    onWarn: warning => {
      throw new Error(`${warning.code}: ${warning.message}`);
    },
  };
  const expected = compileScope(canon, context);
  const before = JSON.stringify({
    source,
    layouts: data.layouts,
    transform: canon.transform,
    style: canon.style,
    clip: context.resolvedClipPath,
  });
  return { source, canon, context, data, target, expected, before, clipRegistry };
};

/** 比较纯数据事实，避免快照definition函数与schema */
export const snapshotScopeBenchmarkInput = (fixture: ReturnType<typeof createScopeBenchmarkFixture>): string =>
  JSON.stringify({
    source: fixture.source,
    layouts: fixture.data.layouts,
    transform: fixture.canon.transform,
    style: fixture.canon.style,
    clip: fixture.context.resolvedClipPath,
  });

/** 只传入对应阶段，不借助其它阶段隐藏计算；无裁剪命中保留空对象语义 */
export const prepareScopeBenchmarkReuse = (
  compiled: CompiledScope,
  mode: ScopeBenchmarkReuse,
): PreparedScopeCompilation | undefined => {
  switch (mode) {
    case 'none':
      return undefined;
    case 'envelope':
      return { layout: { envelope: compiled.layout.envelope } };
    case 'preparation':
      return { layout: { preparation: compiled.layout.preparation } };
    case 'placement':
      return { layout: { placement: compiled.layout.placement } };
    case 'layout':
      return { layout: { overall: compiled.layout.overall } };
    case 'clip':
      return { emit: { clip: compiled.emit.clip ?? {} } };
    case 'layout+clip':
      return { layout: { overall: compiled.layout.overall }, emit: { clip: compiled.emit.clip ?? {} } };
    case 'all':
      return { layout: { overall: compiled.layout.overall }, emit: { overall: compiled.emit.overall } };
  }
};

/** 三种实际调用时序的有效部分复用，不评测调用方的失效管理 */
export const createScopeBenchmarkUpdate = (kind: 'move' | 'children' | 'animation') => {
  const fixture = createScopeBenchmarkFixture('rectangle', 32, kind === 'animation');
  const source: InputScopeCompile = kind === 'move' ? { ...fixture.source, position: [80, 100] } : fixture.source;
  const canon = resolveScopeBenchmarkSource(source);
  const animations: Array<IRAnimationTrack> = [
    {
      property: 'opacity',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 400,
      trigger: 'load',
    },
  ];
  const layouts: Array<CompiledReferenceGeometry> =
    kind === 'children'
      ? fixture.data.layouts.map(layout =>
          'position' in layout
            ? { position: [layout.position[0] + 30, layout.position[1] + 40] }
            : {
                ...layout,
                geometry: {
                  ...layout.geometry,
                  rect: { ...layout.geometry.rect, x: layout.geometry.rect.x + 30, y: layout.geometry.rect.y + 40 },
                },
              },
        )
      : fixture.data.layouts;
  const context: ScopeCompileContext = { ...fixture.context, layouts, ...(kind === 'animation' ? { animations } : {}) };
  const prepared: PreparedScopeCompilation =
    kind === 'move'
      ? { layout: { envelope: fixture.expected.layout.envelope } }
      : kind === 'children'
        ? { layout: { preparation: fixture.expected.layout.preparation } }
        : { layout: fixture.expected.layout, emit: { clip: fixture.expected.emit.clip ?? {} } };
  const expected = compileScope(canon, context);
  return { fixture, source, canon, context, prepared, expected };
};

/** 普通布局透传阴影，装饰经真实clip资源裁剪；贡献数是单次整组操作的规模 */
export const createScopeBenchmarkBounds = (count: number, decoration: boolean) => {
  const fixture = createScopeBenchmarkFixture('rectangle', 32, true);
  const bounds: Array<CompileBounds> = Array.from({ length: count }, (_, index) => ({
    boundsPoints: decoration
      ? [
          [-5 - index, -5],
          [25 + index, 15],
        ]
      : [
          [index, -2],
          [index + 4, 6],
        ],
    ...(decoration ? { decoration: true } : { shadow: { offsetX: 3, offsetY: -4, blur: 2, color: '#000' } }),
  }));
  const group: Omit<GroupPrimitive, 'children'> = {
    type: 'group',
    clipRef: fixture.expected.emit.overall.clipRef,
    transforms: [
      { kind: 'translate', x: 11, y: -7 },
      { kind: 'scale', x: 2, y: 3 },
    ],
  };
  return { bounds, group, resources: fixture.clipRegistry.getResources() };
};
