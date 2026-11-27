import type {
  AnyCompositeDefinition,
  CompileWarning,
  GroupPrimitive,
  IRChild,
  IRNode,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
} from '@retikz/core';
import { ChildSchema, CompositeBaseSchema, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { pathClipDefinition } from '@retikz/extension';
import { createFlexLayout, flexLayoutDefinition } from '@retikz/layout';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import {
  composeBlock,
  composeBlockContent,
  composeBlockFooter,
  composeBlockHeader,
  composeBlockSection,
  composeBlockTitle,
  composeBlockDescription,
} from '../../src/block/_structure';
import { createSurface, surfaceDefinition } from '../../src/presentation';
import { fullScopeProps } from '../composites/presentation/scope-props';
import { compileTestResult } from '../helpers/compilation';
import { sceneNodeBounds, sceneNodes } from '../helpers/scene-geometry';

/** 以明确尺寸的普通 Node 验证布局，不引入实体或私有布局协议 */
const node = (id: string, width = 20, height = 10): IRNode => ({
  type: 'node',
  id,
  style: { fill: '#eee', stroke: 'none' },
  layout: { minimumSize: { width, height }, padding: 0, margin: 0 },
});

/** 通过公开 child probe 观察整个组合的 allocation 与 Scene */
const compile = (
  child: IRChild,
  proposal: LayoutProposal = {
    x: { kind: 'intrinsic', mode: 'natural' },
    y: { kind: 'intrinsic', mode: 'natural' },
  },
  additionalDefinitions: Array<AnyCompositeDefinition> = [],
) => {
  let observed: LayoutChildResult | undefined;
  const warnings: Array<CompileWarning> = [];
  const harness = defineComposite({
    namespace: 'block-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('block-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (source, context) => {
      const probe = context.layoutChild(source.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });
  const output = compileTestResult(
    { type: 'scene', version: 1, children: [{ namespace: 'block-test', type: 'harness', child }] },
    {
      composites: [harness, surfaceDefinition, flexLayoutDefinition, ...additionalDefinitions],
      clips: [pathClipDefinition],
      padding: 0,
      onWarn: warning => warnings.push(warning),
    },
  );
  if (observed === undefined) throw new Error('Expected a successful Block layout probe');
  return { observed, output, warnings };
};

/** 找到 authored Node 的公开空间结果 */
const bounds = (result: ReturnType<typeof compile>, id: string) => sceneNodeBounds(result.output.scene, id);

/** 读取真实 Scene group，检查 Scope 属性落点 */
const groups = (primitives: ReadonlyArray<ScenePrimitive>): Array<GroupPrimitive> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groups(primitive.children)] : []));

