import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  IRNode,
  ScenePrimitive,
  NodeCompileContext,
  PreparedNodeLayout,
  PositionReferenceView,
  TexLowerer,
} from '../../../../core/src';
import {
  compileNode,
  projectNodeGeometry,
  createPaintRegistry,
  createPositionEvaluateContext,
  resolveNode,
  LayoutAxisProposalKind,
} from '../../../../core/src';
import { layoutNode } from '../../../../core/src/compile/node/layout';
import { createSharedCompileContext } from '../../../src/compile';

const createFixture = (lowerTex?: TexLowerer) => {
  const shared = createSharedCompileContext({ lowerTex });
  const measureText = vi.fn(shared.host.measureText);
  const lookupReference = vi.fn(() => undefined);
  const context: NodeCompileContext = {
    round: shared.layout.round,
    registerPaint: paint => (typeof paint === 'string' ? paint : undefined),
    measureText,
    texLowering: { lowerTex, warn: () => {} },
    positionContext: createPositionEvaluateContext({ nodeDistance: 10, lookupReference }),
  };
  const resolve = (node: IRNode) =>
    resolveNode(node, {
      ...shared.registries,
      ...shared.layout,
      scopeDefaults: {},
      mode: 'light',
      gatingOn: lowerTex !== undefined,
      irPath: [],
      warn: () => {},
    });
  const source: IRNode = {
    type: 'node',
    text: 'body',
    position: [12, 24],
    label: [
      { text: 'first', position: 'top' },
      { text: 'second', position: 'bottom' },
    ],
  };
  return { context, resolve, source, measureText, lookupReference };
};

afterEach(() => vi.restoreAllMocks());

