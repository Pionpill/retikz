import type { ScenePrimitive } from '@retikz/core';
import type { Position } from '@retikz/math';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowLayoutInput, FlowLayoutOutput } from '../../src/flow';

import { RetikzDiagramErrorCode } from '../../src/errors';
import {
  createFlowDiagramProviderContribution,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  FlowRoutingSchema,
  getFlowLayoutCatalog,
  LayeredFlowLayoutDefinition,
} from '../../src/flow';
import { executeFlowLayout } from '../../src/flow/pipeline';
import { routeLayeredRelations } from '../../src/flow/providers/layout/layered/routing';
import { resolveEffectiveFlowLayout } from '../../src/flow/resolve';

const inputFor = (kind: '-|' | '|-'): FlowLayoutInput => ({
  layout: { direction: 'right', nodeGap: 48, rankGap: 48, routing: { kind, cornerRadius: 0 } },
  elements: ['a', 'b'].map(id => ({
    kind: 'leaf',
    id,
    size: { width: 20, height: 20 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })),
  relations: [{ source: 'a', target: 'b', direction: 'forward', routing: { kind, cornerRadius: 0 } }],
});

const elementsAt = (target: Position): FlowLayoutOutput['elements'] => [
  { id: 'a', bounds: { x: -10, y: -10, width: 20, height: 20 } },
  { id: 'b', bounds: { x: target[0] - 10, y: target[1] - 10, width: 20, height: 20 } },
];

const flatten = (items: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? flatten(item.children) : [item]));

