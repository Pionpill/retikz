import { pathClipProvider } from '@retikz/extension';
import { createInputScene, Node } from '@retikz/react';
import { createSurface, frameProvider, surfaceProvider } from '@retikz/standard/presentation';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { SurfaceProps } from '../../src/presentation';
import { Frame, Surface } from '../../src/presentation';
import { synchronousAdapters } from '../helpers/synchronous-adapters';

/** 以 React 真实 authoring 路径归一化一个 Surface */
const contribute = ({ children, ...props }: SurfaceProps) => {
  const input = createInputScene(<Surface {...props}>{children}</Surface>);
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

  return {
    node: normalized.ir.children[0],
    providerDependencies: normalized.contributions[0],
  };
};

describe('<Surface>', () => {
  it('将一个 Core 子项转换为规范的 Surface IR', () => {
    const contribution = contribute({
      id: 'panel',
      padding: { x: 4, y: 2 },
      children: <Node position={[0, 0]} text="A" />,
    });

    expect(contribution.node).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        id: 'panel',
        padding: { x: 4, y: 2 },
        child: { type: 'node', position: [0, 0], text: 'A' },
      }),
    );
    expect(contribution.providerDependencies).toEqual({
      roots: [surfaceProvider.key],
      providers: [surfaceProvider, pathClipProvider],
    });
  });

  it('按编写顺序保留 Surface 之后的嵌套 Tier-2 根和提供者', () => {
    const input = createInputScene(
      <Surface id="panel">
        <Frame id="card">
          <Node position={[0, 0]} text="A" />
        </Frame>
      </Surface>,
    );
    const result = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

    expect(result.ir.children).toHaveLength(1);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]?.roots).toEqual([surfaceProvider.key, frameProvider.key]);
    expect(result.contributions[0]?.providers).toEqual([surfaceProvider, pathClipProvider, frameProvider]);
    expect(result.ir.children[0]).toMatchObject({
      namespace: 'standard',
      type: 'surface',
      id: 'panel',
      child: { namespace: 'standard', type: 'frame', id: 'card' },
    });
  });

  it('除非孩子们正好降到一个 IR 孩子，否则会明确报错', () => {
    expect(() => contribute({ children: null })).toThrow(/exactly one/i);
    expect(() =>
      contribute({
        children: (
          <>
            <Node position={[0, 0]} />
            <Node position={[1, 1]} />
          </>
        ),
      }),
    ).toThrow(/exactly one/i);
  });
});