describe('节点 prepared 布局契约', () => {
  it('整体布局复用保持结果引用，查询绑定始终来自当前 canon', () => {
    const { context, resolve, source, measureText } = createFixture();
    const first = compileNode(resolve({ ...source, label: undefined }), context);
    const canon = resolve({ ...source, label: undefined, boundary: 'circle' });
    const expected = compileNode(canon, context);
    measureText.mockClear();
    const actual = compileNode(canon, context, { layout: first.layout });
    expect(actual.layout.overall).toBe(first.layout.overall);
    expect(actual.layout.shape).toBe(first.layout.shape);
    expect(actual.shape).toBe(canon.shape);
    expect(actual.boundary).toBe(canon.boundary);
    expect(actual.boundary).not.toBe(first.boundary);
    const geometry = projectNodeGeometry(actual);
    expect(geometry.shape).toBe(canon.shape);
    expect(geometry.boundary).toBe(canon.boundary);
    expect(geometry.geometry).toBe(first.layout.overall.geometry);
    expect(actual.emit.overall).toEqual(expected.emit.overall);
    expect(measureText).not.toHaveBeenCalled();
  });

  it('从编译结果选择局部产物即可复用，移动时保留测量并重算输出', () => {
    const { context, resolve, source, measureText } = createFixture();
    const first = compileNode(resolve(source), context);
    const next = resolve({ ...source, position: [80, 100] });
    const expected = compileNode(next, context);
    measureText.mockClear();
    const actual = compileNode(next, context, {
      layout: {
        content: first.layout.content,
        shape: first.layout.shape,
        labels: first.layout.labels?.map(label => ({ measurement: label.measurement })),
      },
    });
    expect(actual).toEqual(expected);
    expect(actual.layout.content).toBe(first.layout.content);
    expect(actual.layout.shape).toBe(first.layout.shape);
    expect(actual.emit.overall).not.toEqual(first.emit.overall);
    expect(measureText).not.toHaveBeenCalled();
  });

  it('整体复用保留传入的局部产物，下一次仍可选择局部复用', () => {
    const { context, resolve, source, measureText } = createFixture();
    const canon = resolve(source);
    const first = compileNode(canon, context);
    const before = JSON.stringify(first);
    const shapeEmit = vi.spyOn(canon.shape.definition, 'emit');
    measureText.mockClear();
    const cached = compileNode(canon, context, first);
    expect(cached.layout.content).toBe(first.layout.content);
    expect(cached.layout.labels).toBe(first.layout.labels);
    expect(cached.emit.content).toBe(first.emit.content);
    expect(cached.emit.labels).toBe(first.emit.labels);
    expect(cached.emit.overall).toBe(first.emit.overall);
    const replayed = compileNode(canon, context, {
      layout: cached.layout,
      emit: { content: cached.emit.content, shape: cached.emit.shape, labels: cached.emit.labels },
    });
    expect(replayed).toEqual(first);
    expect(measureText).not.toHaveBeenCalled();
    expect(shapeEmit).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).toBe(before);
  });

  it('公式正文与标签测量可以复用，宿主换色不重新降解公式', () => {
    const lowerTex = vi.fn<TexLowerer>(() => ({ width: 10, height: 8, depth: 2, paths: [] }));
    const { context, resolve, measureText } = createFixture(lowerTex);
    const first = resolve({
      type: 'node',
      text: '$x$',
      label: { text: '$y$', position: 'top' },
      style: { textColor: 'red' },
    });
    const prepared = layoutNode(first, context);
    expect(lowerTex).toHaveBeenCalled();
    const next = resolve({
      type: 'node',
      text: '$x$',
      label: { text: '$y$', position: 'top' },
      style: { textColor: 'blue' },
    });
    const expected = compileNode(next, context);
    lowerTex.mockClear();
    measureText.mockClear();
    expect(
      compileNode(next, context, {
        layout: { content: prepared.content, shape: prepared.shape, labels: prepared.labels },
      }),
    ).toEqual(expected);
    expect(lowerTex).not.toHaveBeenCalled();
    expect(measureText).not.toHaveBeenCalled();
  });

  it('锚点定位的局部复用保持标签相对偏移，节点放置命中后不读取目标', () => {
    const { context, resolve, source, measureText } = createFixture();
    const lookupReference = vi.fn<() => PositionReferenceView>(() => ({
      state: 'resolved',
      geometry: { position: [90, 50] },
    }));
    const anchorContext: NodeCompileContext = {
      ...context,
      positionContext: createPositionEvaluateContext({ nodeDistance: 10, lookupReference }),
    };
    const canon = resolve({
      ...source,
      position: { kind: 'anchor', target: { id: 'target' }, selfAnchor: 'left' },
      layout: { padding: { left: 3, right: 9, top: 4, bottom: 2 } },
    });
    const prepared = layoutNode(canon, anchorContext);
    measureText.mockClear();
    lookupReference.mockClear();
    const actual = layoutNode(canon, anchorContext, {
      content: prepared.content,
      shape: prepared.shape,
      placement: prepared.placement,
      labels: prepared.labels?.map(label => ({ measurement: label.measurement })),
    });
    expect(actual.overall).toEqual(prepared.overall);
    expect(measureText).not.toHaveBeenCalled();
    expect(lookupReference).not.toHaveBeenCalled();
    const repositioned = layoutNode(canon, anchorContext, {
      content: prepared.content,
      shape: prepared.shape,
      labels: prepared.labels,
    });
    expect(repositioned.overall).toEqual(prepared.overall);
    expect(lookupReference).toHaveBeenCalled();
  });
  it('整体与局部准备结果均等价于直接布局，复用不修改输入', () => {
    const { context, resolve, source, measureText } = createFixture();
    const canon = resolve(source);
    const prepared = layoutNode(canon, context);
    const before = JSON.stringify(prepared);
    const direct = compileNode(canon, context);
    measureText.mockClear();
    const partial: PreparedNodeLayout = {
      content: prepared.content,
      shape: prepared.shape,
      placement: prepared.placement,
      labels: prepared.labels,
    };
    expect(layoutNode(canon, context, partial).overall).toEqual(prepared.overall);
    expect(compileNode(canon, context, { layout: prepared })).toEqual(direct);
    expect(measureText).not.toHaveBeenCalled();
    expect(JSON.stringify(prepared)).toBe(before);
    const overallOnly = layoutNode(canon, context, { overall: prepared.overall });
    expect(overallOnly.content).toBeUndefined();
    expect(overallOnly.labels).toBeUndefined();
  });

  it('只修改一个标签时保留正文与其它标签测量，放置使用当前配置', () => {
    const { context, resolve, source, measureText } = createFixture();
    const prepared = layoutNode(resolve(source), context);
    const canon = resolve({
      ...source,
      label: [
        { text: 'changed', position: 'left' },
        { text: 'second', position: 'bottom' },
      ],
    });
    const expected = layoutNode(canon, context).overall;
    measureText.mockClear();
    const actual = layoutNode(canon, context, {
      content: prepared.content,
      shape: prepared.shape,
      placement: prepared.placement,
      labels: [{}, { measurement: prepared.labels?.[1].measurement }],
    });
    expect(actual.overall).toEqual(expected);
    expect(measureText).toHaveBeenCalled();
    expect(measureText.mock.calls.every(([text]) => !text.includes('body') && !text.includes('second'))).toBe(true);
    expect(actual.content).toBe(prepared.content);
    expect(actual.shape).toBe(prepared.shape);
    expect(actual.labels?.[1].measurement).toBe(prepared.labels?.[1].measurement);
  });

  it('改变位置或标签距离可以只重放放置，不测量正文和标签', () => {
    const { context, resolve, source, measureText } = createFixture();
    const prepared = layoutNode(resolve(source), context);
    const canon = resolve({
      ...source,
      position: [60, 80],
      label: [
        { text: 'first', position: 'top', distance: 25 },
        { text: 'second', position: 'bottom' },
      ],
    });
    const expected = layoutNode(canon, context).overall;
    measureText.mockClear();
    const actual = layoutNode(canon, context, {
      content: prepared.content,
      shape: prepared.shape,
      labels: prepared.labels?.map(label => ({ measurement: label.measurement })),
    });
    expect(actual.overall).toEqual(expected);
    expect(measureText).not.toHaveBeenCalled();
  });

  it('有效节点放置跳过引用查询，缺失放置仍报告定位失败', () => {
    const { context, resolve, source, lookupReference } = createFixture();
    const prepared = layoutNode(resolve(source), context);
    // 调用方已验证的放置无需再次访问引用环境
    const canon = resolve({ ...source, position: { of: 'target', direction: 'right' } });
    expect(() =>
      layoutNode(canon, context, {
        content: prepared.content,
        shape: prepared.shape,
        placement: prepared.placement,
        labels: prepared.labels,
      }),
    ).not.toThrow();
    expect(lookupReference).not.toHaveBeenCalled();
    expect(() => layoutNode(canon, context, { content: prepared.content, shape: prepared.shape })).toThrow();
    expect(lookupReference).toHaveBeenCalled();
  });

  it('无标签使用空数组，完整布局复用仍读取当前绘制外观', () => {
    const { context, resolve } = createFixture();
    const first = resolve({ type: 'node', text: 'body', style: { textColor: 'red' } });
    const prepared = layoutNode(first, context);
    expect(prepared.labels).toEqual([]);
    const next = resolve({ type: 'node', text: 'body', style: { textColor: 'blue' } });
    expect(compileNode(next, context, { layout: prepared })).toEqual(compileNode(next, context));
  });
});

