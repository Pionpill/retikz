import { describe, expect, it } from 'vitest';
import type { LowerMath } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { Node } from '../../src/kernel/Node';
import { buildIR } from '../../src/kernel/builder';

/**
 * alpha.5 ADR-01：React `<Node math>` 透传 + Layout 的 lowerMath 注入通道。
 */

const fakeLowerMath: LowerMath = (content, style) => ({
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [content.tex.length * style.fontSize, style.fontSize] },
    { kind: 'close' },
  ],
  width: content.tex.length * style.fontSize,
  height: style.fontSize,
  depth: 0,
});

describe('[node-math] <Node math> 透传', () => {
  it('math prop → IR node.math', () => {
    const out = buildIR(<Node position={[0, 0]} math={{ tex: '\\frac{a}{b}' }} />);
    expect(out.children[0]).toMatchObject({ type: 'node', math: { tex: '\\frac{a}{b}' } });
  });

  it('注入 lowerMath → compile 产字形 PathPrim（fillRule=evenodd）', () => {
    const ir = buildIR(<Node position={[0, 0]} math={{ tex: 'x' }} />);
    const scene = compileToScene(ir, { lowerMath: fakeLowerMath });
    const flat = JSON.stringify(scene.primitives);
    expect(flat).toContain('"fillRule":"evenodd"');
  });
});
