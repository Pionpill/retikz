import { describe, expect, it, vi } from 'vitest';

import type { LowerTex, TextMeasurer, TextMetrics } from '../../src/compile/text';
import type { CompileWarning } from '../../src/compile/warning';
import type { PathPrim, ScenePrimitive, TextPrim } from '../../src/contract';
import type { IRNode, IRNodeLabel, IRScene } from '../../src/schemas';

import { isNodeLayoutCompileArtifact } from '../../src/compile/artifact';
import { compileToScene } from '../../src/compile/compile';
import { CompileWarningCode } from '../../src/compile/constants';
import { normalizeTextMetrics } from '../../src/compile/text';
import { RetikzCoreError } from '../../src/error';
import { NodeLabelSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const LABEL_METRICS: TextMetrics = {
  width: 40,
  height: 20,
  ascent: 15,
  descent: 5,
};

const fixedMeasure: TextMeasurer = () => LABEL_METRICS;

const sceneWithLabel = (label: IRNodeLabel, node: Partial<IRNode> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      position: [0, 0],
      minimumSize: { width: 100, height: 60 },
      ...node,
      label,
    },
  ],
});

const labelText = (primitives: Array<ScenePrimitive>, text = 'L'): TextPrim => {
  const primitive = flattenPrims(primitives).find(
    (candidate): candidate is TextPrim => candidate.type === 'text' && candidate.lines.some(line => line.text === text),
  );
  if (primitive === undefined) throw new Error(`missing label text '${text}'`);
  return primitive;
};

const visualCenterY = (primitive: TextPrim, metrics = LABEL_METRICS): number =>
  primitive.y - ((metrics.ascent ?? 0) - (metrics.descent ?? 0)) / 2;

const pinLine = (primitives: Array<ScenePrimitive>): PathPrim => {
  const primitive = flattenPrims(primitives).find(
    (candidate): candidate is PathPrim =>
      candidate.type === 'path' &&
      candidate.commands.length === 2 &&
      candidate.commands[0]?.kind === 'move' &&
      candidate.commands[1]?.kind === 'line',
  );
  if (primitive === undefined) throw new Error('missing pin line');
  return primitive;
};

describe('Node label visual-box spacing', () => {
  it('uses distance as the right-side gap to the measured visual box', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'right', distance: 8 }), {
      measureText: fixedMeasure,
      padding: 0,
    }).scene;
    const label = labelText(scene.primitives);

    expect(label.x).toBeCloseTo(78);
    expect(visualCenterY(label)).toBeCloseTo(0);
  });

  it('projects the final rotated OBB onto the placement direction', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'top', distance: 8, rotate: 90 }), {
      measureText: fixedMeasure,
      padding: 0,
    }).scene;
    const label = labelText(scene.primitives);

    expect(label.x).toBeCloseTo(0);
    expect(visualCenterY(label)).toBeCloseTo(-58);
  });

  it('places an inside label by the same visual extent without clamping', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'right', placement: 'inside', distance: 0 }), {
      measureText: fixedMeasure,
      padding: 0,
    }).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(30);
  });

  it('keeps center placement at the final Node rect center and ignores distance', () => {
    const scene = compileToScene(
      sceneWithLabel(
        { text: 'L', position: 'center', distance: 999 },
        { padding: { left: 0, right: 20, top: 0, bottom: 0 }, minimumSize: 0 },
      ),
      { measureText: fixedMeasure, padding: 0 },
    ).scene;
    const label = labelText(scene.primitives);

    expect(label.x).toBeCloseTo(10);
    expect(visualCenterY(label)).toBeCloseTo(0);
  });

  it('resolves label geometry after asymmetric padding establishes the final rect', () => {
    const scene = compileToScene(
      sceneWithLabel(
        { text: 'L', position: 'right', distance: 8 },
        { padding: { left: 0, right: 20, top: 0, bottom: 0 }, minimumSize: 0 },
      ),
      { measureText: fixedMeasure, padding: 0 },
    ).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(48);
  });

  it('keeps centerOffset valid after anchor-position translates the final Node', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'target', position: [100, 0] },
        {
          type: 'node',
          position: { kind: 'anchor', target: { id: 'target' } },
          minimumSize: { width: 100, height: 60 },
          label: { text: 'L', position: 'right', distance: 8 },
        },
      ],
    };
    const scene = compileToScene(ir, { measureText: fixedMeasure, padding: 0 }).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(178);
  });

  it('keeps Node.scale distance in unscaled user units', () => {
    const scene = compileToScene(
      sceneWithLabel({ text: 'L', position: 'right', distance: 8 }, { scale: { x: 2, y: 1 } }),
      { measureText: fixedMeasure, padding: 0 },
    ).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(128);
  });

  it('applies a non-uniform Scope scale to the complete resolved geometry', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: 3 }],
          children: sceneWithLabel({ text: 'L', position: 'right', distance: 8 }).children,
        },
      ],
    };
    const scene = compileToScene(ir, { measureText: fixedMeasure, padding: 0 }).scene;

    expect(scene.layout.width).toBeCloseTo(296);
    expect(scene.layout.height).toBeCloseTo(180);
  });
});

