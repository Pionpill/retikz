import type { AnyCompositeDefinition, CompileWarning, IRChild, IRPathBase, IRStep } from '@retikz/core';

import { compileToScene, CompileWarningCode, lowerIRToKernel, parseWay } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRConnector } from '../../src';

import * as Notation from '../../src';
import { pathPrimitivesOf } from './test-utils';

const steps: Array<IRStep> = [
  { type: 'step', kind: 'move', to: { id: 'source' } },
  { type: 'step', kind: 'fold', via: '-|-', to: { id: 'target' } },
];

const sceneOf = (children: ReadonlyArray<IRChild>): { version: 1; type: 'scene'; children: Array<IRChild> } => ({
  version: 1,
  type: 'scene',
  children: Array.from(children),
});

const pathOf = (connector: IRConnector): IRPathBase => {
  const lowered = lowerIRToKernel(sceneOf([connector]), { composites: [Notation.ConnectorDefinition] });
  const path = lowered.children[0];
  if (path.type !== 'path') throw new Error('Expected Connector to lower to a Core Path');
  return path;
};

const compileSceneOf = (
  children: ReadonlyArray<IRChild>,
): {
  scene: ReturnType<typeof compileToScene>['scene'];
  artifacts: ReturnType<typeof compileToScene>['artifacts'];
  warnings: Array<CompileWarning>;
} => {
  const warnings: Array<CompileWarning> = [];
  const result = compileToScene(sceneOf(children), {
    composites: [Notation.ConnectorDefinition],
    padding: 0,
    onWarn: warning => warnings.push(warning),
  });
  return { scene: result.scene, artifacts: result.artifacts, warnings };
};

const node = (id: string, position: [number, number]): IRChild => ({
  type: 'node',
  id,
  position,
  minimumSize: 20,
  padding: 0,
});

describe('Connector canonical semantic IR', () => {
  it('accepts canonical Core Step children and keeps a distinct Notation identity', () => {
    const connector = Notation.createConnector({ id: 'connector', role: 'custom-role', children: steps });

    expect(connector).toEqual({
      namespace: 'notation',
      type: 'connector',
      id: 'connector',
      role: 'custom-role',
      children: steps,
      marks: [{ pos: 1, mark: { kind: 'arrow' } }],
    });
    expect(Notation.ConnectorSchema.parse(JSON.parse(JSON.stringify(connector)))).toEqual(connector);
    expectTypeOf(connector).toEqualTypeOf<IRConnector>();
  });

  it('normalizes Draw way syntax through the public Core parser', () => {
    const way = ['source', '-|-', 'target'] as const;
    const connector = Notation.createConnector({ id: 'draw', way: Array.from(way) });

    expect(connector.children).toEqual(parseWay(Array.from(way)));
    expect(connector.children).toEqual([
      { type: 'step', kind: 'move', to: { id: 'source' } },
      { type: 'step', kind: 'fold', via: '-|-', to: { id: 'target' } },
    ]);
    expect(connector).not.toHaveProperty('way');
  });

  it('treats an explicitly undefined counterpart as an omitted authoring syntax', () => {
    expect(Notation.createConnector({ id: 'steps-with-undefined-way', children: steps, way: undefined })).toMatchObject(
      {
        id: 'steps-with-undefined-way',
        children: steps,
      },
    );
    expect(
      Notation.createConnector({ id: 'way-with-undefined-children', way: ['source', 'target'], children: undefined }),
    ).toMatchObject({
      id: 'way-with-undefined-children',
      children: parseWay(['source', 'target']),
    });
  });

  it('fails loudly unless exactly one authoring syntax is provided', () => {
    expect(() => Notation.createConnector({ id: 'missing' } as never)).toThrow(/children|way/i);
    expect(() => Notation.createConnector({ id: 'both', children: steps, way: ['source', 'target'] } as never)).toThrow(
      /children|way/i,
    );
  });

  it('preserves public parseWay diagnostics without wrapping them', () => {
    expect(() => Notation.createConnector({ id: 'invalid-way', way: ['source'] })).toThrow(
      'parseWay: way must contain at least 2 items',
    );
  });

  it.each([
    { from: [0, 0], to: [10, 0] },
    { routing: { kind: 'straight' } },
    { appearance: { stroke: 'red' } },
    { kind: 'stroke' },
    { kindOptions: {} },
    { ribbon: { mode: 'centerline', width: 4 } },
  ])('rejects removed or non-stroke-owned fields: $from$to$routing$appearance$kind$kindOptions$ribbon', extra => {
    expect(
      Notation.ConnectorSchema.safeParse({
        namespace: 'notation',
        type: 'connector',
        id: 'rejected',
        children: steps,
        ...extra,
      }).success,
    ).toBe(false);
  });

  it('passes the complete applicable Core Path surface through canonical IR', () => {
    const surface = {
      id: 'surface',
      children: steps,
      color: '#123456',
      fill: 'none',
      stroke: '#234567',
      fillOpacity: 0.5,
      strokeWidth: 2,
      strokeOpacity: 0.75,
      opacity: 0.8,
      shadow: 'sm' as const,
      blendMode: 'multiply' as const,
      dashPattern: [4, 2],
      dashOffset: 1,
      lineCap: 'round' as const,
      lineJoin: 'bevel' as const,
      fillRule: 'evenodd' as const,
      roundedCorners: 2,
      rotate: 12,
      scale: { x: 1.2, y: 0.8 },
      label: { text: 'flow', position: 0.25, sloped: true },
      meta: { source: 'notation' },
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 400,
          trigger: 'load' as const,
        },
      ],
      zIndex: 7,
    };
    const connector = Notation.createConnector(surface);
    const path = pathOf(connector);

    expect(connector).toMatchObject(surface);
    expect(path).toMatchObject({ type: 'path', ...surface });
  });

  it('adds the end arrow only when marks are omitted', () => {
    const defaultPath = pathOf(Notation.createConnector({ id: 'default', children: steps }));
    const emptyPath = pathOf(Notation.createConnector({ id: 'empty', children: steps, marks: [] }));

    expect(defaultPath.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(emptyPath.marks).toEqual([]);
  });
});

