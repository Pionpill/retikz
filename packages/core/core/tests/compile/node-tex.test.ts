import { describe, expect, it } from 'vitest';
import { type CompileWarning, CompileWarningCode } from '../../src/compile/constant';
import { compileToScene } from '../../src/compile/compile';
import type { LowerTex } from '../../src/compile/lower-tex';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const fakeLowerTex: LowerTex = (content, style) => {
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

const compileTex = (
  extra: Record<string, unknown>,
  opts?: { lowerTex?: LowerTex },
): { primitives: Array<ScenePrimitive>; warnings: Array<CompileWarning> } => {
  const warnings: Array<CompileWarning> = [];
  const out = compileToScene(
    scene([{ type: 'node', id: 'eq', position: [0, 0], ...extra } as never]),
    { onWarn: warning => warnings.push(warning), lowerTex: opts?.lowerTex ?? fakeLowerTex },
  );
  return { primitives: out.primitives, warnings };
};

const findGlyphPath = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  flattenPrims(prims).find(
    (prim): prim is PathPrim => prim.type === 'path' && prim.fillRule === 'evenodd',
  );

describe('[node-tex] compile', () => {
  it('emits glyph paths for node.tex', () => {
    const { primitives } = compileTex({ tex: { tex: 'ab' } });
    expect(findGlyphPath(primitives)?.commands.length).toBeGreaterThan(0);
  });

  it('sizes the node from the lowered bbox', () => {
    const narrow = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], tex: { tex: 'x' } } as never]),
      { lowerTex: fakeLowerTex },
    );
    const wide = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], tex: { tex: 'xxxxxxxx' } } as never]),
      { lowerTex: fakeLowerTex },
    );
    expect(wide.layout.width).toBeGreaterThan(narrow.layout.width);
  });

  it('inherits textColor into glyph fill', () => {
    const { primitives } = compileTex({ tex: { tex: 'x' }, textColor: '#3b82f6' });
    expect(findGlyphPath(primitives)?.fill).toBe('#3b82f6');
  });

  it('uses currentColor as the default glyph fill', () => {
    const { primitives } = compileTex({ tex: { tex: 'x' } });
    expect(findGlyphPath(primitives)?.fill).toBe('currentColor');
  });

  it('uses display metrics when displayMode is true', () => {
    const inline = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], tex: { tex: 'x' } } as never]),
      { lowerTex: fakeLowerTex },
    );
    const display = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], tex: { tex: 'x', displayMode: true } } as never]),
      { lowerTex: fakeLowerTex },
    );
    expect(display.layout.height).toBeGreaterThan(inline.layout.height);
  });

  it('prefers tex content over text content and warns', () => {
    const { primitives, warnings } = compileTex({ tex: { tex: 'x' }, text: 'hello' });
    const flat = flattenPrims(primitives);
    expect(flat.some(prim => prim.type === 'path' && prim.fillRule === 'evenodd')).toBe(true);
    expect(flat.some(prim => prim.type === 'text')).toBe(false);
    expect(warnings.some(warning => warning.code === CompileWarningCode.TexTextConflict)).toBe(true);
  });

  it('warns and skips glyphs when lowerTex is missing', () => {
    const warnings: Array<CompileWarning> = [];
    const out = compileToScene(
      scene([{ type: 'node', id: 'eq', position: [0, 0], tex: { tex: 'x' } } as never]),
      { onWarn: warning => warnings.push(warning) },
    );
    expect(warnings.some(warning => warning.code === CompileWarningCode.TexLowererMissing)).toBe(true);
    expect(findGlyphPath(out.primitives)).toBeUndefined();
  });

  it('warns and skips glyphs when lowerTex returns null', () => {
    const { primitives, warnings } = compileTex({ tex: { tex: 'INVALID' } });
    expect(warnings.some(warning => warning.code === CompileWarningCode.TexInvalid)).toBe(true);
    expect(findGlyphPath(primitives)).toBeUndefined();
  });

  it('applies effects to the glyph path', () => {
    const { primitives } = compileTex({ tex: { tex: 'x' }, shadow: 'md', opacity: 0.6 });
    const glyph = findGlyphPath(primitives)!;
    expect(glyph.opacity).toBe(0.6);
    expect(glyph.shadow).toBeDefined();
  });

  it('emits the container shape and glyph path for framed formulas', () => {
    const { primitives } = compileTex({ tex: { tex: 'x' }, shape: 'rectangle', fill: '#eef' });
    const flat = flattenPrims(primitives);
    expect(flat.some(prim => prim.type === 'rect')).toBe(true);
    expect(flat.some(prim => prim.type === 'path' && prim.fillRule === 'evenodd')).toBe(true);
  });

  it('keeps a tex node connectable', () => {
    const out = compileToScene(
      scene([
        { type: 'node', id: 'eq', position: [0, 0], tex: { tex: 'x' } } as never,
        { type: 'node', id: 'b', position: [100, 0], shape: 'rectangle' } as never,
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'eq' } },
            { type: 'step', kind: 'line', to: { id: 'b' } },
          ],
        } as never,
      ]),
      { lowerTex: fakeLowerTex },
    );
    const line = flattenPrims(out.primitives).find(
      (prim): prim is PathPrim => prim.type === 'path' && prim.fillRule !== 'evenodd' && prim.commands.length >= 2,
    );
    expect(line).toBeDefined();
  });

  it('compiles the same tex scene deterministically', () => {
    const a = compileTex({ tex: { tex: 'abc' } });
    const b = compileTex({ tex: { tex: 'abc' } });
    expect(findGlyphPath(a.primitives)?.commands.length).toBe(
      findGlyphPath(b.primitives)?.commands.length,
    );
  });
});
