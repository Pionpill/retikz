import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { InspectionAppearance, IRChild, IRScene } from '../../src';

import { compileToScene, CompositeBaseSchema, defineComposite, defineInspector } from '../../src';

const sceneWith = (children: Array<IRChild>, theme?: IRScene['theme']): IRScene => ({
  type: 'scene',
  version: 1,
  ...(theme === undefined ? {} : { theme }),
  children,
});

const inspectionDefinition = (
  type: string,
  observe: (appearance: InspectionAppearance) => void,
  output: 'path' | 'empty' = 'path',
) =>
  defineComposite({
    namespace: 'inspection-theme',
    type,
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('inspection-theme'),
      type: z.literal(type),
    }),
    artifactSchema: z.strictObject({}),
    inspector: defineInspector({
      kind: 'composite',
      optionsInputSchema: z.strictObject({}),
      optionsSchema: z.strictObject({}),
      inspect: (_artifact, context) => {
        observe(context.appearance);
        if (output === 'empty') return [];
        return {
          type: 'path',
          stroke: context.appearance.scopeColor,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [1, 0] },
          ],
        };
      },
    }),
    compile: () => ({ children: [], artifact: {} }),
  });

describe('Inspector Theme appearance', () => {
  it('每个 occurrence 从自己的 ResolvedTheme.colors 读取 categorical 与 warning', () => {
    const appearances: Array<InspectionAppearance> = [];
    const first = inspectionDefinition('first', appearance => appearances.push(appearance));
    const second = inspectionDefinition('second', appearance => appearances.push(appearance));

    compileToScene(
      sceneWith([
        {
          type: 'scope',
          theme: {
            tokens: {
              core: {
                'semantic.error': '#first-error',
                'semantic.warning': '#first-warning',
                'palette.categorical': ['#first-scope'],
              },
            },
          },
          children: [{ namespace: 'inspection-theme', type: 'first' }],
        },
        {
          type: 'scope',
          theme: {
            tokens: {
              core: {
                'semantic.error': '#second-error',
                'semantic.warning': '#second-warning',
                'palette.categorical': ['#second-scope'],
              },
            },
          },
          children: [{ namespace: 'inspection-theme', type: 'second' }],
        },
      ]),
      {
        composites: [first, second],
        inspection: { root: { layout: true } },
      },
    );

    expect(appearances).toMatchObject([
      { colorScope: 0, scopeColor: '#first-scope', warningColor: '#first-warning' },
      { colorScope: 1, scopeColor: '#second-scope', warningColor: '#second-warning' },
    ]);
    expect(appearances[0]?.warningColor).not.toBe(appearances[0]?.scopeColor);
  });

  it('空 Inspector output 仍占用 colorScope，并按 categorical palette 稳定取余', () => {
    const appearances: Array<InspectionAppearance> = [];
    const empty = inspectionDefinition('empty', appearance => appearances.push(appearance), 'empty');
    const first = inspectionDefinition('first', appearance => appearances.push(appearance));
    const second = inspectionDefinition('second', appearance => appearances.push(appearance));

    const result = compileToScene(
      sceneWith(
        [
          { namespace: 'inspection-theme', type: 'empty' },
          { namespace: 'inspection-theme', type: 'first' },
          { namespace: 'inspection-theme', type: 'second' },
        ],
        { tokens: { core: { 'palette.categorical': ['#one', '#two'] } } },
      ),
      {
        composites: [empty, first, second],
        inspection: { root: { layout: true } },
      },
    );

    expect(appearances.map(appearance => [appearance.colorScope, appearance.scopeColor])).toEqual([
      [0, '#one'],
      [1, '#two'],
      [2, '#one'],
    ]);
    expect(result.inspection?.entries.map(entry => entry.colorScope)).toEqual([1, 2]);
  });
});
