import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { IRChild, IRScene, LayoutCompositeCompileContext } from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '../../src';

const scene = (type: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ namespace: 'test', type }],
});

const definitionOf = (type: string, inspect = vi.fn()) =>
  defineComposite({
    namespace: 'test',
    type,
    schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal(type) }),
    artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
    inspector: {
      kind: 'layout',
      localOptionsInputSchema: z.strictObject({ guides: z.boolean().optional() }),
      localOptionsSchema: z
        .strictObject({ guides: z.boolean().optional() })
        .transform(value => ({ guides: value.guides ?? true })),
      inspect: (artifact, context) => {
        inspect(artifact, context);
        return [
          {
            kind: 'rect' as const,
            role: 'test.container',
            x: 0,
            y: 0,
            width: artifact.width,
            height: artifact.height,
            presentation: 'outline' as const,
            tone: 'neutral' as const,
          },
        ];
      },
    },
    compile: () => ({
      children: [{ type: 'node', position: [0, 0], text: 'content' }],
      artifact: { width: 40, height: 20 },
    }),
  });

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

  it('runs the selected definition inspector once from the final typed artifact', () => {
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
        baseOptions: expect.objectContaining({ overflow: false }),
        options: { guides: true },
      }),
    );
    expect(result.inspection).toEqual({
      entries: [
        {
          occurrence: { sourcePath: 'children[0]', expansionPath: [] },
          transform: [1, 0, 0, 1, 0, 0],
          primitives: [
            {
              kind: 'rect',
              role: 'test.container',
              x: 0,
              y: 0,
              width: 40,
              height: 20,
              presentation: 'outline',
              tone: 'neutral',
            },
          ],
        },
      ],
    });
    expect(result.artifacts).toHaveLength(1);
  });

  it('merges Layout, authored subtree, and component fields before resolving one canonical request', () => {
    const observe = vi.fn();
    const definition = definitionOf('cascade', observe);

    compileToScene(scene('cascade'), {
      composites: [definition],
      inspection: {
        root: { layout: { bounds: { slot: false }, alignmentGuides: false } },
        roots: [
          {
            locator: { path: [{ kind: 'sceneChild', index: 0 }] },
            tree: {
              policy: {
                inherited: { layout: { bounds: { visual: true }, labels: true } },
                component: { overflow: false },
              },
            },
          },
        ],
      },
    });

    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(
      { width: 40, height: 20 },
      expect.objectContaining({
        baseOptions: {
          bounds: {
            container: true,
            content: true,
            slot: false,
            allocation: true,
            visual: true,
          },
          overflow: false,
          alignmentGuides: false,
          labels: true,
        },
      }),
    );
  });

  it('keeps an authored enabled:false barrier closed against component re-enabling', () => {
    const observe = vi.fn();
    const definition = definitionOf('blocked', observe);
    const result = compileToScene(scene('blocked'), {
      composites: [definition],
      inspection: {
        root: { layout: true },
        roots: [
          {
            locator: { path: [{ kind: 'sceneChild', index: 0 }] },
            tree: {
              policy: {
                inherited: { enabled: false },
                component: true,
              },
            },
          },
        ],
      },
    });

    expect(observe).not.toHaveBeenCalled();
    expect(result.inspection).toBeNull();
  });

  it('fails loudly when an enabled selected inspector has no artifact value', () => {
    const base = definitionOf('missingArtifact');
    const missing = defineComposite({
      ...base,
      compile: () => ({ children: [] }),
    });

    expect(() =>
      compileToScene(scene('missingArtifact'), {
        composites: [missing],
        inspection: { root: { layout: true } },
      }),
    ).toThrow(/COMPOSITE_INSPECTION_ARTIFACT_MISSING.*test\.missingArtifact/i);
  });

  it('binds an authored child forest to the selected layoutChild probe and replay', () => {
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
            locator: { path: [{ kind: 'sceneChild', index: 0 }] },
            tree: {
              children: [
                [
                  {
                    locator: { path: [] },
                    tree: { policy: { component: true } },
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
    expect(result.inspection?.entries[0].primitives[0]).toMatchObject({ role: 'test.container' });
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
              locator: { path: [{ kind: 'sceneChild', index: 0 }] },
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
              locator: { path: [{ kind: 'sceneChild', index: 0 }] },
              tree: { children: [[]] },
            },
          ],
        },
      }),
    ).toThrow(/inspection child index.*out of bounds/i);
  });
});
