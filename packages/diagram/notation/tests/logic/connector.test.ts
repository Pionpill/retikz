import type { AnyCompositeDefinition, CompileWarning, IRChild, IRPathBase, ScenePrimitive } from '@retikz/core';

import { compileToScene, CompileWarningCode, FoldStepVia, lowerIRToKernel } from '@retikz/core';
import { beforeAll, describe, expect, it } from 'vitest';

import type { ConnectorRoutingInput } from '../../src';

import * as Notation from '../../src';
import { pathPrimitivesOf, primitivesOf } from './test-utils';

const production = Notation;

const connectorDefinitionOf = (): AnyCompositeDefinition => production.ConnectorDefinition;

const sceneOf = (children: ReadonlyArray<IRChild>): { version: 1; type: 'scene'; children: Array<IRChild> } => ({
  version: 1,
  type: 'scene',
  children: Array.from(children),
});

const pathOf = (children: ReadonlyArray<IRChild>): IRPathBase => {
  const lowered = lowerIRToKernel(sceneOf(children), { composites: [connectorDefinitionOf()] });
  const path = lowered.children.find((child): child is IRPathBase => child.type === 'path');
  if (path === undefined) throw new Error('Expected Connector to lower to a Core Path');
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
    composites: [connectorDefinitionOf()],
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

const connector = (input: Parameters<typeof Notation.createConnector>[0]): IRChild => Notation.createConnector(input);

const routeCases: Array<{
  name: string;
  routing: ConnectorRoutingInput;
  expected: Record<string, unknown>;
}> = [
  {
    name: 'straight',
    routing: { kind: 'straight' },
    expected: { kind: 'line', to: [100, 40] },
  },
  {
    name: 'polyline',
    routing: {
      kind: 'polyline',
      points: [
        [20, 5],
        [80, 30],
      ],
    },
    expected: { kind: 'line', to: [100, 40] },
  },
  {
    name: 'horizontal then vertical orthogonal',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.HorizontalThenVertical },
    expected: { kind: 'fold', via: FoldStepVia.HorizontalThenVertical, to: [100, 40] },
  },
  {
    name: 'vertical then horizontal orthogonal',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.VerticalThenHorizontal },
    expected: { kind: 'fold', via: FoldStepVia.VerticalThenHorizontal, to: [100, 40] },
  },
  {
    name: 'horizontal vertical horizontal orthogonal default ratio',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.HorizontalVerticalHorizontal },
    expected: { kind: 'fold', via: FoldStepVia.HorizontalVerticalHorizontal, fraction: 0.5, to: [100, 40] },
  },
  {
    name: 'horizontal vertical horizontal orthogonal ratio zero',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.HorizontalVerticalHorizontal, ratio: 0 },
    expected: { kind: 'fold', via: FoldStepVia.HorizontalVerticalHorizontal, fraction: 0, to: [100, 40] },
  },
  {
    name: 'horizontal vertical horizontal orthogonal ratio one',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.HorizontalVerticalHorizontal, ratio: 1 },
    expected: { kind: 'fold', via: FoldStepVia.HorizontalVerticalHorizontal, fraction: 1, to: [100, 40] },
  },
  {
    name: 'vertical horizontal vertical orthogonal default ratio',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.VerticalHorizontalVertical },
    expected: { kind: 'fold', via: FoldStepVia.VerticalHorizontalVertical, fraction: 0.5, to: [100, 40] },
  },
  {
    name: 'vertical horizontal vertical orthogonal ratio zero',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.VerticalHorizontalVertical, ratio: 0 },
    expected: { kind: 'fold', via: FoldStepVia.VerticalHorizontalVertical, fraction: 0, to: [100, 40] },
  },
  {
    name: 'vertical horizontal vertical orthogonal ratio one',
    routing: { kind: 'orthogonal', pattern: FoldStepVia.VerticalHorizontalVertical, ratio: 1 },
    expected: { kind: 'fold', via: FoldStepVia.VerticalHorizontalVertical, fraction: 1, to: [100, 40] },
  },
  {
    name: 'quadratic',
    routing: { kind: 'quadratic', control: [55, -20] },
    expected: { kind: 'curve', control: [55, -20], to: [100, 40] },
  },
  {
    name: 'cubic',
    routing: { kind: 'cubic', control1: [30, -20], control2: [70, 60] },
    expected: { kind: 'cubic', control1: [30, -20], control2: [70, 60], to: [100, 40] },
  },
  {
    name: 'direction bend',
    routing: { kind: 'bend', direction: 'left', angle: 24, looseness: 1.2 },
    expected: { kind: 'bend', bendDirection: 'left', bendAngle: 24, looseness: 1.2, to: [100, 40] },
  },
  {
    name: 'tangent bend',
    routing: { kind: 'bend', tangents: { outAngle: 12, inAngle: 168 }, looseness: 0.8 },
    expected: { kind: 'bend', outAngle: 12, inAngle: 168, looseness: 0.8, to: [100, 40] },
  },
];

