import { describe, expect, it } from 'vitest';
import type { LowerMath } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { Node } from '../../src/kernel/Node';
import { buildIR } from '../../src/kernel/builder';

/**
 * alpha.5 ADR-01：React `<Node math>` 透传 + children 对象写法 + Layout 的 lowerMath 注入通道。
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

  it('children 对象 → IR node.math（与 math prop 等价）', () => {
    const out = buildIR(<Node position={[0, 0]}>{{ tex: 'E=mc^2', displayMode: true }}</Node>);
    expect(out.children[0]).toMatchObject({ type: 'node', math: { tex: 'E=mc^2', displayMode: true } });
    // 公式对象不被当成文本
    expect((out.children[0] as { text?: unknown }).text).toBeUndefined();
  });

  it('children 对象归一化：丢弃多余键、displayMode 省略时不写', () => {
    const out = buildIR(<Node position={[0, 0]}>{{ tex: 'a+b', foo: 1 } as { tex: string }}</Node>);
    expect(out.children[0]).toMatchObject({ type: 'node', math: { tex: 'a+b' } });
    expect((out.children[0] as { math: Record<string, unknown> }).math).not.toHaveProperty('foo');
    expect((out.children[0] as { math: Record<string, unknown> }).math).not.toHaveProperty('displayMode');
  });

  it('math prop 优先于 children 文本', () => {
    const out = buildIR(
      <Node position={[0, 0]} math={{ tex: 'x^2' }}>
        plain text
      </Node>,
    );
    expect(out.children[0]).toMatchObject({ type: 'node', math: { tex: 'x^2' }, text: 'plain text' });
  });

  it('注入 lowerMath → compile 产字形 PathPrim（fillRule=evenodd）', () => {
    const ir = buildIR(<Node position={[0, 0]} math={{ tex: 'x' }} />);
    const scene = compileToScene(ir, { lowerMath: fakeLowerMath });
    const flat = JSON.stringify(scene.primitives);
    expect(flat).toContain('"fillRule":"evenodd"');
  });
});