describe('Flow single-elbow routing', () => {
  it.each(['-|', '|-'] as const)(
    'inherits %s through Group scopes and rejects undeclared capabilities before layout',
    kind => {
      const source = FlowDiagramSchema.parse({
        namespace: 'diagram',
        type: 'flow',
        entities: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        groups: [{ id: 'g', children: ['a', 'b'], routing: { kind } }],
        layouts: [],
        children: ['g'],
        routing: { kind: 'orthogonal', cornerRadius: 13 },
        relations: [
          { source: 'a', target: 'b' },
          { source: 'a', target: 'b', routing: { kind, cornerRadius: 0 } },
        ],
      });
      let calls = 0;
      const provider = {
        ...LayeredFlowLayoutDefinition,
        name: 'observe-elbow',
        layout: (...args: Parameters<typeof LayeredFlowLayoutDefinition.layout>) => {
          calls += 1;
          return LayeredFlowLayoutDefinition.layout(...args);
        },
      };
      const compile = (definition: typeof provider) =>
        compileToScene(
          { type: 'scene', version: 1, children: [source] },
          resolveCoreProviderDependencies({
            contributions: [
              createFlowDiagramProviderContribution({ flowLayouts: [definition], defaultFlowLayout: definition.name }),
            ],
          }),
        );
      const result = compile(provider);
      const artifact = FlowDiagramArtifactSchema.parse(
        result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow')
          ?.value,
      );
      expect(
        artifact.relations.map(relation => ({
          kind: relation.route.kind,
          cornerRadius: 'cornerRadius' in relation.route ? relation.route.cornerRadius : undefined,
        })),
      ).toEqual([
        { kind, cornerRadius: 13 },
        { kind, cornerRadius: 0 },
      ]);
      const priorCalls = calls;
      expect(() =>
        compile({ ...provider, capabilities: { ...provider.capabilities, routingKinds: ['straight', 'orthogonal'] } }),
      ).toThrow(
        expect.objectContaining({
          cause: expect.objectContaining({ code: RetikzDiagramErrorCode.FlowLayoutCapabilityUnsupported }),
        }),
      );
      expect(calls).toBe(priorCalls);
    },
  );

  it.each(['-|', '|-'] as const)('compiles %s to clipped paths and preserves rounded-corner geometry', kind => {
    for (const group of [false, true]) {
      for (const cornerRadius of [0, 6]) {
        const source = FlowDiagramSchema.parse({
          namespace: 'diagram',
          type: 'flow',
          entities: [
            { id: 'a', text: 'Start', role: 'event' },
            { id: 'b', text: 'Longer target' },
          ],
          groups: group ? [{ id: 'g', children: ['a'] }] : [],
          layouts: [
            {
              id: 'grid',
              kind: 'grid',
              children: [group ? 'g' : 'a', 'b'],
              placements: [
                [group ? 'g' : 'a', null],
                [null, 'b'],
              ],
            },
          ],
          children: ['grid'],
          routing: { kind, cornerRadius: 12 },
          relations: [
            { source: group ? 'g' : 'a', target: 'b', routing: { kind, cornerRadius }, style: { stroke: '#c026d3' } },
          ],
        });
        const result = compileToScene(
          { type: 'scene', version: 1, children: [source] },
          {
            ...resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
            measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
          },
        );
        const artifact = FlowDiagramArtifactSchema.parse(
          result.artifacts.find(
            item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow',
          )?.value,
        );
        expect(artifact.relations[0].route).toMatchObject({ kind, cornerRadius });
        const path = flatten(result.scene.primitives).find(item => item.type === 'path' && item.stroke === '#c026d3');
        expect(path?.type).toBe('path');
        if (path?.type !== 'path') throw new Error('Missing relation path');
        expect(
          path.commands.some(command => command.kind === 'arc' || command.kind === 'quad' || command.kind === 'cubic'),
        ).toBe(cornerRadius > 0);
        if (cornerRadius === 0) {
          const points = path.commands.flatMap(command =>
            command.kind === 'move' || command.kind === 'line' ? [command.to] : [],
          );
          expect(points).toHaveLength(3);
          expect(points[0][kind === '-|' ? 1 : 0]).toBeCloseTo(points[1][kind === '-|' ? 1 : 0]);
          expect(points[1][kind === '-|' ? 0 : 1]).toBeCloseTo(points[2][kind === '-|' ? 0 : 1]);
          const reference = artifact.relations[0].route.points;
          const span = (first: Readonly<Position>, last: Readonly<Position>) =>
            Math.abs(last[0] - first[0]) + Math.abs(last[1] - first[1]);
          expect(span(points[0], points[2])).toBeLessThan(span(reference[0], reference[2]));
        }
      }
    }
  });

  it.each(['-|', '|-'] as const)('admits %s-only providers with a radius default', kind => {
    const provider = {
      ...LayeredFlowLayoutDefinition,
      name: 'elbow',
      capabilities: { ...LayeredFlowLayoutDefinition.capabilities, routingKinds: [kind] },
      defaults: { ...LayeredFlowLayoutDefinition.defaults, routing: { kind, orthogonalCornerRadius: 5 } },
    };
    expect(
      getFlowLayoutCatalog({ flowLayouts: [provider], defaultFlowLayout: 'elbow' }).find(item => item.isDefault)
        ?.defaults.routing,
    ).toEqual({ kind, orthogonalCornerRadius: 5 });
    expect(() =>
      getFlowLayoutCatalog({ flowLayouts: [{ ...provider, defaults: { ...provider.defaults, routing: { kind } } }] }),
    ).toThrow();
  });
  it.each(['-|', '|-'] as const)('preserves %s and radius through JSON parsing', kind => {
    expect(FlowRoutingSchema.parse(JSON.parse(JSON.stringify({ kind, cornerRadius: 4 })))).toEqual({
      kind,
      cornerRadius: 4,
    });
    const invalid = FlowRoutingSchema.safeParse({ kind, cornerRadius: -1 });
    expect(invalid.success).toBe(false);
    expect(FlowRoutingSchema.safeParse({ kind, extra: true }).success).toBe(false);
  });

  it.each([
    [
      '-|',
      [100, 80],
      [
        [0, 0],
        [100, 0],
        [100, 80],
      ],
    ],
    [
      '-|',
      [-100, 80],
      [
        [0, 0],
        [-100, 0],
        [-100, 80],
      ],
    ],
    [
      '-|',
      [100, -80],
      [
        [0, 0],
        [100, 0],
        [100, -80],
      ],
    ],
    [
      '-|',
      [-100, -80],
      [
        [0, 0],
        [-100, 0],
        [-100, -80],
      ],
    ],
    [
      '|-',
      [100, 80],
      [
        [0, 0],
        [0, 80],
        [100, 80],
      ],
    ],
    [
      '|-',
      [-100, 80],
      [
        [0, 0],
        [0, 80],
        [-100, 80],
      ],
    ],
    [
      '|-',
      [100, -80],
      [
        [0, 0],
        [0, -80],
        [100, -80],
      ],
    ],
    [
      '|-',
      [-100, -80],
      [
        [0, 0],
        [0, -80],
        [-100, -80],
      ],
    ],
    [
      '-|',
      [100, 0],
      [
        [0, 0],
        [100, 0],
      ],
    ],
    [
      '-|',
      [0, 80],
      [
        [0, 0],
        [0, 80],
      ],
    ],
    [
      '|-',
      [100, 0],
      [
        [0, 0],
        [100, 0],
      ],
    ],
    [
      '|-',
      [0, 80],
      [
        [0, 0],
        [0, 80],
      ],
    ],
  ] satisfies Array<['-|' | '|-', Position, Array<Position>]>)(
    '%s routes to %j in the authored order',
    (kind, target, expected) => {
      const input = inputFor(kind);
      const elements = elementsAt(target);
      const relations = routeLayeredRelations(input, elements);
      expect(relations[0].points).toEqual(expected);
      expect(
        executeFlowLayout({ ...LayeredFlowLayoutDefinition, layout: () => ({ elements, relations }) }, input)
          .relations[0].points,
      ).toEqual(expected);
      expect(
        routeLayeredRelations({ ...input, relations: [{ ...input.relations[0], direction: 'reverse' }] }, elements)[0]
          .points,
      ).toEqual(expected);
    },
  );

  it.each(['-|', '|-'] as const)('rejects an invalid %s provider point chain', kind => {
    for (const points of [
      [
        [0, 0],
        [100, 80],
      ],
      [
        [0, 0],
        [40, 0],
        [40, 80],
        [100, 80],
      ],
      [
        [1, 0],
        [100, 0],
        [100, 80],
      ],
      kind === '-|'
        ? [
            [0, 0],
            [0, 80],
            [100, 80],
          ]
        : [
            [0, 0],
            [100, 0],
            [100, 80],
          ],
    ] satisfies Array<Array<Position>>) {
      expect(() =>
        executeFlowLayout(
          {
            ...LayeredFlowLayoutDefinition,
            layout: () => ({ elements: elementsAt([100, 80]), relations: [{ points }] }),
          },
          inputFor(kind),
        ),
      ).toThrow(expect.objectContaining({ code: RetikzDiagramErrorCode.FlowLayoutOutputInvalid }));
    }
    expect(() =>
      executeFlowLayout(
        {
          ...LayeredFlowLayoutDefinition,
          layout: () => ({
            elements: elementsAt([0, 0]),
            relations: [
              {
                points: [
                  [0, 0],
                  [0, 0],
                ],
              },
            ],
          }),
        },
        inputFor(kind),
      ),
    ).toThrow();
  });

  it('inherits rounded corners across axis-aligned modes and preserves explicit zero', () => {
    const parent = resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, undefined, {
      kind: '-|',
      cornerRadius: 11,
    });
    expect(resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, parent, { kind: '|-' }).routing).toEqual({
      kind: '|-',
      cornerRadius: 11,
    });
    expect(
      resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, parent, { kind: '|-', cornerRadius: 0 }).routing,
    ).toEqual({ kind: '|-', cornerRadius: 0 });
    expect(resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, undefined, { kind: '-|' }).routing).toEqual({
      kind: '-|',
      cornerRadius: 8,
    });
  });
});
