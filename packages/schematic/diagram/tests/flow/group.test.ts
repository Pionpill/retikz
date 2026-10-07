import type { ScenePrimitive } from '@retikz/core';
import { compileToScene, DEFAULT_RESOLVED_THEME, resolveCoreProviderDependencies } from '@retikz/core';
import { GroupCaptionSchema, GroupSchema } from '@retikz/graph';
import { describe, expect, it } from 'vitest';

import * as Flow from '../../src/flow';
import { resolveFlowDiagram } from '../../src/flow/resolve';

const flow = (group: Omit<Flow.IRFlowGroup, 'id' | 'children'>): Flow.IRFlowDiagram => ({
  namespace: 'diagram',
  type: 'flow',
  entities: [{ id: 'item', text: 'Step' }],
  groups: [{ ...group, id: 'group', children: ['item'] }],
  layouts: [],
  children: ['group'],
});

const resolve = (source: Flow.IRFlowDiagram) =>
  resolveFlowDiagram(source, { theme: DEFAULT_RESOLVED_THEME, flowThemeStyles: new Map() });

const compile = (source: Flow.IRFlowDiagram, options: Flow.FlowDiagramDefinitionOptions = {}) =>
  compileToScene(
    { type: 'scene', version: 1, children: [source] },
    {
      ...resolveCoreProviderDependencies({ contributions: [Flow.createFlowDiagramProviderContribution(options)] }),
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    },
  );