describe('Connector Core Path lowering contract', () => {
  beforeAll(() => {
    expect(production.ConnectorDefinition).toBeDefined();
  });

  it('registers as an independent lightweight Definition without a typed artifact', () => {
    const definition = connectorDefinitionOf();

    expect(definition).toMatchObject({ namespace: 'notation', type: 'connector' });
    expect(definition.expand).toEqual(expect.any(Function));
    expect(definition.compile).toBeUndefined();
    expect(definition.artifactSchema).toBeUndefined();
  });

  it('lowers every route variant to public Core steps without sampling geometry', () => {
    routeCases.forEach(({ name, routing, expected }) => {
      const value = connector({
        id: `route-${name.replaceAll(' ', '-')}`,
        from: [0, 10],
        to: [100, 40],
        routing,
      });
      const path = pathOf([value]);

      if (path.children === undefined) throw new Error('Expected lowered Core Path steps');
      if (routing.kind === 'polyline') {
        expect(path.children).toEqual([
          { type: 'step', kind: 'move', to: [0, 10] },
          { type: 'step', kind: 'line', to: [20, 5] },
          { type: 'step', kind: 'line', to: [80, 30] },
          { type: 'step', kind: 'line', to: [100, 40] },
        ]);
      } else {
        expect(path.children).toEqual([
          { type: 'step', kind: 'move', to: [0, 10] },
          { type: 'step', ...expected },
        ]);
      }
    });
  });

  it('materializes a straight route when routing is omitted', () => {
    const path = pathOf([connector({ id: 'route-default', from: [0, 10], to: [100, 40] })]);

    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [0, 10] },
      { type: 'step', kind: 'line', to: [100, 40] },
    ]);
  });

  it.each(['hv', 'vh', 'hvh', 'vhv'])('rejects the removed legacy orthogonal pattern %s', pattern => {
    expect(
      production.ConnectorSchema.safeParse({
        namespace: 'notation',
        type: 'connector',
        id: `legacy-${pattern}`,
        from: [0, 10],
        to: [100, 40],
        routing: { kind: 'orthogonal', pattern },
      }).success,
    ).toBe(false);
  });

  it('lowers the complete Core step label onto the final drawable step', () => {
    const label = {
      text: { runs: [{ text: 'flow = ' }, { tex: 'x^2' }] },
      position: 0.25,
      side: 'bottom' as const,
      sloped: true,
    };
    const path = pathOf([connector({ id: 'label-connector', from: [0, 10], to: [100, 40], label })]);

    expect(path).not.toHaveProperty('label');
    expect(path.children?.at(-1)).toMatchObject({ type: 'step', kind: 'line', to: [100, 40], label });
    expect(path.children?.filter(step => 'label' in step && step.label !== undefined)).toHaveLength(1);
  });

  it('attaches a polyline label only to the terminal drawable step', () => {
    const label = { text: 'polyline', position: 0.25, side: 'bottom' as const, sloped: true };
    const path = pathOf([
      connector({
        id: 'polyline-label',
        from: [0, 0],
        to: [100, 40],
        routing: {
          kind: 'polyline',
          points: [
            [20, 5],
            [80, 30],
          ],
        },
        label,
      }),
    ]);

    expect(path).not.toHaveProperty('label');
    expect(path.children?.filter(step => 'label' in step && step.label !== undefined)).toEqual([
      expect.objectContaining({ kind: 'line', to: [100, 40], label }),
    ]);
    expect(path.children?.at(-1)).toMatchObject({ kind: 'line', to: [100, 40], label });
  });

  it('uses an end arrow by default and replaces it when marks are explicit', () => {
    const defaultPath = pathOf([connector({ id: 'marks-default', from: [0, 0], to: [100, 0] })]);
    const customMarks = [{ pos: 0, mark: { kind: 'arrow' as const, shape: 'open' as const } }];
    const customPath = pathOf([
      connector({
        id: 'marks-custom',
        from: [0, 0],
        to: [100, 0],
        appearance: { marks: customMarks },
      }),
    ]);

    expect(defaultPath.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(customPath.marks).toEqual(customMarks);
    expect(customPath.marks).not.toContainEqual({ pos: 1, mark: { kind: 'arrow' } });
  });

  it('passes the complete Connector appearance allowlist to the lowered Core Path', () => {
    const appearance = {
      color: '#123456',
      stroke: '#234567',
      strokeWidth: 2,
      strokeOpacity: 0.75,
      opacity: 0.8,
      shadow: 'sm' as const,
      blendMode: 'multiply' as const,
      dashPattern: [4, 2],
      dashOffset: 1,
      lineCap: 'round' as const,
      lineJoin: 'bevel' as const,
      roundedCorners: 2,
      marks: [{ pos: 0, mark: { kind: 'arrow' as const, shape: 'open' as const } }],
      zIndex: 7,
    };
    const path = pathOf([connector({ id: 'appearance-allowlist', from: [0, 0], to: [100, 0], appearance })]);

    expect(path).toMatchObject(appearance);
  });

  it('stamps the Connector id on exactly one outer Path primitive and emits no typed artifact', () => {
    const id = 'connector-identity';
    const { scene, artifacts } = compileSceneOf([
      connector({ id, from: [0, 0], to: [100, 0], label: { text: 'edge', position: 0.5, sloped: true } }),
    ]);
    const flattened = primitivesOf(scene.primitives);
    const stamped = flattened.filter(primitive => primitive.id === id);
    const connectorPaths = pathPrimitivesOf(scene.primitives).filter(path => path.id === id);

    expect(stamped.map(primitive => primitive.type)).toEqual(['path']);
    expect(connectorPaths).toHaveLength(1);
    expect(flattened.filter(primitive => primitive.type === 'text')).toHaveLength(1);
    expect(
      artifacts.filter(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'notation' && artifact.type === 'connector',
      ),
    ).toHaveLength(0);
  });

  it('keeps connector lowering independent from other Notation Definitions', () => {
    const value = connector({ id: 'connector-only', from: [0, 0], to: [100, 0] });
    const lowered = lowerIRToKernel(sceneOf([value]), { composites: [connectorDefinitionOf()] });

    expect(lowered.children).toHaveLength(1);
    expect(lowered.children[0]?.type).toBe('path');
  });

  it('uses Core registration diagnostics when the Connector Definition is omitted', () => {
    const value = connector({ id: 'connector-unregistered', from: [0, 0], to: [100, 0] });

    expect(() => lowerIRToKernel(sceneOf([value]), { composites: [] })).toThrow(/notation\.connector.*not registered/i);
  });
});

