import type { IRChild, Scene } from '@retikz/core';
import type { InputLegend } from '@retikz/standard-vanilla';

import { compileToScene } from '@retikz/core';
import { createInputScene, Node } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { createLegend, LegendContentKind, LegendDefinition, LegendSchema } from '@retikz/standard';
import { Legend, LegendItem, LegendTitle } from '@retikz/standard-react';
import { legend, LegendInputEmbedAdapter } from '@retikz/standard-vanilla';
import { normalizeScene, scene } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
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
      title: { type: 'node', position: [0, 0], text: 'Legend' },
      contentAlign: 'end',
      size: { x: { kind: 'fixed', value: 120 } },
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'line', sample: { type: 'node', position: [0, 0], text: 'A' } }],
      },
    } satisfies InputLegend;
    const direct = createLegend(input);
    const reactInput = createInputScene(
      createElement(Legend, {
        kind: LegendContentKind.Items,
        contentAlign: 'end',
        size: { x: { kind: 'fixed', value: 120 } },
        children: createElement(
          Fragment,
          null,
          createElement(LegendTitle, null, createElement(Node, { position: [0, 0], text: 'Legend' })),
          createElement(LegendItem, {
            itemKey: 'line',
            sample: createElement(Node, { position: [0, 0], text: 'A' }),
          }),
        ),
      }),
    );
    const react = LegendSchema.parse(normalizeScene(reactInput.scene, { adapters: reactInput.adapters }).ir.children[0]);
    const vanillaInput = scene({ children: [legend('legend', input)] });
    const vanilla = LegendSchema.parse(
      normalizeScene(vanillaInput, { adapters: [LegendInputEmbedAdapter] }).ir.children[0],
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