describe('Connector lightweight Core Path lowering', () => {
  it('registers as an independent expansion Definition without a typed artifact', () => {
    const definition: AnyCompositeDefinition = Notation.ConnectorDefinition;

    expect(definition).toMatchObject({ namespace: 'notation', type: 'connector' });
    expect(definition.expand).toEqual(expect.any(Function));
    expect(definition.compile).toBeUndefined();
    expect(definition.artifactSchema).toBeUndefined();
  });

  it('lowers to exactly one same-id stroke Path and drops authored role', () => {
    const path = pathOf(Notation.createConnector({ id: 'same-id', role: 'flow', children: steps }));

    expect(path).toMatchObject({ type: 'path', id: 'same-id', children: steps });
    expect(path).not.toHaveProperty('namespace');
    expect(path).not.toHaveProperty('role');
    expect(path).not.toHaveProperty('kind');
  });

  it('emits no Connector artifact and relies on the Core registration diagnostic', () => {
    const connector = Notation.createConnector({
      id: 'identity',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    const { scene, artifacts } = compileSceneOf([connector]);

    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === 'identity')).toHaveLength(1);
    expect(
      artifacts.filter(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'notation' && artifact.type === 'connector',
      ),
    ).toHaveLength(0);
    expect(() => lowerIRToKernel(sceneOf([connector]), { composites: [] })).toThrow(
      /notation\.connector.*not registered/i,
    );
  });
});

describe('Connector Core Step target behavior', () => {
  it.each([
    ['backward', [node('source-backward', [0, 0]), node('target-backward', [100, 0])]],
    ['forward', []],
  ] as const)('delegates %s target resolution to Core Path', (order, leadingNodes) => {
    const connector = Notation.createConnector({
      id: `connector-${order}`,
      way: [`source-${order}`, `target-${order}`],
    });
    const children =
      order === 'backward'
        ? [...leadingNodes, connector]
        : [connector, node('source-forward', [0, 0]), node('target-forward', [100, 0])];
    const { scene, warnings } = compileSceneOf(children);

    expect(warnings).toEqual([]);
    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === `connector-${order}`)).toHaveLength(1);
  });

  it('delegates unresolved targets to Core warning-and-skip behavior', () => {
    const { scene, warnings } = compileSceneOf([
      Notation.createConnector({ id: 'unresolved', way: ['missing-source', 'missing-target'] }),
    ]);

    expect(warnings.some(warning => warning.code === CompileWarningCode.UnresolvedNodeReference)).toBe(true);
    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === 'unresolved')).toHaveLength(0);
  });
});
