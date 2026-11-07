import { describe, expect, it } from 'vitest';

import {
  compileNode,
  resolveNode,
  LayoutAxisProposalKind,
  compileScope,
  createPositionEvaluateContext,
  prepareScopePlacement,
  resolveScope,
  resolveScopeInheritance,
} from '../../../../core/src';
import type { ScopeCompileContext, IRScope } from '../../../../core/src';
import { layoutNode } from '../../../../core/src/compile/node/layout';
import { createSharedCompileContext } from '../../../src/compile';
import { createCompileRuntime } from '../../../src/compile/runtime';
import { flattenPrims } from '../../helpers/flatten';

describe('原子编译阶段', () => {
  it('宽度反馈重排复用同次文字测量，新一轮编译重新测量', () => {
    const shared = createSharedCompileContext({ fontSize: 10 });
    const canon = resolveNode(
      { type: 'node', text: 'one two three four' },
      {
        ...shared.registries,
        ...shared.layout,
        scopeDefaults: {},
        mode: 'light',
        gatingOn: false,
        irPath: [],
        warn: () => {},
      },
    );
    const calls = new Map<string, number>();
    const layout = () => {
      const runtime = createCompileRuntime(
        { type: 'scene', version: 1, children: [] },
        {
          measureText: (text, font) => {
            const key = JSON.stringify([text, font]);
            calls.set(key, (calls.get(key) ?? 0) + 1);
            return { width: text.length * 5, height: 10 };
          },
        },
      );
      return layoutNode(canon, {
        measureText: runtime.context.host.measureText,
        positionContext: createPositionEvaluateContext({ lookupReference: () => undefined, nodeDistance: 10 }),
        allocationWidthProposal: { kind: LayoutAxisProposalKind.Exact, value: 60 },
      }).overall;
    };
    const first = layout();
    expect(first.geometry.contentSize.height).toBeGreaterThan(12);
    expect(calls.size).toBeGreaterThan(1);
    expect([...calls.values()].every(count => count === 1)).toBe(true);
    expect(layout()).toEqual(first);
    expect([...calls.values()].every(count => count === 2)).toBe(true);
  });

  it('Scope 消费提前冻结的放置数据，与本次直接计算结果一致', () => {
    const shared = createSharedCompileContext();
    const input: IRScope = { type: 'scope', transforms: [{ kind: 'translate', x: 10, y: 20 }], children: [] };
    const canon = resolveScope(input, {
      ...shared.registries,
      nodeDistance: shared.layout.nodeDistance,
      parent: resolveScopeInheritance({}, shared.registries.themeRegistry),
      irPath: [],
    });
    const context: ScopeCompileContext = {
      layouts: [],
      positionContext: createPositionEvaluateContext({
        lookupReference: () => undefined,
        nodeDistance: shared.layout.nodeDistance,
      }),
      irPath: [],
      onWarn: () => {},
      registerClip: () => 'clip',
      registerClipPath: () => 'clip-path',
    };
    const placement = prepareScopePlacement(input, context);
    const prepared = compileScope(canon, context, { layout: { preparation: placement } });
    expect(prepared).toEqual(compileScope(canon, context));
    expect(prepared.layout.overall.transforms).toContainEqual({ kind: 'translate', x: 10, y: 20 });
  });

  it('同一解析结果可用于不同宽度布局，公式解析诊断不随布局重试重复', () => {
    const shared = createSharedCompileContext({ fontSize: 20 });
    const warnings: Array<string> = [];
    const resolution = resolveNode(
      { type: 'node', text: 'one two $unfinished', label: { text: 'label $unfinished' } },
      {
        ...shared.registries,
        ...shared.layout,
        scopeDefaults: {},
        mode: 'light',
        gatingOn: true,
        irPath: [],
        warn: code => warnings.push(code),
      },
    );
    expect(warnings).toEqual(['TEXT_TEX_PARSE_ERROR', 'TEXT_TEX_PARSE_ERROR']);
    const before = JSON.stringify(resolution);
    const layouts = [80, 500].map(
      value =>
        layoutNode(resolution, {
          measureText: (text, font) => ({ width: (text.length * font.size) / 2, height: font.size }),
          positionContext: {
            nodeDistance: 10,
            evaluateNodeTargetPoint: () => [0, 0],
            lookupReference: () => undefined,
            toLocal: point => point,
            toWorld: point => point,
          },
          allocationWidthProposal: { kind: LayoutAxisProposalKind.Exact, value },
        }).overall,
    );
    expect(layouts[0].geometry.contentSize.height).toBeGreaterThan(layouts[1].geometry.contentSize.height);
    expect(JSON.stringify(resolution)).toBe(before);
    expect(warnings).toHaveLength(2);
  });

  it('节点解析、布局和输出仅通过显式能力组合，不要求元素工作区', () => {
    const shared = createSharedCompileContext();
    const warnings: Array<string> = [];
    const resolution = resolveNode(
      { type: 'node', id: 'a', position: [12, 24], text: 'A', style: { fill: 'red' } },
      {
        ...shared.registries,
        ...shared.layout,
        gatingOn: shared.host.lowerTex !== undefined,
        scopeDefaults: {},
        mode: 'light',
        irPath: ['children', 0],
        warn: (_code, message) => warnings.push(message),
      },
    );
    const compilation = compileNode(resolution, {
      round: shared.layout.round,
      registerPaint: paint => {
        if (paint !== undefined && typeof paint !== 'string') throw new Error('expected solid paint');
        return paint;
      },
      measureText: shared.host.measureText,
      positionContext: {
        nodeDistance: 10,
        evaluateNodeTargetPoint: () => [0, 0],
        lookupReference: () => undefined,
        toLocal: point => point,
        toWorld: point => point,
      },
    });
    const output = compilation.emit.overall;
    expect(compilation.layout.overall.geometry.rect).toMatchObject({ x: 12, y: 24 });
    expect(
      flattenPrims(output.primitives).some(primitive => primitive.type === 'rect' && primitive.fill === 'red'),
    ).toBe(true);
    expect(output.bounds[0].boundsPoints).toHaveLength(4);
    expect(warnings).toEqual([]);
  });
});
