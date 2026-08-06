import { describe, expect, it } from 'vitest';

import { InspectionOwnerSchema, InspectionPlaneEntrySchema, InspectionPlaneSchema } from '../../../src';

const occurrence = {
  sourcePath: 'children[0]',
  expansionPath: [],
} as const;

const scene = {
  primitives: [{ type: 'rect' as const, x: 0, y: 0, width: 10, height: 5, fill: '#2563eb' }],
  layout: { x: 0, y: 0, width: 10, height: 5 },
  resources: [
    {
      kind: 'paint' as const,
      id: 'inspection-fill',
      spec: {
        kind: 'linearGradient' as const,
        stops: [
          { offset: 0, color: '#2563eb' },
          { offset: 1, color: '#7c3aed' },
        ],
      },
    },
  ],
};

describe('inspection plane schemas', () => {
  it('accepts owner-scoped static Scene entries and JSON round trips', () => {
    const plane = InspectionPlaneSchema.parse({
      entries: [
        {
          owner: { kind: 'composite', namespace: 'test', type: 'layout' },
          occurrence,
          colorScope: 0,
          transform: [1, 0, 0, 1, 12, 24],
          scene,
        },
        {
          owner: { kind: 'pathKind', name: 'stroke' },
          occurrence: { sourcePath: 'children[1].path', expansionPath: [] },
          colorScope: 1,
          transform: [1, 0, 0, 1, 0, 0],
          scene,
        },
      ],
    });

    expect(plane.entries.map(entry => entry.owner.kind)).toEqual(['composite', 'pathKind']);
    expect(InspectionPlaneSchema.parse(JSON.parse(JSON.stringify(plane)))).toEqual(plane);
  });

  it('rejects legacy primitive entries and incomplete owners', () => {
    expect(() =>
      InspectionPlaneEntrySchema.parse({
        occurrence,
        colorScope: 0,
        transform: [1, 0, 0, 1, 0, 0],
        primitives: [],
      }),
    ).toThrow();
    expect(() => InspectionOwnerSchema.parse({ kind: 'composite', namespace: 'test' })).toThrow();
    expect(() => InspectionOwnerSchema.parse({ kind: 'path', name: 'stroke' })).toThrow();
  });

  it('rejects invalid transforms, color scopes, animated scenes, and layouts', () => {
    const entry = {
      owner: { kind: 'pathKind', name: 'stroke' },
      occurrence,
      colorScope: 0,
      transform: [1, 0, 0, 1, 0, 0],
      scene,
    };

    expect(() => InspectionPlaneEntrySchema.parse({ ...entry, colorScope: -1 })).toThrow();
    expect(() => InspectionPlaneEntrySchema.parse({ ...entry, transform: [1, 0, 0, 1, Number.NaN, 0] })).toThrow();
    expect(() => InspectionPlaneEntrySchema.parse({ ...entry, scene: { ...scene, animations: [] } })).toThrow();
    expect(() =>
      InspectionPlaneEntrySchema.parse({
        ...entry,
        scene: {
          ...scene,
          primitives: [
            {
              type: 'group',
              transforms: [],
              children: [{ type: 'rect', id: 'leaked', x: 0, y: 0, width: 1, height: 1 }],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      InspectionPlaneEntrySchema.parse({
        ...entry,
        scene: { ...scene, layout: { ...scene.layout, width: -1 } },
      }),
    ).toThrow();
  });
});
