import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  InspectionDiagnosticOrigin,
  IRChild,
  IRScene,
  LayoutCompositeCompileContext,
  ScenePrimitive,
} from '../../src';

import {
  BaseLayoutInspectOptionsInputSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineInspector,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
  resolveBaseLayoutInspectOptions,
} from '../../src';

const scene = (type: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ namespace: 'test', type }],
});

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flatten(primitive.children)] : [primitive],
  );

const thrownBy = (callback: () => unknown): Error & Readonly<{ origin?: InspectionDiagnosticOrigin }> => {
  try {
    callback();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected callback to throw.');
};

const definitionOf = (type: string, inspect = vi.fn()) => {
  const optionsInputSchema = BaseLayoutInspectOptionsInputSchema.extend({ guides: z.boolean().optional() });
  return defineComposite({
    namespace: 'test',
    type,
    schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal(type) }),
    artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
    inspector: defineInspector({
      kind: 'composite',
      optionsInputSchema,
      optionsSchema: optionsInputSchema.transform(value => ({
        ...resolveBaseLayoutInspectOptions(value),
        guides: value.guides ?? true,
      })),
      inspect: (artifact: { width: number; height: number }, context): IRChild => {
        inspect(artifact, context);
        return {
          type: 'path',
          stroke: context.appearance.scopeColor,
          dashPattern: [4, 4],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [artifact.width, 0] },
            { type: 'step', kind: 'line', to: [artifact.width, artifact.height] },
            { type: 'step', kind: 'line', to: [0, artifact.height] },
            { type: 'step', kind: 'cycle' },
          ],
        };
      },
    }),
    compile: () => ({
      children: [{ type: 'node', position: [0, 0], text: 'content' }],
      artifact: { width: 40, height: 20 },
    }),
  });
};

