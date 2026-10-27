import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import { BuiltinCompileWarningCode } from '../../src/compile/constants';
import type { TexLowerer } from '../../src/compile/text';
import type { CompileWarning } from '../../src/compile/warning';
import type { PathPrimitive, ScenePrimitive, TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const lowerTexCalls: Array<{ tex: string; displayMode?: boolean }> = [];

const fakeLowerTex: TexLowerer = (content, style) => {
  lowerTexCalls.push({ tex: content.tex, displayMode: content.displayMode });
  if (content.tex === 'INVALID') return null;

  const width = Math.max(content.tex.length, 1) * style.fontSize * 0.5;
  const height = style.fontSize * (content.displayMode ? 2 : 1);

  return {
    paths: [
      {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [width, 0] },
          { kind: 'line', to: [width, height] },
          { kind: 'close' },
        ],
        fill: { kind: 'currentColor' },
        stroke: { kind: 'none' },
      },
    ],
    width,
    height,
    depth: style.fontSize * 0.2,
  };
};

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const compile = (
  children: IRScene['children'],
  withTex = true,
): { primitives: Array<ScenePrimitive>; warnings: Array<CompileWarning>; width: number } => {
  const warnings: Array<CompileWarning> = [];
  lowerTexCalls.length = 0;
  const out = compileToScene(scene(children), {
    onWarn: w => warnings.push(w),
    ...(withTex ? { lowerTex: fakeLowerTex } : {}),
  }).scene;

  return { primitives: out.primitives, warnings, width: out.layout.width };
};

const glyphPaths = (prims: Array<ScenePrimitive>): Array<PathPrimitive> =>
  flattenPrims(prims).filter((p): p is PathPrimitive => p.type === 'path' && p.fillRule === 'evenodd');

const textPrims = (prims: Array<ScenePrimitive>): Array<TextPrimitive> =>
  flattenPrims(prims).filter((p): p is TextPrimitive => p.type === 'text');

describe('[inline-tex]节点文本', () => {
  it('将 `$$...$$` 节点渲染为字形块（无纯文本 prim）', () => {
    const { primitives } = compile([{ type: 'node', id: 'a', position: [0, 0], text: '$$ab$$' } as never]);

    expect(glyphPaths(primitives).length).toBe(1);
    expect(textPrims(primitives).length).toBe(0);
  });

  it('将多行 `$$...$$` 内容作为一个独立行公式片段交给 lowerTex', () => {
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

  it('根据字形包围盒调整独立行公式节点的大小（更宽的 tex → 更宽的节点）', () => {
    const narrow = compile([{ type: 'node', id: 'a', position: [0, 0], text: '$$ab$$' } as never]).width;
    const wide = compile([{ type: 'node', id: 'a', position: [0, 0], text: '$$abcdefgh$$' } as never]).width;

    expect(wide).toBeGreaterThan(narrow);
  });

  it('将文本和行内公式混合在一行上', () => {
    const { primitives } = compile([{ type: 'node', id: 'a', position: [0, 0], text: 'a $x$ b' } as never]);

    expect(glyphPaths(primitives).length).toBe(1);
    expect(textPrims(primitives).map(t => t.lines[0].text)).toEqual(['a ', ' b']);
  });

  it('当没有注入 lowerTex 时，按字面意思渲染 `$...$`（关闭）', () => {
    const { primitives, warnings } = compile(
      [{ type: 'node', id: 'a', position: [0, 0], text: 'a $x$ b' } as never],
      false,
    );

    expect(glyphPaths(primitives).length).toBe(0);
    expect(textPrims(primitives)[0].lines[0].text).toBe('a $x$ b');
    expect(warnings.length).toBe(0);
  });

  it('当没有注入 lowerTex 时，按字面意思渲染多行 `$$...$$`', () => {
    const text = String.raw`$$\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b
\end{array}$$`;
    const { primitives, warnings } = compile([{ type: 'node', id: 'a', position: [0, 0], text } as never], false);

    expect(glyphPaths(primitives).length).toBe(0);
    expect(textPrims(primitives)[0].lines.map(line => line.text)).toEqual(text.split('\n'));
    expect(warnings.length).toBe(0);
  });

  it('对不平衡的 `$` 发出警告，但保留文本', () => {
    const { warnings } = compile([{ type: 'node', id: 'a', position: [0, 0], text: 'a $x' } as never]);

    expect(warnings.some(w => w.code === BuiltinCompileWarningCode.TextTexParseError)).toBe(true);
  });

  it('对无效 TeX 片段发出警告并跳过，同时保留该行其余内容', () => {
    const { primitives, warnings } = compile([
      { type: 'node', id: 'a', position: [0, 0], text: 'ok $INVALID$ done' } as never,
    ]);

    expect(warnings.some(w => w.code === BuiltinCompileWarningCode.TexInvalid)).toBe(true);
    expect(glyphPaths(primitives).length).toBe(0);
    expect(textPrims(primitives).length).toBeGreaterThan(0);
  });

  it('支持带有每段填充的显式段', () => {
    const { primitives } = compile([
      {
        type: 'node',
        id: 'a',
        position: [0, 0],
        text: [{ segments: [{ text: 'E=' }, { tex: 'mc^2', fill: '#ff0000' }] }],
      } as never,
    ]);
    const glyphs = glyphPaths(primitives);

    expect(glyphs.length).toBe(1);
    expect(glyphs[0].fill).toBe('#ff0000');
    expect(textPrims(primitives).map(t => t.lines[0].text)).toEqual(['E=']);
  });
});

describe('[inline-tex] 标签', () => {
  it('在边缘标签中渲染行内公式', () => {
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

  it('在节点标签中呈现行内公式', () => {
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
