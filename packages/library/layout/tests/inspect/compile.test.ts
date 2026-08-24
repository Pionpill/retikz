import type { IRChild, IRScene } from '@retikz/core';

import { compileInspectionToScene, createInspectorRegistry } from '@retikz/inspect';
import { describe, expect, it } from 'vitest';

import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  FlexLayoutDefinition,
  GridLayoutDefinition,
  LayoutItemKind,
  OverlayLayoutDefinition,
} from '../../src';
import {
  FLEX_LAYOUT_INSPECTOR,
  FLEX_LAYOUT_INSPECTOR_KEY,
  GRID_LAYOUT_INSPECTOR,
  GRID_LAYOUT_INSPECTOR_KEY,
  OVERLAY_LAYOUT_INSPECTOR,
  OVERLAY_LAYOUT_INSPECTOR_KEY,
} from '../../src/inspect';

const node = (id: string): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  minimumSize: { width: 20, height: 10 },
  padding: 0,
  margin: 0,
});

const children: IRScene['children'] = [
  createFlexLayout({
    size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'fixed', value: 30 } },
    padding: 4,
    gap: 6,
    children: ['a', 'b'].map(key => ({ kind: LayoutItemKind.Flex, key, child: node(key) })),
  }),
  createGridLayout({
    size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'fixed', value: 30 } },
    padding: 4,
    columnGap: 6,
    columns: [
      { kind: 'fixed', value: 20 },
      { kind: 'fixed', value: 20 },
    ],
    rows: [{ kind: 'fixed', value: 10 }],
    children: [
      {
        kind: LayoutItemKind.Grid,
        key: 'a',
        child: node('grid-a'),
        column: { start: 0, span: 1 },
        row: { start: 0, span: 1 },
      },
    ],
  }),
  createOverlayLayout({
    size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'fixed', value: 30 } },
    padding: 4,
    children: [{ kind: LayoutItemKind.Overlay, key: 'a', child: node('overlay-a'), zIndex: 2 }],
  }),
];

describe('Layout inspect compile integration', () => {
  it('observes final Flex, Grid, and Overlay artifacts through the optional registry', () => {
    const registry = createInspectorRegistry([FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR]);
    const output = compileInspectionToScene(
      { type: 'scene', version: 1, children },
      {
        registry,
        selection: {
          rules: [
            { kind: 'request', inspector: FLEX_LAYOUT_INSPECTOR_KEY, target: { kind: 'scene' }, options: true },
            { kind: 'request', inspector: GRID_LAYOUT_INSPECTOR_KEY, target: { kind: 'scene' }, options: true },
            { kind: 'request', inspector: OVERLAY_LAYOUT_INSPECTOR_KEY, target: { kind: 'scene' }, options: true },
          ],
        },
        compileOptions: {
          composites: [FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition],
          padding: 0,
        },
      },
    );

    expect(
      Array.from(
        new Set(
          output.inspection?.entries.map(entry =>
            entry.owner.kind === 'composite' ? entry.owner.type : entry.owner.name,
          ),
        ),
      ),
    ).toEqual(['flexLayout', 'gridLayout', 'overlayLayout']);
    expect(output.primary).not.toHaveProperty('inspection');
  });
});