describe('Connector Core step label Scene behavior', () => {
  beforeAll(() => {
    expect(production.ConnectorDefinition).toBeDefined();
  });

  it('renders one Core step label while retaining one Connector-owned Path identity', () => {
    const id = 'connector-label-scene';
    const { scene } = compileSceneOf([
      connector({
        id,
        from: [0, 0],
        to: [100, 0],
        label: { text: 'flow', position: 0.25, side: 'top', sloped: true },
      }),
    ]);
    const text = primitivesOf(scene.primitives).filter(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'text' }> => primitive.type === 'text',
    );

    expect(text.map(item => item.lines.map(line => line.text).join(''))).toContain('flow');
    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === id)).toHaveLength(1);
  });
});

describe('Connector target diagnostics', () => {
  beforeAll(() => {
    expect(production.ConnectorDefinition).toBeDefined();
  });

  it.each([
    ['backward', [node('source-backward', [0, 0]), node('target-backward', [100, 0])]],
    ['forward', []],
  ] as const)('resolves %s whole-target references through Core pending Path lookup', (order, nodes) => {
    const value = connector({
      id: `connector-${order}`,
      from: { id: `source-${order}` },
      to: { id: `target-${order}` },
    });
    const children =
      order === 'backward'
        ? [...nodes, value]
        : [value, node('source-forward', [0, 0]), node('target-forward', [100, 0])];
    const { scene, warnings } = compileSceneOf(children);

    expect(warnings).toEqual([]);
    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === `connector-${order}`)).toHaveLength(1);
  });

  it('delegates unresolved whole-target references to Core warning-and-skip behavior', () => {
    const id = 'connector-unresolved-target';
    const { scene, warnings } = compileSceneOf([
      connector({ id, from: { id: 'missing-source' }, to: { id: 'missing-target' } }),
    ]);

    expect(warnings.some(warning => warning.code === CompileWarningCode.UnresolvedNodeReference)).toBe(true);
    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === id)).toHaveLength(0);
  });

  it('delegates a self target with an explicit offset to Core without Notation fallback', () => {
    const id = 'connector-self-target';
    const { scene, warnings } = compileSceneOf([
      node('self-target', [0, 0]),
      connector({ id, from: { id: 'self-target' }, to: { id: 'self-target', offset: [24, 0] } }),
    ]);

    expect(warnings.some(warning => warning.code === CompileWarningCode.PathTooShort)).toBe(false);
    expect(warnings.some(warning => warning.code === CompileWarningCode.UnresolvedNodeReference)).toBe(false);
    expect(pathPrimitivesOf(scene.primitives).filter(path => path.id === id)).toHaveLength(1);
  });
});
