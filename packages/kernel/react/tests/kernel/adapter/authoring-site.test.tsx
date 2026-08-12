import type { FC } from 'react';

import { describe, expect, it } from 'vitest';

import type { EmbeddableTier2Adapter } from '../../../src';

import { Path, Scope, Step } from '../../../src';
import { buildIRWithContributions } from '../../../src/kernel/adapter';

const Embedded: FC<{ authoring?: unknown }> = () => null;
Embedded.displayName = 'Embedded';

describe('React authored sites', () => {
  it('只报告 scene/scope/path/embeddable locator、元素 type 与 opaque props', () => {
    const sceneAuthoring = Object.freeze({ role: 'scene' });
    const scopeAuthoring = Object.freeze({ role: 'scope' });
    const pathAuthoring = Object.freeze({ role: 'path' });
    const embeddedAuthoring = Object.freeze({ role: 'embedded' });
    const adapter: EmbeddableTier2Adapter = {
      displayName: 'Embedded',
      contribute: () => ({
        node: { namespace: 'fixture', type: 'embedded' },
        compositeDependencies: { roots: [], providers: [] },
        authoringSites: [
          {
            kind: 'path',
            owner: { kind: 'pathKind', name: 'stroke' },
            elementType: Embedded,
            props: { authoring: { role: 'nested' } },
          },
        ],
      }),
    };
    const SceneElement = (): null => null;

    const result = buildIRWithContributions(
      <Scope authoring={scopeAuthoring}>
        <Path authoring={pathAuthoring}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[10, 0]} />
        </Path>
        <Embedded authoring={embeddedAuthoring} />
      </Scope>,
      [adapter],
      { elementType: SceneElement, props: { authoring: sceneAuthoring } },
    );

    expect(result.authoringSites).toEqual([
      {
        kind: 'scene',
        sourcePath: '',
        elementType: SceneElement,
        props: { authoring: sceneAuthoring },
      },
      {
        kind: 'scope',
        sourcePath: 'children[0].scope',
        elementType: Scope,
        props: expect.objectContaining({ authoring: scopeAuthoring }),
      },
      {
        kind: 'path',
        sourcePath: 'children[0].scope.children[0].path',
        owner: { kind: 'pathKind', name: 'stroke' },
        elementType: Path,
        props: expect.objectContaining({ authoring: pathAuthoring }),
      },
      {
        kind: 'embeddable',
        sourcePath: 'children[0].scope.children[1]',
        owner: { kind: 'composite', namespace: 'fixture', type: 'embedded' },
        elementType: Embedded,
        props: expect.objectContaining({ authoring: embeddedAuthoring }),
      },
      {
        kind: 'path',
        sourcePath: 'children[0].scope.children[1]',
        owner: { kind: 'pathKind', name: 'stroke' },
        elementType: Embedded,
        props: { authoring: { role: 'nested' } },
      },
    ]);
    expect(result).not.toHaveProperty('inspectionRoots');
    expect(result.ir).not.toHaveProperty('authoring');
  });
});
