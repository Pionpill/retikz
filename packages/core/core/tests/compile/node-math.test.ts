import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { CompileWarningCode } from '../../src/compile/constant';
import type { LowerMath } from '../../src/compile/lower-math';
import type { CompileWarning } from '../../src/compile/constant';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

/**
 * alpha.5 ADR-01：node.math 内容编译路径（经注入 lowerMath 渲染字形 + bbox 定尺寸）。
 * 用 fake lowerMath 验证 compile 行为，不依赖 MathJax。
 */

/** 假 lowerMath：tex='INVALID' → null；否则产一个矩形字形，宽随 tex 长度、高随 fontSize */
const fakeLowerMath: LowerMath = (content, style) => {
  if (content.tex === 'INVALID') return null;
  const width = Math.max(content.tex.length, 1) * style.fontSize * 0.5;
  const height = style.fontSize * (content.displayMode ? 2 : 1);
  return {
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [width, 0] },
      { kind: 'line', to: [width, height] },
      { kind: 'line', to: [0, height] },
      { kind: 'close' },
    ],
    width,
    height,
    depth: style.fontSize * 0.2,
  };
};

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const compileMath = (
  extra: Record<string, unknown>,
  opts?: { lowerMath?: LowerMath },
): { primitives: Array<ScenePrimitive>; warnings: Array<CompileWarning> } => {
  const warnings: Array<CompileWarning> = [];
  const out = compileToScene(
    scene([{ type: 'node', id: 'eq', position: [0, 0], ...extra } as never]),
    { onWarn: w => warnings.push(w), lowerMath: opts?.lowerMath ?? fakeLowerMath },
  );
  return { primitives: out.primitives, warnings };
};

const findGlyphPath = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  flattenPrims(prims).find(
    (p): p is PathPrim => p.type === 'path' && p.fillRule === 'evenodd',
  );

// ════════════════ Happy ════════════════

describe('[node-math] Happy', () => {
  it('node-math-emits-paths：node.math → emit 字形 PathPrim（fillRule=evenodd）', () => {
    const { primitives } = compileMath({ math: { tex: 'ab' } });
    const glyph = findGlyphPath(primitives);
    expect(glyph).toBeDefined();
    expect(glyph!.commands.length).toBeGreaterThan(0);
  });

  it('bbox-sizes-node：node 尺寸由公式 bbox 决定（更长 tex → 更宽）', () => {
    const narrow = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], math: { tex: 'x' } } as never]),
      { lowerMath: fakeLowerMath },
    );
    const wide = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], math: { tex: 'xxxxxxxx' } } as never]),
      { lowerMath: fakeLowerMath },
    );
    expect(wide.layout.width).toBeGreaterThan(narrow.layout.width);
  });

  it('color-inherit：字形 fill 取 textColor', () => {
    const { primitives } = compileMath({ math: { tex: 'x' }, textColor: '#3b82f6' });
    expect(findGlyphPath(primitives)!.fill).toBe('#3b82f6');
  });

  it('color-default：未给 textColor → currentColor', () => {
    const { primitives } = compileMath({ math: { tex: 'x' } });
    expect(findGlyphPath(primitives)!.fill).toBe('currentColor');
  });
});

// ════════════════ 边界 ════════════════

describe('[node-math] 边界', () => {
  it('display-vs-inline：displayMode 改变 bbox 高度（→ 节点更高）', () => {
    const inline = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], math: { tex: 'x' } } as never]),
      { lowerMath: fakeLowerMath },
    );
    const display = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], math: { tex: 'x', displayMode: true } } as never]),
      { lowerMath: fakeLowerMath },
    );
    expect(display.layout.height).toBeGreaterThan(inline.layout.height);
  });

  it('math-vs-text-precedence：同给 text + math → math 优先（emit 字形、无 TextPrim）', () => {
    const { primitives } = compileMath({ math: { tex: 'x' }, text: 'hello' });
    const flat = flattenPrims(primitives);
    expect(flat.some(p => p.type === 'path' && p.fillRule === 'evenodd')).toBe(true);
    expect(flat.some(p => p.type === 'text')).toBe(false);
  });
});

// ════════════════ 错误路径 ════════════════

describe('[node-math] 错误路径', () => {
  it('lowermath-missing：有 math 但未注入 lowerMath → MATH_LOWERER_MISSING + 不 emit 字形、不抛', () => {
    const warnings: Array<CompileWarning> = [];
    const out = compileToScene(
      scene([{ type: 'node', id: 'eq', position: [0, 0], math: { tex: 'x' } } as never]),
      { onWarn: w => warnings.push(w) },
    );
    expect(warnings.some(w => w.code === CompileWarningCode.MathLowererMissing)).toBe(true);
    expect(findGlyphPath(out.primitives)).toBeUndefined();
  });

  it('invalid-tex：lowerMath 返回 null → MATH_TEX_INVALID + 不 emit 字形、不抛', () => {
    const { primitives, warnings } = compileMath({ math: { tex: 'INVALID' } });
    expect(warnings.some(w => w.code === CompileWarningCode.MathTexInvalid)).toBe(true);
    expect(findGlyphPath(primitives)).toBeUndefined();
  });
});

// ════════════════ 交互 ════════════════

describe('[node-math] 交互', () => {
  it('math-with-effects：node.math + shadow + opacity → 效果落字形 path', () => {
    const { primitives } = compileMath({ math: { tex: 'x' }, shadow: 'md', opacity: 0.6 });
    const glyph = findGlyphPath(primitives)!;
    expect(glyph.opacity).toBe(0.6);
    expect(glyph.shadow).toBeDefined();
  });

  it('math-with-container-shape：rectangle + math → emit 容器 RectPrim + 字形 path（带框公式 B）', () => {
    const { primitives } = compileMath({ math: { tex: 'x' }, shape: 'rectangle', fill: '#eef' });
    const flat = flattenPrims(primitives);
    expect(flat.some(p => p.type === 'rect')).toBe(true);
    expect(flat.some(p => p.type === 'path' && p.fillRule === 'evenodd')).toBe(true);
  });

  it('math-node-connectable：可被 Path 连线（boundaryPoint 走 node bbox，不抛）', () => {
    const out = compileToScene(
      scene([
        { type: 'node', id: 'eq', position: [0, 0], math: { tex: 'x' } } as never,
        { type: 'node', id: 'b', position: [100, 0], shape: 'rectangle' } as never,
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'eq' } },
            { type: 'step', kind: 'line', to: { id: 'b' } },
          ],
        } as never,
      ]),
      { lowerMath: fakeLowerMath },
    );
    const line = flattenPrims(out.primitives).find(
      (p): p is PathPrim => p.type === 'path' && p.fillRule !== 'evenodd' && p.commands.length >= 2,
    );
    expect(line).toBeDefined();
  });
});

// ════════════════ round-trip ════════════════

describe('[node-math] round-trip', () => {
  it('含 math 的场景重复编译稳定（字形数一致）', () => {
    const a = compileMath({ math: { tex: 'abc' } });
    const b = compileMath({ math: { tex: 'abc' } });
    expect(findGlyphPath(a.primitives)!.commands.length).toBe(
      findGlyphPath(b.primitives)!.commands.length,
    );
  });
});
