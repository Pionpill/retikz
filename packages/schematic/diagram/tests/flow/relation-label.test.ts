import type { IRGeometryLabel, ScenePrimitive } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createFlowDiagramProviderContribution, FlowDiagramSchema, LayeredFlowLayoutDefinition } from '../../src/flow';
import type { FlowLayoutInput, FlowLayoutRoute } from '../../src/flow';
import { flowRouteLabelBounds } from '../../src/flow/providers';

describe('Flow relation geometry labels', () => {
  it('forwards interruption and gap to the actual cubic stroke', () => {
    const flatten = (items: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
      items.flatMap(item => (item.type === 'group' ? flatten(item.children) : [item]));
    const compile = (interrupt: boolean, gap: number) => {
      const source = FlowDiagramSchema.parse({
        namespace: 'diagram',
        type: 'flow',
        entities: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        groups: [],
        layouts: [],
        children: ['a', 'b'],
        relations: [
          {
            source: 'a',
            target: 'b',
            routing: { kind: 'bend', bendAngle: 45 },
            label: { text: 'edge', sloped: true, interrupt, gap },
          },
        ],
      });
      return flatten(
        compileToScene(
          { type: 'scene', version: 1, children: [source] },
          resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
        ).scene.primitives,
      ).filter(item => item.type === 'path' && item.commands.some(command => command.kind === 'cubic'));
    };
    const continuous = compile(false, 4);
    const interrupted = compile(true, 4);
    expect(continuous).toHaveLength(1);
    expect(interrupted).toHaveLength(2);
    expect(compile(true, 12)).not.toEqual(interrupted);
  });
  it('complete label font overrides size while inheriting family during measurement', () => {
    const fonts: Array<{ size: number; family?: string }> = [];
    const provider = {
      ...LayeredFlowLayoutDefinition,
      name: 'measured',
      layout: (...args: Parameters<typeof LayeredFlowLayoutDefinition.layout>) =>
        LayeredFlowLayoutDefinition.layout(...args),
    };
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [
        {
          source: 'a',
          target: 'b',
          routing: { kind: 'bend' },
          labelFont: { family: 'serif', size: 10 },
          label: { text: 'unique-label', font: { size: 24 }, position: 0.25, interrupt: false },
        },
      ],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...resolveCoreProviderDependencies({
          contributions: [
            createFlowDiagramProviderContribution({ flowLayouts: [provider], defaultFlowLayout: provider.name }),
          ],
        }),
        measureText: (text, font) => {
          if (text === 'unique-label') fonts.push(font);
          return {
            width: text.length * font.size,
            height: font.size,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
          };
        },
      },
    );
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every(font => font.size === 24 && font.family === 'serif')).toBe(true);
    expect(JSON.stringify(result.scene)).toContain('unique-label');
  });
  it('full labels preserve an empty geometry projection distinct from compact labels', () => {
    const projections: Array<FlowLayoutInput> = [];
    const provider = {
      ...LayeredFlowLayoutDefinition,
      name: 'labels',
      layout: (...args: Parameters<typeof LayeredFlowLayoutDefinition.layout>) => {
        projections.push(args[0]);
        return LayeredFlowLayoutDefinition.layout(...args);
      },
    };
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [
        { source: 'a', target: 'b', label: 'compact' },
        { source: 'a', target: 'b', label: { text: 'full' } },
      ],
    });
    compileToScene(
      { type: 'scene', version: 1, children: [source] },
      resolveCoreProviderDependencies({
        contributions: [
          createFlowDiagramProviderContribution({ flowLayouts: [provider], defaultFlowLayout: 'labels' }),
        ],
      }),
    );
    expect(projections[0].relations[0]).not.toHaveProperty('labelPlacement');
    expect(projections[0].relations[1].labelPlacement).toEqual({});
    const empty = FlowDiagramSchema.safeParse({
      ...source,
      relations: [{ source: 'a', target: 'b', label: { text: ' ' } }],
    });
    expect(empty.success).toBe(false);
  });

  it('sloped reservations rotate measured dimensions along the actual reference tangent', () => {
    const route: FlowLayoutRoute = {
      kind: 'bend',
      points: [
        [0, 0],
        [100, 100],
      ],
      bendDirection: 'left',
      bendAngle: 0,
    };
    const relation = {
      source: 'a',
      target: 'b',
      direction: 'forward' as const,
      routing: { kind: 'bend' as const, bendAngle: 0 },
      labelSize: { width: 40, height: 10 },
      labelPlacement: { sloped: true },
    };
    const bounds = flowRouteLabelBounds(route, relation)!;
    expect(bounds.width).toBeCloseTo(50 / Math.sqrt(2));
    expect(bounds.height).toBeCloseTo(50 / Math.sqrt(2));
    expect(bounds.x + bounds.width / 2).toBeCloseTo(50);
    expect(bounds.y + bounds.height / 2).toBeCloseTo(50);
    expect(flowRouteLabelBounds(route, { ...relation, labelPlacement: { sloped: false } })).toMatchObject({
      width: 40,
      height: 10,
    });
  });

  it.each(['straight', 'orthogonal', '-|', '|-', 'bend'] as const)('full label fields compile on %s', kind => {
    const label: IRGeometryLabel = {
      text: 'edge',
      textColor: '#123456',
      font: { size: 18 },
      opacity: 0.6,
      position: 'near-end',
      side: 'top',
      distance: 8,
      sloped: true,
      interrupt: true,
      gap: 3,
      placement: 'outside',
    };
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [{ source: 'a', target: 'b', label, labelFont: { family: 'serif', size: 10 }, routing: { kind } }],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
    );
    expect(JSON.stringify(result.scene.primitives)).toContain('#123456');
    expect(JSON.stringify(result.scene.primitives)).toContain('serif');
  });
});
