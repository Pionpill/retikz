import { createBoundaryStore } from '../src/compile/boundary';
import type { CompiledBoundaryGeometry } from '../src/compile/boundary';
import { compileNode } from '../src/compile/node';
import type { CompiledNode, NodeCompileContext, PreparedNodeCompilation } from '../src/compile/node';
import { createPositionEvaluateContext } from '../src/compile/reference';
import { createPaintRegistry } from '../src/compile/resource';
import { composeScopeTransform } from '../src/compile/shared';
import type { LayoutAxisProposal } from '../src/contract';
import { LayoutAxisProposalKind } from '../src/contract';
import { resolveBoundaryRegistry, resolvePatternRegistry, resolveShapeRegistry } from '../src/providers';
import { resolveNode } from '../src/resolve';
import type { IRNode, IRNodeLabel } from '../src/schemas';
import { createSharedTransformWorkload } from './_shared-transform-workloads';
import { textBenchmarkContext } from './_text-workloads';

/** 输入规模分别表示字符、片段、标签或物理行，不表示批量节点数 */
export type NodeBenchmarkKind = 'empty' | 'plain' | 'mixed' | 'labels' | 'fixed' | 'words' | 'lines' | 'gradient';

/** Core已准备阶段产物的代表组合；不代表Reconciler已部署的缓存策略 */
export type NodeBenchmarkReuse =
  | 'none'
  | 'content'
  | 'body'
  | 'labels-half'
  | 'labels-all'
  | 'layout'
  | 'drawing'
  | 'all';

/** 同输入缓存对照使用的中文维度 */
export const nodeBenchmarkReuseLabels: Record<NodeBenchmarkReuse, string> = {
  none: '不复用',
  content: '仅正文',
  body: '正文与形状',
  'labels-half': '主体与一半标签测量',
  'labels-all': '主体与全部标签测量',
  layout: '完整布局',
  drawing: '完整布局与部分绘制',
  all: '整体布局与绘制',
};

/** 2位小数圆整，与Core常用消费精度一致 */
const roundNodeBenchmark = (value: number): number => Math.round(value * 100) / 100;

/** fixture警告不能静默吞掉 */
const failNodeBenchmarkWarning = (code: string, message: string): never => {
  throw new Error(`${code}: ${message}`);
};

/** 正文与label显式使用10号字，纯文本每个UTF-16 code unit宽5单位 */
const createNodeBenchmarkSource = (kind: NodeBenchmarkKind, scale: number): IRNode => {
  const source: IRNode = {
    type: 'node',
    id: 'bench',
    position: [12, 24],
    meta: { benchmark: 'node' },
    layout: { padding: 0, margin: 0, minimumSize: 0, lineHeight: 14 },
    style: { font: { size: 10, weight: 400 }, fill: '#ffffff', stroke: '#000000', textColor: '#123456' },
  };
  if (kind === 'plain' || kind === 'gradient') source.text = 'a'.repeat(scale);
  if (kind === 'fixed' || kind === 'words') source.text = 'abcdefg '.repeat(scale / 8);
  if (kind === 'fixed') source.layout = { ...source.layout, width: 80 };
  if (kind === 'lines') source.text = Array.from({ length: scale }, () => 'abcd');
  if (kind === 'mixed')
    source.text = [
      {
        segments: Array.from({ length: scale }, (_, index) =>
          index % 2 === 0 ? { text: 'ab' } : { tex: 'x', fontSize: 10 },
        ),
      },
    ];
  if (kind === 'labels') {
    source.text = 'body';
    const positions = ['top', 'right', 'bottom', 'left'] as const;
    source.label = Array.from({ length: scale }, (_, index): IRNodeLabel => ({
      text: `L${index.toString().padStart(2, '0')}`,
      position: positions[index % 4],
      rotate: index % 2 === 0 ? 0 : 30,
      distance: 12,
      pin: true,
    }));
  }
  if (kind === 'gradient')
    source.style = {
      ...source.style,
      fill: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
      },
    };
  return source;
};

/** 真实resolver在计时外生成Canonical，不为基准手造平行节点契约 */
export const resolveNodeBenchmarkSource = (source: IRNode) =>
  resolveNode(source, {
    nodeDistance: 24,
    rootFontSize: 10,
    labelDistance: 12,
    gatingOn: true,
    mode: 'light',
    scopeDefaults: {},
    shapeRegistry: resolveShapeRegistry(),
    boundaryRegistry: resolveBoundaryRegistry(),
    patternRegistry: resolvePatternRegistry(),
    round: roundNodeBenchmark,
    irPath: [],
    warn: failNodeBenchmarkWarning,
  });

/** 单节点场景可选的真实宽度proposal与锚点变换环境 */
type NodeBenchmarkOptions = { proposal?: LayoutAxisProposal; anchorDepth?: 3 | 24 };

