import { describe, expect, it } from 'vitest';

import type { VanillaTier2Adapter } from '../../src';

import { embed, figure, path, scope } from '../../src';
import { normalizeFigureSpec } from '../../src/spec';

describe('Vanilla authored sites', () => {
  it('只报告 scene/scope/path/embeddable sourcePath、类型与 opaque authoring', () => {
    const sceneAuthoring = Object.freeze({ role: 'scene' });
    const scopeAuthoring = Object.freeze({ role: 'scope' });
    const pathAuthoring = Object.freeze({ role: 'path' });
    const embeddedAuthoring = Object.freeze({ role: 'embedded' });
    const adapter: VanillaTier2Adapter<Record<string, never>> = {
      kind: 'fixture-embedded',
      namespace: 'fixture',
      lower: () => ({
        node: { namespace: 'fixture', type: 'embedded' },
        datasets: {},
        makeComposites: () => [],
      }),
    };

    const normalized = normalizeFigureSpec(
      figure({
        authoring: sceneAuthoring,
        children: [
          scope({ authoring: scopeAuthoring }, [
            path('curve', {
              authoring: pathAuthoring,
              way: [
                [0, 0],
                [10, 0],
              ],
            }),
            embed('fixture-embedded', 'embedded', {}, embeddedAuthoring),
          ]),
        ],
      }),
      { adapters: [adapter] },
    );

    expect(normalized.authoringSites).toEqual([
      { kind: 'scene', sourcePath: '', type: 'figure', authoring: sceneAuthoring },
      { kind: 'scope', sourcePath: 'children[0].scope', type: 'scope', authoring: scopeAuthoring },
      {
        kind: 'path',
        sourcePath: 'children[0].scope.children[0].path',
        type: 'path',
        authoring: pathAuthoring,
      },
      {
        kind: 'embeddable',
        sourcePath: 'children[0].scope.children[1]',
        type: 'fixture-embedded',
        authoring: embeddedAuthoring,
      },
    ]);
    expect(normalized).not.toHaveProperty('inspectionRoots');
    expect(normalized.ir).not.toHaveProperty('authoring');
  });
});
