import { CompositeBaseSchema, compileToScene, createCompositeInputBindings, defineComposite } from '@retikz/core';
import type { IRScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  FlexLayoutDefinition,
  GridLayoutDefinition,
  OverlayLayoutDefinition,
  LayoutItemKind,
} from '../src';

const leaf = defineComposite({
  namespace: 'fixture',
  type: 'prepared',
  schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('prepared') }),
  expand: (_node, context) => ({ children: [{ type: 'node', position: [0, 0], text: String(context.runtimeInput) }] }),
});

describe('Layout prepared child input', () => {
  it('retains instance input across every Layout family probe', () => {
    const child = { namespace: 'fixture', type: 'prepared' };
    const containers = [
      createFlexLayout({ children: [{ kind: LayoutItemKind.Flex, child }] }),
      createGridLayout({
        columns: [{ kind: 'content', mode: 'natural' }],
        children: [{ kind: LayoutItemKind.Grid, child }],
      }),
      createOverlayLayout({ children: [{ kind: LayoutItemKind.Overlay, child }] }),
    ];
    for (const container of containers) {
      const source: IRScene = { type: 'scene', version: 1, children: [container] };
      const output = compileToScene(source, {
        composites: [leaf, FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition],
        compositeInputs: createCompositeInputBindings(source, [
          { path: ['children', 0, 'children', 0, 'child'], input: 'prepared-layout-child' },
        ]),
      });
      expect(JSON.stringify(output.scene)).toContain('prepared-layout-child');
      expect(JSON.stringify(output.scene)).not.toContain('undefined');
    }
  });
});