/** 构造无额外文字Map缓存的环境，所有档位固定同一背景资源和引用条件 */
export const createNodeBenchmarkFixture = (
  kind: NodeBenchmarkKind,
  scale: number,
  options: NodeBenchmarkOptions = {},
) => {
  const source = createNodeBenchmarkSource(kind, scale);
  if (options.proposal !== undefined && options.proposal.kind !== LayoutAxisProposalKind.Intrinsic) {
    source.rotate = 30;
    source.layout = { ...source.layout, margin: { top: 2, right: 4, bottom: 6, left: 8 } };
  }
  if (options.anchorDepth !== undefined)
    source.position = { kind: 'anchor', target: { id: 'target', anchor: 'right' }, selfAnchor: 'left' };
  const canon = resolveNodeBenchmarkSource(source);
  const boundaryStore = createBoundaryStore();
  const target: CompiledBoundaryGeometry = {
    shape: canon.shape,
    boundary: canon.boundary,
    geometry: {
      rect: { x: 200, y: 100, width: 80, height: 60, rotate: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
  const chain = options.anchorDepth === undefined ? [] : createSharedTransformWorkload(options.anchorDepth).chain;
  const composedTransform = composeScopeTransform(chain);
  const paintRegistry = createPaintRegistry(roundNodeBenchmark);
  // 渐变场景明确使用已准备资源表，不把首次资源生成和暖态查询混作同一负载
  paintRegistry.register(canon.style.fill);
  paintRegistry.register(canon.style.stroke);
  const context: NodeCompileContext = {
    measureText: textBenchmarkContext.measureText,
    texLowering: { lowerTex: textBenchmarkContext.lowerTex, warn: failNodeBenchmarkWarning },
    round: roundNodeBenchmark,
    registerPaint: paintRegistry.register,
    allocationWidthProposal: options.proposal,
    scopeChain: chain,
    composedTransform,
    boundaryState: boundaryStore.getOrCreateState(canon.shape),
    positionContext: createPositionEvaluateContext({
      nodeDistance: 24,
      boundaryStore,
      transformChain: chain,
      composedTransform,
      lookupReference: id => (id === 'target' ? { state: 'resolved', geometry: target } : undefined),
    }),
    warn: failNodeBenchmarkWarning,
  };
  const expected = compileNode(canon, context);
  const before = JSON.stringify({
    source,
    layout: canon.layout,
    text: canon.text,
    labels: canon.labels,
    style: canon.style,
    params: canon.shape.params,
  });
  return { kind, scale, source, canon, context, expected, paintRegistry, before };
};

/** 从真实完整编译结果选取有效产物，不在计时内构造缓存或保留调用方状态 */
export const prepareNodeBenchmarkReuse = (
  compiled: CompiledNode,
  reuse: NodeBenchmarkReuse,
): PreparedNodeCompilation | undefined => {
  if (reuse === 'none') return undefined;
  if (reuse === 'content') return { layout: { content: compiled.layout.content } };
  if (reuse === 'body' || reuse === 'labels-half' || reuse === 'labels-all')
    return {
      layout: {
        content: compiled.layout.content,
        shape: compiled.layout.shape,
        ...(reuse === 'body'
          ? {}
          : {
              labels: compiled.layout.labels?.map((label, index, labels) =>
                index < (reuse === 'labels-all' ? labels.length : labels.length / 2)
                  ? { measurement: label.measurement }
                  : {},
              ),
            }),
      },
    };
  const layout = { overall: compiled.layout.overall };
  if (reuse === 'layout') return { layout };
  if (reuse === 'all') return { layout, emit: { overall: compiled.emit.overall } };
  const labels = compiled.emit.labels;
  return {
    layout,
    emit: {
      shape: compiled.emit.shape,
      ...(labels === undefined || labels.length === 0
        ? {}
        : {
            content: compiled.emit.content,
            labels: labels.map((label, index) => (index < labels.length / 2 ? { overall: label.overall } : {})),
          }),
    },
  };
};

/** 只快照输入事实，避开definition函数与schema对象 */
export const snapshotNodeBenchmarkInput = (fixture: ReturnType<typeof createNodeBenchmarkFixture>): string =>
  JSON.stringify({
    source: fixture.source,
    layout: fixture.canon.layout,
    text: fixture.canon.text,
    labels: fixture.canon.labels,
    style: fixture.canon.style,
    params: fixture.canon.shape.params,
  });

/** 同一个最终输入的真实更新冷算/有效部分复用；不把该能力等同于当前Weave策略 */
export const createNodeBenchmarkUpdate = (kind: 'move' | 'color' | 'label') => {
  const fixture = createNodeBenchmarkFixture(kind === 'color' ? 'plain' : 'labels', kind === 'color' ? 32 : 16);
  const source: IRNode = { ...fixture.source };
  if (kind === 'move') source.position = [80, 100];
  if (kind === 'color') source.style = { ...source.style, textColor: '#abcdef' };
  if (kind === 'label')
    source.label = fixture.canon.labels.map((_, index): IRNodeLabel => ({
      text: index === 0 ? 'changed label' : `L${index.toString().padStart(2, '0')}`,
      position: (['top', 'right', 'bottom', 'left'] as const)[index % 4],
      rotate: index % 2 === 0 ? 0 : 30,
      distance: 12,
      pin: true,
    }));
  const canon = resolveNodeBenchmarkSource(source);
  const expected = compileNode(canon, fixture.context);
  const prepared: PreparedNodeCompilation =
    kind === 'color'
      ? { layout: { overall: fixture.expected.layout.overall } }
      : {
          layout: {
            content: fixture.expected.layout.content,
            shape: fixture.expected.layout.shape,
            labels: fixture.expected.layout.labels?.map((label, index) =>
              kind === 'label' && index === 0 ? {} : { measurement: label.measurement },
            ),
          },
        };
  return { fixture, canon, expected, prepared, source };
};
