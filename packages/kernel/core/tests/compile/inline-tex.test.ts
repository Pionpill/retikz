import { describe, expect, it } from 'vitest';
import { type CompileWarning, CompileWarningCode } from '../../src/compile/constant';
import { compileToScene } from '../../src/compile/compile';
import type { LowerTex } from '../../src/compile/lower-tex';
import type { IR } from '../../src/schemas';
import type { PathPrim, ScenePrimitive, TextPrim } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const lowerTexCalls: Array<{ tex: string; displayMode?: boolean }> = [];

const fakeLowerTex: LowerTex = (content, style) => {
  lowerTexCalls.push({ tex: content.tex, displayMode: content.displayMode });
  if (content.tex === 'INVALID') return null;
  const width = Math.max(content.tex.length, 1) * style.fontSize * 0.5;
  const height = style.fontSize * (content.displayMode ? 2 : 1);
  return {
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [width, 0] },
      { kind: 'line', to: [width, height] },
      { kind: 'close' },
    ],
    width,
    height,
    depth: style.fontSize * 0.2,
  };
};

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const compile = (
  children: IR['children'],
  withTex = true,
): { primitives: Array<ScenePrimitive>; warnings: Array<CompileWarning>; width: number } => {
  const warnings: Array<CompileWarning> = [];
  lowerTexCalls.length = 0;
  const out = compileToScene(scene(children), {
    onWarn: w => warnings.push(w),
    ...(withTex ? { lowerTex: fakeLowerTex } : {}),
  });
  return { primitives: out.primitives, warnings, width: out.layout.width };
};

const glyphPaths = (prims: Array<ScenePrimitive>): Array<PathPrim> =>
  flattenPrims(prims).filter(
    (p): p is PathPrim => p.type === 'path' && p.fillRule === 'evenodd',
  );
const textPrims = (prims: Array<ScenePrimitive>): Array<TextPrim> =>
  flattenPrims(prims).filter((p): p is TextPrim => p.type === 'text');

describe('[inline-tex] node text', () => {
  it('renders a `$$...$$` node as a glyph block (no plain text prim)', () => {
    const { primitives } = compile([{ type: 'node', id: 'a', position: [0, 0], text: '$$ab$$' } as never]);
    expect(glyphPaths(primitives).length).toBe(1);
    expect(textPrims(primitives).length).toBe(0);
  });

  it('passes multiline `$$...$$` content to lowerTex as one display run', () => {
    const tex = String.raw`\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b
\end{array}`;
    const { primitives, warnings } = compile([
      { type: 'node', id: 'a', position: [0, 0], text: `$$${tex}$$` } as never,
    ]);
    expect(glyphPaths(primitives).length).toBe(1);
    expect(textPrims(primitives).length).toBe(0);
    expect(warnings.length).toBe(0);
    expect(lowerTexCalls).toEqual([{ tex, displayMode: true }]);
  });

  it('sizes a display-math node from the glyph bbox (wider tex → wider node)', () => {
    const narrow = compile([{ type: 'node', id: 'a', position: [0, 0], text: '$$ab$$' } as never]).width;
    const wide = compile([{ type: 'node', id: 'a', position: [0, 0], text: '$$abcdefgh$$' } as never]).width;
    expect(wide).toBeGreaterThan(narrow);
  });

  it('mixes text and inline math on one line', () => {
    const { primitives } = compile([{ type: 'node', id: 'a', position: [0, 0], text: 'a $x$ b' } as never]);
    expect(glyphPaths(primitives).length).toBe(1);
    expect(textPrims(primitives).map(t => t.lines[0].text)).toEqual(['a ', ' b']);
  });

  it('renders `$...$` literally when no lowerTex is injected (gating off)', () => {
    const { primitives, warnings } = compile(
      [{ type: 'node', id: 'a', position: [0, 0], text: 'a $x$ b' } as never],
      false,
    );
    expect(glyphPaths(primitives).length).toBe(0);
    expect(textPrims(primitives)[0].lines[0].text).toBe('a $x$ b');
    expect(warnings.length).toBe(0);
  });

  it('renders multiline `$$...$$` literally when no lowerTex is injected', () => {
    const text = String.raw`$$\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b
\end{array}$$`;
    const { primitives, warnings } = compile(
      [{ type: 'node', id: 'a', position: [0, 0], text } as never],
      false,
    );
    expect(glyphPaths(primitives).length).toBe(0);
    expect(textPrims(primitives)[0].lines.map(line => line.text)).toEqual(text.split('\n'));
    expect(warnings.length).toBe(0);
  });

  it('warns on an unbalanced `$` but keeps the text', () => {
    const { warnings } = compile([{ type: 'node', id: 'a', position: [0, 0], text: 'a $x' } as never]);
    expect(warnings.some(w => w.code === CompileWarningCode.TextTexParseError)).toBe(true);
  });

  it('warns and skips an invalid tex run, keeping the rest of the line', () => {
    const { primitives, warnings } = compile([
      { type: 'node', id: 'a', position: [0, 0], text: 'ok $INVALID$ done' } as never,
    ]);
    expect(warnings.some(w => w.code === CompileWarningCode.TexInvalid)).toBe(true);
    expect(glyphPaths(primitives).length).toBe(0);
    expect(textPrims(primitives).length).toBeGreaterThan(0);
  });

  it('supports explicit runs with per-run fill', () => {
    const { primitives } = compile([
      {
        type: 'node',
        id: 'a',
        position: [0, 0],
        text: [{ runs: [{ text: 'E=' }, { tex: 'mc^2', fill: '#ff0000' }] }],
      } as never,
    ]);
    const glyphs = glyphPaths(primitives);
    expect(glyphs.length).toBe(1);
    expect(glyphs[0].fill).toBe('#ff0000');
    expect(textPrims(primitives).map(t => t.lines[0].text)).toEqual(['E=']);
  });
});

describe('[inline-tex] labels', () => {
  it('renders inline math in an edge label', () => {
    const { primitives } = compile([
      { type: 'node', id: 'a', position: [0, 0], shape: 'rectangle' } as never,
      { type: 'node', id: 'b', position: [100, 0], shape: 'rectangle' } as never,
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'a' } },
          { type: 'step', kind: 'line', to: { id: 'b' }, label: { text: 'v=$d/t$' } },
        ],
      } as never,
    ]);
    expect(glyphPaths(primitives).length).toBe(1);
  });

  it('renders inline math in a node label', () => {
    const { primitives } = compile([
      {
        type: 'node',
        id: 'a',
        position: [0, 0],
        shape: 'rectangle',
        text: 'box',
        label: { text: 'area $r^2$' },
      } as never,
    ]);
    expect(glyphPaths(primitives).length).toBe(1);
  });
});