describe('Block 内部结构编译', () => {
  it('按内容确定尺寸，padding 只消费一次且没有旧最小宽度', () => {
    const result = compile(composeBlock({ id: 'block', padding: 5, children: [node('child')] }));
    expect(result.observed.slotSize).toEqual({ width: 30, height: 20 });
    expect(bounds(result, 'child')).toMatchObject({ x: 5, y: 5, width: 20, height: 10 });
  });

  it('固定尺寸包含 padding，根 transform 与 meta 仅落一次', () => {
    const result = compile(
      composeBlock({
        id: 'block',
        padding: 5,
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 50 } },
        transforms: [{ kind: 'translate', x: 7, y: 11 }],
        meta: { owner: 'entity' },
        children: [node('child')],
      }),
    );
    expect(result.observed.slotSize).toEqual({ width: 100, height: 50 });
    const roots = groups(result.output.scene.primitives).filter(group => group.id === 'block');
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ meta: { owner: 'entity' }, transforms: [{ kind: 'translate', x: 7, y: 11 }] });
    expect(result.output.scene.layout).toMatchObject({ x: 7, y: 11, width: 100, height: 50 });
  });

  it('fill 使用父级有限尺寸，缺少有限 proposal 时保留下层失败', () => {
    const child = composeBlockContent({ padding: 5, size: { x: { kind: 'fill' } }, children: [node('child')] });
    expect(
      compile(child, { x: { kind: 'exact', value: 80 }, y: { kind: 'intrinsic', mode: 'natural' } }).observed.slotSize,
    ).toEqual({ width: 80, height: 20 });
    expect(() => compile(child)).toThrow(/fill/i);
  });

  it('开放树保留区域重复、嵌套及 authored 顺序', () => {
    const result = compile(
      composeBlock({
        children: [
          composeBlockFooter({ padding: 0, children: [node('first')] }),
          composeBlockContent({ padding: 0, children: [composeBlockSection({ children: [node('second')] })] }),
          composeBlockFooter({ padding: 0, children: [node('third')] }),
        ],
      }),
    );
    expect(result.observed.slotSize).toEqual({ width: 20, height: 30 });
    expect(['first', 'second', 'third'].map(id => bounds(result, id).y)).toEqual([0, 10, 20]);
  });

  it('已注册的任意扩展 child 使用相同 Core 编译路径', () => {
    const annotation = defineComposite({
      namespace: 'third',
      type: 'annotation',
      schema: CompositeBaseSchema.extend({ namespace: literal('third'), type: literal('annotation') }),
      compile: () => ({ children: [node('annotation', 25, 12)] }),
    });
    const result = compile(composeBlockContent({ children: [{ namespace: 'third', type: 'annotation' }] }), undefined, [
      annotation,
    ]);
    expect(result.observed.slotSize).toEqual({ width: 49, height: 36 });
    expect(bounds(result, 'annotation')).toEqual({ x: 12, y: 12, width: 25, height: 12 });
  });

  it.each([
    ['Header', composeBlockHeader, 44, 34],
    ['Content', composeBlockContent, 44, 34],
    ['Footer', composeBlockFooter, 44, 34],
    ['Section', composeBlockSection, 20, 10],
  ] as const)('%s 可独立组合并应用自身默认 padding', (_name, composeRegion, width, height) => {
    expect(compile(composeRegion({ children: [node('child')] })).observed.slotSize).toEqual({ width, height });
  });

  it('显式零间距/内边距/圆角和 none 边框覆盖默认', () => {
    const result = compile(
      composeBlockContent({
        padding: 0,
        gap: 0,
        cornerRadius: 0,
        border: { stroke: 'none' },
        children: [node('a'), node('b')],
      }),
    );
    expect(result.observed.slotSize).toEqual({ width: 20, height: 20 });
    expect(bounds(result, 'b').y).toBe(10);
  });

  it('Header 主体增长，accessory 保持自然宽度', () => {
    const result = compile(
      composeBlockHeader({
        padding: 0,
        size: { x: { kind: 'fixed', value: 100 } },
        children: [node('main')],
        accessory: node('accessory', 10, 6),
      }),
    );
    expect(result.observed.slotSize).toEqual({ width: 100, height: 10 });
    expect(bounds(result, 'accessory')).toMatchObject({ x: 90, y: 2, width: 10, height: 6 });
  });

  it('Header 空槽不产生间距，主体 contentGap 只作用于主体', () => {
    const accessoryOnly = compile(composeBlockHeader({ padding: 0, children: [], accessory: node('accessory') }));
    expect(accessoryOnly.observed.slotSize).toEqual({ width: 20, height: 10 });
    expect(bounds(accessoryOnly, 'accessory').x).toBe(0);
    const mainOnly = compile(composeBlockHeader({ padding: 0, children: [node('a'), node('b')] }));
    expect(mainOnly.observed.slotSize).toEqual({ width: 20, height: 24 });
    expect(bounds(mainOnly, 'b').y).toBe(14);
  });

  it('Footer 使用 row/end，自然参与根布局而不贴底', () => {
    const result = compile(
      composeBlock({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 80 } },
        children: [
          node('content'),
          composeBlockFooter({ padding: 0, children: [node('left', 10), node('right', 10)] }),
        ],
      }),
    );
    expect(bounds(result, 'left')).toMatchObject({ x: 72, y: 10 });
    expect(bounds(result, 'right')).toMatchObject({ x: 90, y: 10 });
  });

  it('空区域保留确定尺寸、padding 和根身份', () => {
    const result = compile(
      composeBlockHeader({ id: 'empty', size: { x: { kind: 'fixed', value: 60 } }, children: [] }),
    );
    expect(result.observed.slotSize).toEqual({ width: 60, height: 24 });
    expect(groups(result.output.scene.primitives).filter(group => group.id === 'empty')).toHaveLength(1);
  });

  it('完整 Scope 与手写 Surface/Flex 结果等价，保留公开下层产物', () => {
    const children = [composeBlockTitle({ id: 'title', text: 'Title', meta: { authored: true } })];
    const result = compile(composeBlockContent({ ...fullScopeProps, padding: 0, gap: 0, children }));
    const ordinary = compile(
      createSurface({
        ...fullScopeProps,
        namespace: 'standard',
        type: 'surface',
        padding: 0,
        child: createFlexLayout({
          direction: 'column',
          gap: 0,
          children: children.map(child => ({ kind: 'flex', child })),
        }),
      }),
    );
    expect(result.output).toEqual(ordinary.output);
    expect(result.output.artifacts.length > 0).toBe(true);
    expect(sceneNodes(result.output.scene).filter(entry => entry.id === 'title')).toHaveLength(1);
  });

  it('Surface 保持背景/内容/边框隔离与双层裁剪，不改变 allocation', () => {
    const result = compile(
      composeBlock({
        id: 'clipped',
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } },
        background: { fill: '#fff' },
        border: { stroke: '#000', strokeWidth: 2 },
        overflow: 'clip',
        cornerRadius: 4,
        clip: { kind: 'rect', params: { x: 1, y: 1, width: 20, height: 20 } },
        children: [{ ...node('child'), zIndex: 99, style: { fill: '#f00', stroke: 'none' } }],
      }),
    );
    const root = groups(result.output.scene.primitives).find(group => group.id === 'clipped');
    expect(root?.children.map(child => child.type)).toEqual(['path', 'group', 'path']);
    const content = root?.children[1];
    expect(content?.type).toBe('group');
    if (content?.type === 'group') {
      expect(content.clipRef).toBeDefined();
      expect(content.clipRef).not.toBe(root?.clipRef);
    }
    expect(root?.clipRef).toBeDefined();
    expect(result.output.scene.resources?.clips).toHaveLength(2);
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 30 });
  });

  it('默认外框保留低透明度边框，显式 border 按复合字段替换', () => {
    const pathsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
      primitives.flatMap(primitive =>
        primitive.type === 'group' ? pathsOf(primitive.children) : primitive.type === 'path' ? [primitive] : [],
      );
    const defaults = pathsOf(compile(composeBlock({ children: [node('child')] })).output.scene.primitives);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]).toMatchObject({ strokeOpacity: 0.2, strokeWidth: 1, fill: 'none' });
    const replacement = pathsOf(
      compile(composeBlock({ border: { stroke: '#000' }, children: [node('child')] })).output.scene.primitives,
    );
    expect(replacement[0]).toMatchObject({ stroke: '#000' });
    expect(replacement[0]).not.toHaveProperty('strokeOpacity');
  });

  it('显式局部 namespace 隔离同名 child，不产生内部公共身份', () => {
    const result = compile(
      composeBlock({
        id: 'root',
        children: [
          composeBlockContent({ id: 'a', localNamespace: true, children: [node('member')] }),
          composeBlockContent({ id: 'b', localNamespace: true, children: [node('member')] }),
        ],
      }),
    );
    expect(result.warnings).toEqual([]);
    expect(
      groups(result.output.scene.primitives)
        .map(group => group.id)
        .filter(id => id && ['root', 'a', 'b'].includes(id)),
    ).toEqual(['root', 'a', 'b']);
  });

  it('padding 无法容纳时保留下层失败，不改成 content fallback', () => {
    expect(() =>
      compile(
        composeBlockContent({ padding: 12, size: { x: { kind: 'fixed', value: 10 } }, children: [node('child')] }),
      ),
    ).toThrow(/padding|minimum|fit/i);
  });

  it('省略与可选 undefined 等价，生成的下层 IR 可直接消费', () => {
    const title = composeBlockTitle({
      text: 'Title',
      id: undefined,
      style: { font: { size: undefined } },
      layout: { padding: undefined },
    });
    expect(compile(composeBlockContent({ padding: undefined, size: undefined, children: [title] })).output).toEqual(
      compile(composeBlockContent({ children: [composeBlockTitle({ text: 'Title' })] })).output,
    );
  });

  it('生成的合法 child JSON 往返等价，编译不修改输入', () => {
    const options = { padding: 0, children: [composeBlockTitle({ text: 'Title' })] };
    const before = JSON.stringify(options);
    const child = composeBlockContent(options);
    expect(compile(JSON.parse(JSON.stringify(child))).output).toEqual(compile(child).output);
    expect(JSON.stringify(options)).toBe(before);
  });

  it('普通 Node 承担标题/说明的测量，字体覆盖逐字段保留', () => {
    const title = composeBlockTitle({ id: 'title', text: 'Title', style: { font: { family: 'serif', size: 20 } } });
    const description = composeBlockDescription({ text: 'Description' });
    expect(title.style?.font).toEqual({ family: 'serif', size: 20, weight: 'bold' });
    const ordinary: IRNode = {
      type: 'node',
      id: 'title',
      text: 'Title',
      style: { fill: 'none', stroke: 'none', font: { size: 20, weight: 'bold', family: 'serif' } },
      layout: { padding: 0, margin: 0, minimumSize: 0 },
    };
    expect(compile(title).output.scene).toEqual(compile(ordinary).output.scene);
    expect(description.style).toMatchObject({ opacity: 0.7, font: { size: 'xs' } });
  });

  it('布局 refinement、缺失 child provider 和重复身份保持真实诊断', () => {
    expect(() => compile(composeBlockContent({ alignItems: 'first-baseline', children: [node('child')] }))).toThrow(
      /baseline/i,
    );
    expect(() => compile(composeBlock({ children: [{ namespace: 'missing', type: 'child' }] }))).toThrow(/missing/i);
    expect(compile(composeBlock({ children: [node('duplicate'), node('duplicate')] })).warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_NODE_ID' })]),
    );
  });
});
