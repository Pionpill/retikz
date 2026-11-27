import {
  ChildSchema,
  createCompositeInputBindings,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  naturalLayoutProposal,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { InputEmbedAdapter, InputEmbedContribution, InputScene } from '../../src';
import { embed, SceneRuntime, compileToScene, normalizeScene } from '../../src';

const leafDefinition = defineComposite({
  namespace: 'fixture',
  type: 'prepared',
  schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('prepared') }),
  compile: (_node, context) => ({ children: [{ type: 'node', position: [0, 0], text: String(context.runtimeInput) }] }),
});

const makeContribution = (text: string): InputEmbedContribution => ({
  node: { namespace: 'fixture', type: 'prepared' },
  providerDependencies: { roots: [], providers: [] },
  runtimeInputs: [{ path: [], input: text }],
});

const adapter: InputEmbedAdapter<{ text: string }> = {
  kind: 'prepared',
  lower: props => makeContribution(props.text),
};

const source = (text: string): InputScene => ({
  type: 'scene',
  children: [embed({ adapter, props: { text } })],
});

describe('预处理复合组件输入的消费', () => {
  it('同一父级分两次归一化子项时，为匿名位置分配不同身份', () => {
    const leaf: InputEmbedAdapter = {
      kind: 'label',
      lower: (_, context) => ({
        node: { type: 'node', id: context.id, position: [0, 0] },
        providerDependencies: { roots: [], providers: [] },
      }),
    };
    const child = embed({ adapter: leaf, props: {} });
    const parent: InputEmbedAdapter = {
      kind: 'slots',
      lower: (_, context) => {
        const normalize = context.normalizeChildren!;
        return {
          node: { type: 'scope', children: [...normalize([child]).children, ...normalize([child]).children] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
    };
    const result = compileToScene({ type: 'scene', children: [embed({ adapter: parent, props: {} })] });
    const group = result.scene.primitives[0];
    if (group.type !== 'group') throw new Error('Expected the authored Scope group');
    expect(new Set(group.children.map(item => item.id)).size).toBe(2);
  });

  it('匿名实例的输入不会串位', () => {
    const input: InputScene = {
      type: 'scene',
      children: [...source('left-ready').children, ...source('right-ready').children],
    };
    const options = { compile: { composites: [leafDefinition] } };
    const sync = compileToScene(input, options);
    expect(JSON.stringify(sync.scene)).toContain('left-ready');
    expect(JSON.stringify(sync.scene)).toContain('right-ready');
  });

  it('直接传入 IR 时保留与其绑定的 Composite 实例输入', () => {
    const { ir } = normalizeScene(source('authoring'));
    const options = {
      compile: {
        composites: [leafDefinition],
        compositeInputs: createCompositeInputBindings(ir, [{ path: ['children', 0], input: 'bound-to-ir' }]),
      },
    };
    const runtime = new SceneRuntime(ir, options);
    try {
      expect(runtime.toSvgString()).toContain('bound-to-ir');
      expect(compileToScene(ir, options).scene).toEqual(runtime.current.compilation.result.scene);
    } finally {
      runtime.dispose();
    }
  });

  it('编写规范化为相同的 JSON 时更新准备好的输入', () => {
    const controller = SceneRuntime.fromInput(source('first-ready'), {
      compile: { composites: [leafDefinition] },
    });
    controller.replace(source('second-ready'));

    expect(controller.current.revision).toBe(1);
    expect(JSON.stringify(controller.current.compilation.result.scene)).toContain('second-ready');
    expect(JSON.stringify(controller.current.compilation.result.scene)).not.toContain('first-ready');

    // IR 不携带作者侧实例输入，但仍使用调用方注册的 definition
    controller.replace(normalizeScene(source('ir-only')).ir);
    const irScene = JSON.stringify(controller.current.compilation.result.scene);
    expect(irScene).toContain('undefined');
    expect(irScene).not.toContain('first-ready');
    expect(irScene).not.toContain('second-ready');

    controller.replace(source('third-ready'));
    expect(controller.toSvgString()).toContain('third-ready');
    expect(controller.toSvgString()).not.toContain('second-ready');

    controller.dispose();
  });

  it('通过不透明的 Source 槽位传输准备好的嵌套子级', () => {
    const outerDefinition = defineComposite({
      namespace: 'fixture',
      type: 'outer',
      schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('outer'), child: ChildSchema }),
      compile: (_node, context) => {
        const child = context.selectSourceChild(['child']);
        const probe = context.layoutChild(child, naturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

        return { children: [context.replay(probe.result)] };
      },
    });
    const outer: InputEmbedAdapter<unknown> = {
      kind: 'outer',
      lower: (_props, context) => {
        const children = context.normalizeChildren!(source('slot-ready').children);
        return {
          node: { namespace: 'fixture', type: 'outer', child: children.children[0] },
          providerDependencies: children.providerDependencies,
          runtimeInputs: children.runtimeInputs?.map(input => ({
            ...input,
            path: ['child', ...input.path.slice(1)],
          })),
        };
      },
    };
    const result = compileToScene(
      { type: 'scene', children: [embed({ adapter: outer, props: {} })] },
      { compile: { composites: [leafDefinition, outerDefinition] } },
    );

    expect(JSON.stringify(result.scene)).toContain('slot-ready');
    expect(JSON.stringify(result.scene)).not.toContain('undefined');
  });
});
