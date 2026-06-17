import { describe, expect, it } from 'vitest';
import { convertReactNodeToIR } from '@retikz/react';
import { compileToScene } from '@retikz/core';
import type { LowerMath } from '@retikz/core';
import { Math } from '../src/Math';

/**
 * alpha.5 ADR-01：<Math> sugar = <Node math>，配 lowerMath 注入端到端产字形。
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

describe('[Math] <Math> sugar', () => {
  it('<Math tex> → IR node.math', () => {
    const ir = convertReactNodeToIR(<Math position={[0, 0]} tex="x^2" />);
    expect(ir.children[0]).toMatchObject({ type: 'node', math: { tex: 'x^2' } });
  });

  it('<Math displayMode> → math.displayMode=true', () => {
    const ir = convertReactNodeToIR(<Math position={[0, 0]} tex="x" displayMode />);
    expect(ir.children[0]).toMatchObject({ type: 'node', math: { tex: 'x', displayMode: true } });
  });

  it('透传 Node props（shape / fill → 带框公式 B）', () => {
    const ir = convertReactNodeToIR(<Math position={[0, 0]} tex="x" shape="rectangle" fill="#eef" />);
    expect(ir.children[0]).toMatchObject({ type: 'node', shape: 'rectangle', fill: '#eef', math: { tex: 'x' } });
  });

  it('e2e：<Math> + fake lowerMath → compileToScene 产字形 path', () => {
    const ir = convertReactNodeToIR(<Math position={[0, 0]} tex="x" />);
    const scene = compileToScene(ir, { lowerMath: fakeLowerMath });
    expect(JSON.stringify(scene.primitives)).toContain('"fillRule":"evenodd"');
  });
});
