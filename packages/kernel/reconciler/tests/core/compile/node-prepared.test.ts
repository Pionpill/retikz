import { describe, expect, it, vi } from 'vitest';

import type {
  IRNode,
  NodeCompileContext,
  PreparedNodeLayout,
  PositionReferenceView,
  TexLowerer,
} from '../../../../core/src';
import { compileNode, createPositionEvaluateContext, layoutNode, resolveNode } from '../../../../core/src';
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

describe('节点 prepared 布局契约', () => {
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
    expect(compileNode(next, context, { layout: { body: prepared.body, labels: prepared.labels } })).toEqual(expected);
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
      body: prepared.body,
      placement: prepared.placement,
      labels: prepared.labels?.map(label => ({ measurement: label.measurement })),
    });
    expect(actual.overall).toEqual(prepared.overall);
    expect(measureText).not.toHaveBeenCalled();
    expect(lookupReference).not.toHaveBeenCalled();
    const repositioned = layoutNode(canon, anchorContext, { body: prepared.body, labels: prepared.labels });
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
    const partial: PreparedNodeLayout = { body: prepared.body, placement: prepared.placement, labels: prepared.labels };
    expect(layoutNode(canon, context, partial).overall).toEqual(prepared.overall);
    expect(compileNode(canon, context, { layout: prepared })).toEqual(direct);
    expect(measureText).not.toHaveBeenCalled();
    expect(JSON.stringify(prepared)).toBe(before);
    const overallOnly = layoutNode(canon, context, { overall: prepared.overall });
    expect(overallOnly.body).toBeUndefined();
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
      body: prepared.body,
      placement: prepared.placement,
      labels: [{}, { measurement: prepared.labels?.[1].measurement }],
    });
    expect(actual.overall).toEqual(expected);
    expect(measureText).toHaveBeenCalled();
    expect(measureText.mock.calls.every(([text]) => !text.includes('body') && !text.includes('second'))).toBe(true);
    expect(actual.body).toBe(prepared.body);
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
      body: prepared.body,
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
        body: prepared.body,
        placement: prepared.placement,
        labels: prepared.labels,
      }),
    ).not.toThrow();
    expect(lookupReference).not.toHaveBeenCalled();
    expect(() => layoutNode(canon, context, { body: prepared.body })).toThrow();
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