describe('layout inspection compile channel', () => {
  it('returns null and leaves the primary result unchanged when inspection is disabled', () => {
    const observe = vi.fn();
    const definition = definitionOf('disabled', observe);
    const withoutOption = compileToScene(scene('disabled'), { composites: [definition] });
    const explicitlyOff = compileToScene(scene('disabled'), {
      composites: [definition],
      inspection: { root: { layout: false } },
    });

    expect(withoutOption.inspection).toBeNull();
    expect(explicitlyOff.inspection).toBeNull();
    expect(explicitlyOff.scene).toEqual(withoutOption.scene);
    expect(explicitlyOff.artifacts).toEqual(withoutOption.artifacts);
    expect(observe).not.toHaveBeenCalled();
  });

  it('runs the selected definition Inspector once from the final typed artifact', () => {
    const observe = vi.fn();
    const definition = definitionOf('enabled', observe);
    const result = compileToScene(scene('enabled'), {
      composites: [definition],
      inspection: { root: { layout: { overflow: false } } },
    });

    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(
      { width: 40, height: 20 },
      expect.objectContaining({
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
        options: expect.objectContaining({ overflow: false, guides: true }),
        appearance: { colorScope: 0, scopeColor: '#2563eb', warningColor: '#d97706' },
      }),
    );
    expect(result.inspection?.entries[0]).toMatchObject({
      owner: { kind: 'composite', namespace: 'test', type: 'enabled' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      colorScope: 0,
      transform: [1, 0, 0, 1, 0, 0],
    });
    expect(flatten(result.inspection!.entries[0].scene.primitives)).toContainEqual(
      expect.objectContaining({ type: 'path', stroke: '#2563eb', dashPattern: [4, 4] }),
    );
    expect(result.artifacts).toHaveLength(1);
  });

  it('assigns continuous color scopes after final occurrence ordering', () => {
    const first = definitionOf('first');
    const second = definitionOf('second');
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          { namespace: 'test', type: 'second' },
          { namespace: 'test', type: 'first' },
        ],
      },
      { composites: [first, second], inspection: { root: { layout: true } } },
    );

    expect(result.inspection?.entries.map(entry => [entry.occurrence.sourcePath, entry.colorScope])).toEqual([
      ['children[0]', 0],
      ['children[1]', 1],
    ]);
  });

  it('merges Layout, authored subtree, and self fields into one canonical options object', () => {
    const observe = vi.fn();
    const definition = definitionOf('cascade', observe);

    compileToScene(scene('cascade'), {
      composites: [definition],
      inspection: {
        root: { layout: { bounds: { slot: false }, alignmentGuides: false } },
        roots: [
          {
            locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
            tree: {
              policy: {
                inherited: { layout: { bounds: { visual: true }, labels: true } },
                self: { overflow: false },
              },
            },
          },
        ],
      },
    });

    expect(observe).toHaveBeenCalledWith(
      { width: 40, height: 20 },
      expect.objectContaining({
        options: {
          bounds: { container: true, content: true, slot: false, allocation: true, visual: true },
          spacing: { padding: true, margin: true },
          overflow: false,
          alignmentGuides: false,
          labels: true,
          guides: true,
        },
      }),
    );
  });

  it('merges nested spacing values across inherited and self policies', () => {
    const observe = vi.fn();
    const definition = definitionOf('spacingCascade', observe);

    compileToScene(scene('spacingCascade'), {
      composites: [definition],
      inspection: {
        root: { layout: { spacing: false } },
        roots: [
          {
            locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
            tree: {
              policy: {
                inherited: { layout: { spacing: { padding: true } } },
                self: { spacing: { margin: false } },
              },
            },
          },
        ],
      },
    });

    expect(observe).toHaveBeenCalledWith(
      { width: 40, height: 20 },
      expect.objectContaining({ options: expect.objectContaining({ spacing: { padding: true, margin: false } }) }),
    );
  });

  it('keeps an authored enabled:false barrier closed against self re-enabling', () => {
    const observe = vi.fn();
    const definition = definitionOf('blocked', observe);
    const result = compileToScene(scene('blocked'), {
      composites: [definition],
      inspection: {
        root: { layout: true },
        roots: [
          {
            locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
            tree: { policy: { inherited: { enabled: false }, self: true } },
          },
        ],
      },
    });

    expect(observe).not.toHaveBeenCalled();
    expect(result.inspection).toBeNull();
  });

  it('fails loudly when an enabled selected Inspector has no artifact value', () => {
    const base = definitionOf('missingArtifact');
    const missing = defineComposite({
      namespace: 'test',
      type: 'missingArtifact',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('missingArtifact') }),
      artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
      inspector: base.inspector,
      compile: () => ({ children: [] }),
    });

    const error = thrownBy(() =>
      compileToScene(scene('missingArtifact'), {
        composites: [missing],
        inspection: { root: { layout: true } },
      }),
    );

    expect(error.message).toMatch(/COMPOSITE_INSPECTION_ARTIFACT_MISSING.*test\.missingArtifact/i);
    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'composite', namespace: 'test', type: 'missingArtifact' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
  });

  it('attaches occurrence resolve origin when a selected Inspector artifact fails its schema', () => {
    const base = definitionOf('invalidArtifact');
    const invalid = defineComposite({
      namespace: 'test',
      type: 'invalidArtifact',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('invalidArtifact') }),
      artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
      inspector: base.inspector,
      compile: () => ({ children: [], artifact: { width: 'invalid', height: 20 } as never }),
    });

    const error = thrownBy(() =>
      compileToScene(scene('invalidArtifact'), {
        composites: [invalid],
        inspection: { root: { layout: true } },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'composite', namespace: 'test', type: 'invalidArtifact' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
  });

  it('binds an authored child forest to the selected layoutChild replay', () => {
    const inspectLeaf = vi.fn();
    const leaf = definitionOf('nestedLeaf', inspectLeaf);
    const container = defineComposite({
      namespace: 'test',
      type: 'nestedContainer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedContainer'),
        child: z.custom<IRChild>(),
      }),
      compile: (node, context: LayoutCompositeCompileContext) => {
        const probe = context.layoutChild(node.child, NaturalLayoutProposal, context.inspection.child(0));
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });
    const nestedScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          namespace: 'test',
          type: 'nestedContainer',
          child: { namespace: 'test', type: 'nestedLeaf' },
        },
      ],
    };

    const result = compileToScene(nestedScene, {
      composites: [container, leaf],
      inspection: {
        roots: [
          {
            locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
            tree: {
              children: [
                [
                  {
                    locator: { target: 'composite', path: [] },
                    tree: { policy: { self: true } },
                  },
                ],
              ],
            },
          },
        ],
      },
    });

    expect(inspectLeaf).toHaveBeenCalledTimes(1);
    expect(result.inspection?.entries).toHaveLength(1);
    expect(flatten(result.inspection!.entries[0].scene.primitives)).toContainEqual(
      expect.objectContaining({ type: 'path', dashPattern: [4, 4] }),
    );
  });

  it('does not publish a request from a discarded layoutChild probe', () => {
    const inspectLeaf = vi.fn();
    const leaf = definitionOf('discardedProbeLeaf', inspectLeaf);
    const container = defineComposite({
      namespace: 'test',
      type: 'discardedProbeContainer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('discardedProbeContainer'),
        child: z.custom<IRChild>(),
      }),
      compile: (node, context: LayoutCompositeCompileContext) => {
        context.layoutChild(node.child, NaturalLayoutProposal, context.inspection.child(0));
        const selected = context.layoutChild(node.child, NaturalLayoutProposal, context.inspection.child(0));
        if (selected.kind === LayoutChildProbeKind.Failed) return context.raise(selected.failure);
        return { children: [context.replay(selected.result)] };
      },
    });
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            namespace: 'test',
            type: 'discardedProbeContainer',
            child: { namespace: 'test', type: 'discardedProbeLeaf' },
          },
        ],
      },
      {
        composites: [container, leaf],
        inspection: {
          roots: [
            {
              locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
              tree: {
                children: [
                  [
                    {
                      locator: { target: 'composite', path: [] },
                      tree: { policy: { self: true } },
                    },
                  ],
                ],
              },
            },
          ],
        },
      },
    );

    expect(inspectLeaf).toHaveBeenCalledTimes(1);
    expect(result.inspection?.entries.map(entry => entry.colorScope)).toEqual([0]);
  });

  it('fails loudly for sparse authored children and out-of-range inspection child handles', () => {
    const leaf = definitionOf('invalidChildLeaf');
    const sparseChildren = new Array(1);
    expect(() =>
      compileToScene(scene('invalidChildLeaf'), {
        composites: [leaf],
        inspection: {
          roots: [
            {
              locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
              tree: { children: sparseChildren },
            },
          ],
        } as never,
      }),
    ).toThrow(/children must be dense/i);

    const container = defineComposite({
      namespace: 'test',
      type: 'invalidChildContainer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidChildContainer'),
        child: z.custom<IRChild>(),
      }),
      compile: (node, context: LayoutCompositeCompileContext) => {
        context.inspection.child(1);
        const probe = context.layoutChild(node.child, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });
    const nestedScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          namespace: 'test',
          type: 'invalidChildContainer',
          child: { namespace: 'test', type: 'invalidChildLeaf' },
        },
      ],
    };

    expect(() =>
      compileToScene(nestedScene, {
        composites: [container, leaf],
        inspection: {
          roots: [
            {
              locator: { target: 'composite', path: [{ kind: 'sceneChild', index: 0 }] },
              tree: { children: [[]] },
            },
          ],
        },
      }),
    ).toThrow(/inspection child index.*out of bounds/i);
  });
});