describe('节点独立布局和绘制 prepared', () => {
  it('形状单独命中重放收敛预算，正文单独命中只计算形状', () => {
    const { context, resolve, measureText } = createFixture();
    const canon = resolve({ type: 'node', text: 'one two three four five six', layout: { padding: 2 } });
    const constrained = { ...context, allocationWidthProposal: { kind: LayoutAxisProposalKind.Exact, value: 60 } };
    const prepared = layoutNode(canon, constrained);
    expect(prepared.shape?.contentWidthBudget).toBeDefined();
    const shapeMeasure = vi.spyOn(canon.shape.definition, 'computeCircumscribedGeometry');
    measureText.mockClear();
    const shapeHit = layoutNode(canon, constrained, { shape: prepared.shape });
    expect(shapeHit.overall).toEqual(prepared.overall);
    expect(shapeMeasure).not.toHaveBeenCalled();
    expect(measureText).toHaveBeenCalled();
    measureText.mockClear();
    const contentHit = layoutNode(canon, constrained, { content: prepared.content });
    expect(contentHit.overall).toEqual(prepared.overall);
    expect(shapeMeasure).toHaveBeenCalled();
    expect(measureText).not.toHaveBeenCalled();
  });

  it('完整绘制命中跳过 provider 和局部产物，仍保留引用布局', () => {
    const { context, resolve, source } = createFixture();
    const canon = resolve(source);
    const layout = layoutNode(canon, context);
    const direct = compileNode(canon, context, { layout });
    const overall = direct.emit.overall;
    const before = JSON.stringify(overall);
    const shapeEmit = vi.spyOn(canon.shape.definition, 'emit');
    const registerPaint = vi.fn(context.registerPaint);
    const cached = compileNode(canon, { ...context, registerPaint }, { layout, emit: { overall } });
    expect(cached.layout.overall.geometry).toEqual(direct.layout.overall.geometry);
    expect(cached.emit).toEqual({ overall });
    expect(cached.emit.overall).toBe(overall);
    expect(shapeEmit).not.toHaveBeenCalled();
    expect(registerPaint).not.toHaveBeenCalled();
    expect(JSON.stringify(overall)).toBe(before);
  });

  it('正文、形状与单标签按需复用，空标签项重新绘制', () => {
    const { context, resolve, source } = createFixture();
    const first = resolve(source);
    const compiled = compileNode(first, context);
    if (compiled.emit.content === undefined || compiled.emit.shape === undefined || compiled.emit.labels === undefined)
      throw new Error('Expected local drawings');
    const drawing = { content: compiled.emit.content, shape: compiled.emit.shape, labels: compiled.emit.labels };
    const before = JSON.stringify(drawing);
    const next = resolve({
      ...source,
      label: [
        { text: 'changed', position: 'left' },
        { text: 'second', position: 'bottom' },
      ],
    });
    const expected = compileNode(next, context).emit.overall;
    const shapeEmit = vi.spyOn(next.shape.definition, 'emit');
    const actual = compileNode(next, context, {
      emit: { content: drawing.content, shape: drawing.shape, labels: [{}, { overall: drawing.labels[1].overall }] },
    });
    expect(actual.emit.overall).toEqual(expected);
    if (actual.emit.content === undefined || actual.emit.shape === undefined || actual.emit.labels === undefined)
      throw new Error('Expected local drawings');
    expect(actual.emit.content).toBe(drawing.content);
    expect(actual.emit.shape).toBe(drawing.shape);
    expect(actual.emit.labels[1].overall).toBe(drawing.labels[1].overall);
    expect(shapeEmit).not.toHaveBeenCalled();
    expect(JSON.stringify(drawing)).toBe(before);
  });

  it('绘制单元的空结果是有效命中，整体空结果不反推局部产物', () => {
    const { context, resolve } = createFixture();
    const canon = resolve({ type: 'node' });
    const shapeEmit = vi.spyOn(canon.shape.definition, 'emit');
    const empty: Array<ScenePrimitive> = [];
    const compiled = compileNode(canon, context, { emit: { content: empty, shape: empty, labels: [] } });
    expect(compiled.emit.overall.primitives).toEqual([]);
    expect(shapeEmit).not.toHaveBeenCalled();
    const overall = { primitives: [], bounds: [] };
    expect(compileNode(canon, context, { emit: { overall } }).emit.overall).toBe(overall);
  });
});