describe('Node label resolved metrics', () => {
  it.each([
    [
      { width: 40, height: 20 },
      { height: 20, ascent: 10, descent: 10 },
    ],
    [
      { width: 40, height: 20, ascent: 8 },
      { height: 20, ascent: 8, descent: 12 },
    ],
    [
      { width: 40, height: 20, descent: 2 },
      { height: 20, ascent: 18, descent: 2 },
    ],
    [
      { width: 40, height: 20, ascent: 8, descent: 2 },
      { height: 20, ascent: 13, descent: 7 },
    ],
    [
      { width: 40, height: 20, ascent: 15, descent: 10 },
      { height: 25, ascent: 15, descent: 10 },
    ],
  ] satisfies Array<[TextMetrics, Pick<TextMetrics, 'height' | 'ascent' | 'descent'>]>)(
    'normalizes absent, partial, leading, and overflowing baseline metrics',
    (metrics, expected) => {
      expect(normalizeTextMetrics(metrics)).toMatchObject(expected);
    },
  );

  it('uses normalized ascent/descent for alphabetic baseline and measuredHeight', () => {
    const metrics: TextMetrics = { width: 40, height: 30, ascent: 8, descent: 2 };
    const measureText = vi.fn<TextMeasurer>(() => metrics);
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'center' }), { measureText, padding: 0 }).scene;
    const label = labelText(scene.primitives);

    expect(measureText).toHaveBeenCalledTimes(1);
    expect(label.measuredWidth).toBe(40);
    expect(label.measuredHeight).toBe(30);
    expect(label.y).toBeCloseTo(3);
  });

  it.each([
    ['width', { width: Number.NaN, height: 20 }],
    ['height', { width: 40, height: -1 }],
    ['ascent', { width: 40, height: 20, ascent: Number.POSITIVE_INFINITY }],
    ['descent', { width: 40, height: 20, descent: -1 }],
  ] satisfies Array<[string, TextMetrics]>)('fails loud for invalid %s metrics', (_field, metrics) => {
    expect(
      () =>
        compileToScene(sceneWithLabel({ text: 'L', position: 'center' }), { measureText: () => metrics, padding: 0 })
          .scene,
    ).toThrow(/normalizeTextMetrics: invalid/);
  });

  it('fails loud when individually finite ascent and descent overflow in aggregate', () => {
    expect(
      () =>
        compileToScene(sceneWithLabel({ text: 'L', position: 'center' }), {
          measureText: () => ({
            width: 1,
            height: 1,
            ascent: 1e308,
            descent: 1e308,
          }),
        }).scene,
    ).toThrow(/normalizeTextMetrics: invalid/);
  });

  it('rejects invalid metrics for mixed Node labels and mixed Node body text', () => {
    const invalidHeight: TextMeasurer = () => ({ width: 10, height: -1, ascent: 6, descent: 2 });
    const labelScene = sceneWithLabel({ text: { runs: [{ text: 'L' }] }, position: 'center' });
    const nodeTextScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: [{ runs: [{ text: 'body' }] }] }],
    };

    expect(() => compileToScene(labelScene, { measureText: invalidHeight }).scene).toThrow(
      /normalizeTextMetrics: invalid/,
    );
    expect(() => compileToScene(nodeTextScene, { measureText: invalidHeight }).scene).toThrow(
      /normalizeTextMetrics: invalid/,
    );
  });

  it('rejects malformed LoweredTex on the Node label path', () => {
    const lowerTex: LowerTex = () => ({
      paths: [],
      width: -1,
      height: 20,
      depth: 2,
    });
    expect(() =>
      compileToScene(sceneWithLabel({ text: { runs: [{ tex: 'x' }] }, position: 'center' }), {
        lowerTex,
        measureText: fixedMeasure,
      }),
    ).toThrow(RetikzCoreError);
  });

  it('keeps lowerTex null as a warning-based absence on the Node label path', () => {
    const warnings: Array<CompileWarning> = [];
    const scene = compileToScene(sceneWithLabel({ text: { runs: [{ tex: 'x' }] }, position: 'center' }), {
      lowerTex: () => null,
      measureText: fixedMeasure,
      onWarn: warning => warnings.push(warning),
    }).scene;

    expect(warnings.some(warning => warning.code === CompileWarningCode.TexInvalid)).toBe(true);
    expect(
      flattenPrims(scene.primitives).some(primitive => primitive.type === 'path' && primitive.fillRule !== undefined),
    ).toBe(false);
  });
});

