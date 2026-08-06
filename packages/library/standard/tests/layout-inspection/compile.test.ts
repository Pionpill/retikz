import type { InspectionAuthoringRoot, IRChild, IRScene, PaintValue, Scene, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
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
    columnGap: 6,
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
      {
        kind: LayoutItemKind.Grid,
        key: 'b',
        child: node('grid-b'),
        column: { start: 1, span: 1 },
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

const inspectionRoots = children.map(
  (_, index): InspectionAuthoringRoot => ({
    locator: { target: 'composite' as const, path: [{ kind: 'sceneChild' as const, index }] },
    tree: { policy: { self: { labels: true } } },
  }),
);

const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

const resourceRefOf = (paint: PaintValue | undefined): string | undefined =>
  typeof paint === 'object' && paint.kind === 'resourceRef' ? paint.id : undefined;

const assertStaticIdentityFreeScene = (scene: Scene): void => {
  expect(scene).not.toHaveProperty('animations');
  primitivesOf(scene.primitives).forEach(primitive => {
    expect(primitive).not.toHaveProperty('id');
    expect(primitive).not.toHaveProperty('meta');
    expect(primitive).not.toHaveProperty('animations');
  });
};

describe('Standard Layout Inspector compile integration', () => {
  it('compiles Flex, Grid, and Overlay auxiliary content as sealed ordinary Scenes', () => {
    const output = compileToScene(
      { type: 'scene', version: 1, children },
      {
        composites: [FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition],
        padding: 0,
        inspection: { roots: inspectionRoots },
      },
    );

    expect(output.inspection?.entries.map(entry => entry.owner)).toEqual([
      { kind: 'composite', namespace: 'standard', type: 'flexLayout' },
      { kind: 'composite', namespace: 'standard', type: 'gridLayout' },
      { kind: 'composite', namespace: 'standard', type: 'overlayLayout' },
    ]);

    output.inspection?.entries.forEach(entry => {
      const primitives = primitivesOf(entry.scene.primitives);
      const resources = entry.scene.resources ?? [];
      const resourceIds = new Set(resources.map(resource => resource.id));
      const referencedResourceIds = primitives.flatMap(primitive => {
        if (primitive.type === 'group' || primitive.type === 'text') return [];
        return [resourceRefOf(primitive.fill), resourceRefOf(primitive.stroke)].filter(
          (id): id is string => id !== undefined,
        );
      });

      expect(primitives.some(primitive => primitive.type === 'path')).toBe(true);
      expect(primitives.some(primitive => primitive.type === 'rect')).toBe(true);
      expect(primitives.some(primitive => primitive.type === 'text')).toBe(true);
      expect(resources.some(resource => resource.kind === 'paint' && resource.spec.kind === 'pattern')).toBe(true);
      expect(referencedResourceIds.length).toBeGreaterThan(0);
      expect(referencedResourceIds.every(id => resourceIds.has(id))).toBe(true);
      assertStaticIdentityFreeScene(entry.scene);
    });
  });

  it('keeps spacing artifacts and paints underlays before boundaries, warnings, and labels', () => {
    const output = compileToScene(
      { type: 'scene', version: 1, children },
      {
        composites: [FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition],
        padding: 0,
        inspection: { roots: inspectionRoots },
      },
    );
    const entries = output.inspection?.entries ?? [];

    expect(output.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'flexLayout',
          value: expect.objectContaining({
            spacing: expect.arrayContaining([
              { kind: 'gap', axis: 'x', bounds: { x: 24, y: 4, width: 6, height: 22 } },
            ]),
          }),
        }),
        expect.objectContaining({
          type: 'gridLayout',
          value: expect.objectContaining({
            spacing: expect.arrayContaining([
              { kind: 'gap', axis: 'x', bounds: { x: 24, y: 4, width: 6, height: 22 } },
            ]),
          }),
        }),
      ]),
    );

    entries.forEach(entry => {
      const primitives = primitivesOf(entry.scene.primitives);
      const patternUnderlayIndexes = primitives.flatMap((primitive, index) => {
        if (primitive.type !== 'rect') return [];
        return resourceRefOf(primitive.fill) === undefined ? [] : [index];
      });
      const boundaryIndexes = primitives.flatMap((primitive, index) => (primitive.type === 'path' ? [index] : []));
      const warningIndexes = primitives.flatMap((primitive, index) =>
        primitive.type === 'rect' && primitive.fill === '#dc2626' ? [index] : [],
      );
      const labelIndexes = primitives.flatMap((primitive, index) => (primitive.type === 'text' ? [index] : []));

      expect(patternUnderlayIndexes.at(-1)).toBeLessThan(boundaryIndexes[0]);
      expect(boundaryIndexes.at(-1)).toBeLessThan(warningIndexes[0]);
      expect(warningIndexes.at(-1)).toBeLessThan(labelIndexes[0]);
    });
  });
});