describe('节点绘制复用的外观与资源', () => {
  it('无分组节点复用形状时更新元数据，不污染缓存和先前输出', () => {
    const { context, resolve } = createFixture();
    const source: IRNode = { type: 'node', id: 'first', meta: { owner: 'first' }, style: { fill: 'red' } };
    const first = compileNode(resolve(source), context);
    const before = JSON.stringify(first);
    const next = resolve({ ...source, id: 'second', meta: { owner: 'second' } });
    const expected = compileNode(next, context);
    const shapeEmit = vi.spyOn(next.shape.definition, 'emit');
    const actual = compileNode(next, context, { layout: first.layout, emit: { shape: first.emit.shape } });
    expect(actual.emit.overall).toEqual(expected.emit.overall);
    expect(actual.emit.shape).toBe(first.emit.shape);
    expect(actual.emit.overall.primitives.length).toBeGreaterThan(0);
    for (const primitive of actual.emit.overall.primitives) {
      expect(primitive.type).not.toBe('group');
      expect(primitive).toMatchObject({ id: 'second', meta: { owner: 'second' } });
    }
    expect(shapeEmit).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).toBe(before);
    const withoutMetadata = compileNode(resolve({ type: 'node', style: source.style }), context, {
      layout: first.layout,
      emit: { shape: first.emit.shape },
    });
    for (const primitive of withoutMetadata.emit.overall.primitives) {
      expect(primitive.id).toBeUndefined();
      expect(primitive.meta).toBeUndefined();
    }
  });

  it.each(['content', 'shape'] as const)('只复用 %s 时其它绘制单元使用当前外观', cachedPart => {
    const { context, resolve } = createFixture();
    const first = compileNode(
      resolve({ type: 'node', text: 'body', style: { fill: 'red', textColor: 'blue' } }),
      context,
    );
    if (first.emit.content === undefined || first.emit.shape === undefined || first.emit.labels === undefined)
      throw new Error('Expected local drawings');
    const next = resolve({
      type: 'node',
      text: 'body',
      style: cachedPart === 'shape' ? { fill: 'red', textColor: 'green' } : { fill: 'yellow', textColor: 'blue' },
    });
    const expected = compileNode(next, context).emit.overall;
    const actual = compileNode(next, context, { emit: { [cachedPart]: first.emit[cachedPart] } });
    expect(actual.emit.overall).toEqual(expected);
    if (actual.emit.content === undefined || actual.emit.shape === undefined || actual.emit.labels === undefined)
      throw new Error('Expected local drawings');
    expect(actual.emit[cachedPart]).toBe(first.emit[cachedPart]);
  });

  it('渐变和标签引线绘制复用在导入配套资源后无需重新登记', () => {
    const { context, resolve, source } = createFixture();
    const gradient = {
      kind: 'linearGradient' as const,
      angle: 90,
      stops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' },
      ],
    };
    const canon = resolve({
      ...source,
      style: { fill: gradient },
      label: { text: 'label', position: 'top', pin: { stroke: gradient } },
    });
    const originalRegistry = createPaintRegistry(context.round);
    const first = compileNode(canon, { ...context, registerPaint: originalRegistry.register });
    if (first.emit.content === undefined || first.emit.shape === undefined || first.emit.labels === undefined)
      throw new Error('Expected local drawings');
    const expected = first.emit.overall;
    const resources = originalRegistry.getResources();
    expect(resources).toHaveLength(1);
    const nextRegistry = createPaintRegistry(context.round);
    resources.forEach(resource => nextRegistry.importResource(resource));
    const registerPaint = vi.fn(nextRegistry.register);
    const next = compileNode(
      canon,
      { ...context, registerPaint },
      {
        emit: {
          content: first.emit.content,
          shape: first.emit.shape,
          labels: first.emit.labels,
        },
      },
    );
    expect(next.emit.overall).toEqual(expected);
    expect(registerPaint).not.toHaveBeenCalled();
    expect(nextRegistry.getResources()).toEqual(resources);
    const shapePaint = first.emit.shape.find(primitive => 'fill' in primitive && typeof primitive.fill === 'object');
    expect(shapePaint).toMatchObject({ fill: { kind: 'resourceRef', id: resources[0].id } });
  });
});
