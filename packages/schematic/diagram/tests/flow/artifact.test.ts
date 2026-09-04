import { describe, expect, it } from 'vitest';

import * as Flow from '../../src/flow';

type RuntimeSchema = Readonly<{
  parse: (value: unknown) => unknown;
  safeParse: (value: unknown) => Readonly<{ success: boolean }>;
}>;

const isRuntimeSchema = (value: unknown): value is RuntimeSchema =>
  value !== null &&
  typeof value === 'object' &&
  'parse' in value &&
  typeof value.parse === 'function' &&
  'safeParse' in value &&
  typeof value.safeParse === 'function';

const artifact = {
  layout: { definition: 'layered' },
  frame: {
    allocationBounds: { x: 0, y: 0, width: 320, height: 180 },
    visualBounds: { x: -1, y: -1, width: 322, height: 182 },
  },
  regions: {
    title: {
      allocationBounds: { x: 16, y: 12, width: 288, height: 20 },
      visualBounds: { x: 16, y: 12, width: 288, height: 20 },
    },
    drawing: {
      allocationBounds: { x: 16, y: 44, width: 288, height: 120 },
      visualBounds: { x: 16, y: 44, width: 288, height: 120 },
    },
  },
  elements: [
    { id: 'source', kind: 'entity', bounds: { x: 16, y: 70, width: 80, height: 36 } },
    {
      id: 'group',
      kind: 'group',
      bounds: { x: 144, y: 52, width: 144, height: 96 },
      elements: [
        {
          id: 'layout',
          kind: 'layout',
          bounds: { x: 152, y: 68, width: 128, height: 64 },
          elements: [{ id: 'target', kind: 'entity', bounds: { x: 160, y: 76, width: 112, height: 48 } }],
        },
      ],
    },
  ],
  relations: [
    {
      source: 'source',
      target: 'target',
      route: {
        kind: 'orthogonal',
        cornerRadius: 8,
        points: [
          [96, 88],
          [128, 88],
          [128, 100],
          [160, 100],
        ],
      },
      labelReservation: { x: 107, y: 76, width: 42, height: 16 },
    },
    {
      source: 'group',
      target: 'source',
      route: {
        kind: 'straight',
        points: [
          [144, 100],
          [96, 88],
        ],
      },
    },
  ],
} as const;

describe('Flow Diagram artifact schema', () => {
  it('publishes a strict JSON-safe recursive artifact contract', () => {
    const candidate: unknown = Flow;
    const schema =
      typeof candidate === 'object' && candidate !== null && 'FlowDiagramArtifactSchema' in candidate
        ? candidate.FlowDiagramArtifactSchema
        : undefined;

    expect(isRuntimeSchema(schema)).toBe(true);
    if (!isRuntimeSchema(schema)) return;

    expect(schema.parse(JSON.parse(JSON.stringify(artifact)))).toEqual(artifact);
    expect(schema.safeParse({ ...artifact, source: artifact }).success).toBe(false);
    expect(schema.safeParse({ ...artifact, regions: { ...artifact.regions, drawing: undefined } }).success).toBe(false);
    expect(
      schema.safeParse({
        ...artifact,
        elements: [{ id: 'block', kind: 'block', bounds: artifact.elements[0].bounds }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...artifact,
        elements: [
          {
            id: 'legacy-group-kind',
            kind: 'group',
            groupKind: 'visible',
            bounds: artifact.elements[0].bounds,
            elements: [{ id: 'leaf', kind: 'entity', bounds: artifact.elements[0].bounds }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...artifact,
        elements: [
          {
            id: 'empty',
            kind: 'layout',
            bounds: artifact.elements[0].bounds,
            elements: [],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...artifact,
        relations: [
          {
            ...artifact.relations[1],
            route: { ...artifact.relations[1].route, cornerRadius: 0 },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...artifact,
        frame: { ...artifact.frame, allocationBounds: { ...artifact.frame.allocationBounds, width: -1 } },
      }).success,
    ).toBe(false);
  });
});
