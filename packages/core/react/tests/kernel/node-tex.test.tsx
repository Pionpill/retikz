import { describe, expect, it } from 'vitest';
import type { LowerTex } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { Node } from '../../src/kernel/Node';
import { buildIR } from '../../src/kernel/builder';

const fakeLowerTex: LowerTex = (content, style) => ({
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [content.tex.length * style.fontSize, style.fontSize] },
    { kind: 'close' },
  ],
  width: content.tex.length * style.fontSize,
  height: style.fontSize,
  depth: 0,
});

describe('[node-tex] <Node tex>', () => {
  it('maps the tex prop to IR node.tex', () => {
    const out = buildIR(<Node position={[0, 0]} tex={{ tex: '\\frac{a}{b}' }} />);
    expect(out.children[0]).toMatchObject({ type: 'node', tex: { tex: '\\frac{a}{b}' } });
  });

  it('maps children objects to IR node.tex', () => {
    const out = buildIR(<Node position={[0, 0]}>{{ tex: 'E=mc^2', displayMode: true }}</Node>);
    expect(out.children[0]).toMatchObject({ type: 'node', tex: { tex: 'E=mc^2', displayMode: true } });
    expect((out.children[0] as { text?: unknown }).text).toBeUndefined();
  });

  it('normalizes children objects', () => {
    const out = buildIR(<Node position={[0, 0]}>{{ tex: 'a+b', foo: 1 } as { tex: string }}</Node>);
    expect(out.children[0]).toMatchObject({ type: 'node', tex: { tex: 'a+b' } });
    expect((out.children[0] as { tex: Record<string, unknown> }).tex).not.toHaveProperty('foo');
    expect((out.children[0] as { tex: Record<string, unknown> }).tex).not.toHaveProperty('displayMode');
  });

  it('keeps explicit tex content when text children are also present', () => {
    const out = buildIR(
      <Node position={[0, 0]} tex={{ tex: 'x^2' }}>
        plain text
      </Node>,
    );
    expect(out.children[0]).toMatchObject({ type: 'node', tex: { tex: 'x^2' }, text: 'plain text' });
  });

  it('forwards lowerTex into compile', () => {
    const ir = buildIR(<Node position={[0, 0]} tex={{ tex: 'x' }} />);
    const scene = compileToScene(ir, { lowerTex: fakeLowerTex });
    expect(JSON.stringify(scene.primitives)).toContain('"fillRule":"evenodd"');
  });
});