describe('Node label pin and bounds', () => {
  it('ends the pin at the exact rotated OBB edge without legacy padding', () => {
    const scene = compileToScene(
      sceneWithLabel({ text: 'L', position: 'right', distance: 10, rotate: 45, pin: true }),
      { measureText: fixedMeasure, padding: 0, precision: 4 },
    ).scene;
    const pin = pinLine(scene.primitives);
    const end = pin.commands[1];

    expect(end).toMatchObject({ kind: 'line' });
    if (end.kind === 'line') {
      expect(end.to[0]).toBeCloseTo(67.0711, 3);
      expect(end.to[1]).toBeCloseTo(0, 3);
    }
  });

  it('includes all transformed label corners in automatic Scene bounds', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'right', distance: 8, rotate: 45 }), {
      measureText: fixedMeasure,
      padding: 0,
      precision: 4,
    }).scene;

    expect(scene.layout.width).toBeCloseTo(150.4264, 3);
    expect(scene.layout.height).toBeCloseTo(60);
  });

  it('keeps label and pin out of a Scope id synthetic bbox', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          id: 'cluster',
          children: [
            {
              type: 'node',
              position: [0, 0],
              minimumSize: { width: 100, height: 60 },
              label: { text: 'L', position: 'right', distance: 100, pin: true },
            },
          ],
        },
        {
          type: 'node',
          id: 'marker',
          position: { kind: 'anchor', target: { id: 'cluster', anchor: 'right' } },
          minimumSize: 0,
          padding: 0,
        },
      ],
    };
    const result = compileToScene(ir, {
      measureText: fixedMeasure,
      padding: 0,
      artifacts: { nodeLayouts: true },
    });
    const markerX = result.artifacts.find(
      artifact => isNodeLayoutCompileArtifact(artifact) && artifact.value.id === 'marker',
    )?.value.rect.x;

    expect(markerX).toBeCloseTo(50);
  });
});

describe('Node label distance contracts', () => {
  it('describes distance as a visual-box gap', () => {
    expect(NodeLabelSchema.shape.distance.description).toMatch(/visual box/i);
    expect(NodeLabelSchema.shape.distance.description).not.toMatch(/label center/i);
  });

  it('validates CompileOptions.labelDistance before any layout', () => {
    const empty: IRScene = { version: 1, type: 'scene', children: [] };

    expect(() => compileToScene(empty, { labelDistance: 0 }).scene).not.toThrow();
    for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => compileToScene(empty, { labelDistance: invalid }).scene).toThrow(
        /labelDistance.*non-negative finite number/,
      );
    }
  });
});
