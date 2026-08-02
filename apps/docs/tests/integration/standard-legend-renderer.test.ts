import type { IRChild, Scene } from '@retikz/core';
import type { LegendInput } from '@retikz/standard';

import { compileToScene } from '@retikz/core';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { createLegend, LegendContentKind, LegendDefinition, LegendSchema } from '@retikz/standard';
import { Legend } from '@retikz/standard-react';
import { legend, LegendVanillaAdapter } from '@retikz/standard-vanilla';
import { describe, expect, it, vi } from 'vitest';

const recordingContext = (calls: Array<string>): CanvasRenderingContext2D =>
  new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== 'string') return undefined;
        return vi.fn(() => {
          calls.push(property);
          return undefined;
        });
      },
      set: () => true,
    },
  ) as CanvasRenderingContext2D;

const compileLegendScene = (): Scene =>
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        createLegend({
          size: {
            x: { kind: 'fixed', value: 120 },
            y: { kind: 'fixed', value: 40 },
          },
          overflow: 'clip',
          content: {
            kind: LegendContentKind.Items,
            items: [
              {
                key: 'line',
                sample: {
                  type: 'path',
                  stroke: 'currentColor',
                  strokeWidth: 2,
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [28, 0] },
                  ],
                },
                label: { type: 'node', position: [0, 0], text: 'Flow' },
              },
            ],
          },
        }),
      ],
    },
    { composites: [LegendDefinition] },
  ).scene;

describe('Standard Legend renderer boundary', () => {
  it('keeps direct, React, and Vanilla canonical IR, Scene, and typed artifact equivalent', () => {
    const input = {
      contentAlign: 'end',
      size: { x: { kind: 'fixed', value: 120 } },
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'line', sample: { type: 'node', position: [0, 0], text: 'A' } }],
      },
    } satisfies LegendInput;
    const direct = createLegend(input);
    const react = LegendSchema.parse(Legend.embeddableAdapter.contribute(input).node);
    const embed = legend('legend', input);
    const vanilla = LegendSchema.parse(
      LegendVanillaAdapter.lower(embed.props, {
        id: embed.id,
        kind: embed.kind,
        namespace: LegendVanillaAdapter.namespace,
        layerId: 'main',
        identityPath: ['main', embed.id],
      }).node,
    );
    const compile = (node: IRChild) =>
      compileToScene({ type: 'scene', version: 1, children: [node] }, { composites: [LegendDefinition], padding: 0 });
    const outputs = [compile(direct), compile(react), compile(vanilla)];

    expect(react).toEqual(direct);
    expect(vanilla).toEqual(direct);
    expect(outputs[1]?.scene).toEqual(outputs[0]?.scene);
    expect(outputs[2]?.scene).toEqual(outputs[0]?.scene);
    expect(outputs[1]?.artifacts).toEqual(outputs[0]?.artifacts);
    expect(outputs[2]?.artifacts).toEqual(outputs[0]?.artifacts);
  });

  it('renders one lowered Core Scene through SVG and Canvas without renderer-side Legend knowledge', () => {
    const scene = compileLegendScene();
    const calls: Array<string> = [];
    const svg = renderToSvgString(scene, { idPrefix: 'legend' });

    expect(() => drawScene(recordingContext(calls), scene)).not.toThrow();
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('Flow');
    expect(JSON.stringify(scene)).not.toContain('standard.legend');
    expect(calls.length).toBeGreaterThan(0);
  });
});