const primitives = (values: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  values.flatMap(value => (value.type === 'group' ? [value, ...primitives(value.children)] : [value]));

const artifact = (output: ReturnType<typeof compile>) =>
  Flow.FlowDiagramArtifactSchema.parse(
    output.artifacts.find(value => value.kind === 'composite' && value.namespace === 'diagram' && value.type === 'flow')
      ?.value,
  );

describe('Flow Group Graph surface', () => {
  it('round-trips full Graph captions, boundary labels and Scope fields', () => {
    const caption = GroupCaptionSchema.parse({
      description: { text: ['Description', { text: 'Detail', font: { weight: 700 } }], maxTextWidth: 90 },
      side: 'bottom',
      direction: 'vertical',
      itemGap: 0,
      bodyGap: 0,
    });
    const source = flow({
      caption,
      labels: [{ text: 'Boundary', position: 'bottom' }],
      frame: GroupSchema.shape.frame.unwrap().parse({}),
      style: { opacity: 0.8 },
      theme: { mode: 'dark' },
      defaults: { node: { style: { font: { size: 16 } } } },
      zIndex: 4,
      boundingShape: 'circle',
      meta: { owner: 'runtime' },
      graphDefaults: { entity: { style: { textColor: 'red' } } },
    });
    const parsed = Flow.FlowDiagramSchema.parse(source);

    expect(parsed.groups[0]).toMatchObject(source.groups![0]);
    expect(Flow.FlowDiagramSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(Flow.FlowGroupSchema.safeParse({ id: 'group', children: ['item'], caption: {} }).success).toBe(false);
    expect(Flow.FlowGroupSchema.safeParse({ id: 'group', children: ['item'], labels: [] }).success).toBe(false);
  });

  it.each([
    { transforms: [{ kind: 'translate', x: 10, y: 0 }] },
    { placement: { target: [10, 0] } },
    { localNamespace: true },
  ])('rejects Group fields that change Flow geometry or identity: %j', field => {
    const parsed = Flow.FlowDiagramSchema.safeParse({
      ...flow({}),
      groups: [{ id: 'group', children: ['item'], ...field }],
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(['groups', 0]);
  });

  it('merges both caption text defaults without creating absent text items', () => {
    const source = {
      ...flow({ caption: { description: { text: 'Detail', font: { weight: 700 } } } }),
      flowDefaults: {
        group: {
          caption: {
            side: 'bottom' as const,
            direction: 'vertical' as const,
            bodyGap: 0,
            title: { font: { size: 30 } },
            description: { textColor: 'red', font: { size: 18, family: 'Default' } },
          },
        },
      },
    };
    const group = resolve(source).elements[0];
    if (group.type !== 'group') throw new Error('Expected Group');

    expect(group.graph.caption).toEqual({
      side: 'bottom',
      direction: 'vertical',
      bodyGap: 0,
      description: { text: 'Detail', textColor: 'red', font: { weight: 700 } },
    });

    const withoutCaption = resolve({ ...source, groups: flow({}).groups }).elements[0];
    if (withoutCaption.type !== 'group') throw new Error('Expected Group');

    expect(withoutCaption.graph.caption).toBeUndefined();
  });

  it('projects nested Graph context before measurement while preserving root relation ownership', () => {
    const source: Flow.IRFlowDiagram = {
      ...flow({}),
      graphRules: [{ type: 'entity', selector: { role: 'concept' }, style: { textColor: 'blue' } }],
      entities: [
        { id: 'item', text: 'A much longer step' },
        { id: 'outside', text: 'Outside' },
      ],
      groups: [
        {
          id: 'outer',
          graphDefaults: {
            entity: { layout: { maxTextWidth: 45 } },
            group: { border: { stroke: 'red' } },
            relation: { style: { stroke: 'red' } },
          },
          graphRules: [{ type: 'entity', selector: { role: 'concept' }, style: { textColor: 'red' } }],
          children: ['inner'],
        },
        { id: 'inner', children: ['item'] },
      ],
      children: ['outer', 'outside'],
      relations: [{ source: 'item', target: 'outside' }],
    };
    const canonical = resolve(source);
    const outer = canonical.elements[0];
    if (outer.type !== 'group') throw new Error('Expected outer Group');

    const inner = outer.elements[0];
    if (inner.type !== 'group') throw new Error('Expected inner Group');

    const item = inner.elements[0];
    if (item.type !== 'entity') throw new Error('Expected Entity');

    expect(outer.graph.border).toBeUndefined();
    expect(inner.graph.border).toEqual({ stroke: 'red' });
    expect(item.graph.style?.textColor).toBe('red');
    expect(item.graph.layout?.maxTextWidth).toBe(45);
    expect(canonical.relations[0].graph.style?.stroke).not.toBe('red');

    const output = compile(source);
    const texts = primitives(output.scene.primitives).filter(value => value.type === 'text');

    expect(texts.some(value => value.lines.length > 1 && value.fill === 'red')).toBe(true);
    expect(texts.find(value => value.lines.some(line => line.text === 'Outside'))?.fill).toBe('blue');
  });

  it('uses caption side and description size for shell metrics and keeps labels visual-only', () => {
    const inputs: Array<Flow.FlowLayoutInput> = [];
    const definition = Flow.defineFlowLayout({
      ...Flow.LayeredFlowLayoutDefinition,
      name: 'observe-group-metrics',
      layout: (input, context) => {
        inputs.push(input);
        return Flow.LayeredFlowLayoutDefinition.layout(input, context);
      },
    });
    const options = { flowLayouts: [definition], defaultFlowLayout: definition.name };
    const caption = { title: { text: 'Title' }, description: { text: 'Description' }, direction: 'vertical' as const };
    const top = compile(flow({ caption }), options);
    const bottom = compile(flow({ caption: { ...caption, side: 'bottom' } }), options);
    const labels = compile(
      flow({ caption, labels: [{ text: 'Boundary', position: 'bottom', distance: 12 }] }),
      options,
    );
    const first = inputs[0].elements[0];
    const second = inputs[1].elements[0];
    if (first.kind !== 'group' || second.kind !== 'group') throw new Error('Expected Group metrics');

    expect(first.contentInsets.top).toBeGreaterThan(first.contentInsets.bottom);
    expect(second.contentInsets.bottom).toBe(first.contentInsets.top);
    expect(second.contentInsets.top).toBe(first.contentInsets.bottom);
    expect(artifact(top).elements[0].bounds.height).toBe(artifact(bottom).elements[0].bounds.height);
    expect(artifact(top).elements[0].bounds.height).toBe(artifact(labels).elements[0].bounds.height);
    expect(
      primitives(labels.scene.primitives).some(
        value => value.type === 'text' && value.lines.some(line => line.text === 'Boundary'),
      ),
    ).toBe(true);
    expect(
      primitives(bottom.scene.primitives).some(
        value => value.type === 'text' && value.lines.some(line => line.text === 'Description'),
      ),
    ).toBe(true);
  });

  it('preserves Group Scope metadata and clipping in the final Scene', () => {
    const output = compile(
      flow({
        meta: { owner: 'service' },
        clip: { kind: 'rect', x: 0, y: 0, width: 200, height: 100 },
        style: { opacity: 0.8 },
        frame: GroupSchema.shape.frame.unwrap().parse({ padding: 5, style: { stroke: 'red' } }),
        animations: [],
      }),
    );
    const group = primitives(output.scene.primitives).find(
      value => value.type === 'group' && value.meta?.owner === 'service',
    );

    expect(group).toMatchObject({ type: 'group', meta: { owner: 'service' } });

    if (group?.type !== 'group') throw new Error('Expected Group Scope');

    expect(group.clipRef).toBeDefined();
    expect(primitives(output.scene.primitives).some(value => value.type === 'rect' && value.stroke === 'red')).toBe(
      true,
    );
  });
});
