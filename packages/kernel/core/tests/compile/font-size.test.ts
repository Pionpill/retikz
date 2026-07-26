import { describe, expect, it } from 'vitest';

import type { ScenePrimitive, TextLine, TextPrim } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';

const collectTexts = (primitives: Array<ScenePrimitive>): Array<TextPrim> => {
  const texts: Array<TextPrim> = [];
  for (const primitive of primitives) {
    if (primitive.type === 'text') texts.push(primitive);
    if (primitive.type === 'group') texts.push(...collectTexts(primitive.children));
  }
  return texts;
};

const lineText = (line: string | TextLine): string => (typeof line === 'string' ? line : line.text);

const findText = (scene: ReturnType<typeof compileToScene>['scene'], text: string): TextPrim => {
  const primitive = collectTexts(scene.primitives).find(candidate =>
    candidate.lines.some(line => lineText(line) === text),
  );
  expect(primitive).toBeDefined();
  return primitive!;
};

describe('compile font size presets and relative units', () => {
  it('uses the root font size as the default font size', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'default' }],
    };

    expect(findText(compileToScene(ir).scene, 'default').fontSize).toBe(16);
  });

  it('resolves web presets with the default root font size', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'web', font: { size: 'sm' } }],
    };

    expect(findText(compileToScene(ir).scene, 'web').fontSize).toBe(14);
  });

  it('rejects TikZ presets in core schema', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', position: [0, 0], text: 'web', font: { size: 'sm' } },
        { type: 'node', position: [40, 0], text: 'tikz', font: { size: 'small' } },
      ],
    };
    expect(() => compileToScene(ir).scene).toThrow();
  });

  it('resolves rem from CompileOptions.fontSize', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'rem', font: { size: '1.25rem' } }],
    };

    expect(findText(compileToScene(ir, { fontSize: 20 }).scene, 'rem').fontSize).toBe(25);
  });

  it('resolves path label presets', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [40, 0], label: { text: 'label', font: { size: 'lg' } } },
          ],
        },
      ],
    };

    expect(findText(compileToScene(ir).scene, 'label').fontSize).toBe(18);
  });

  it('resolves line em from the node font size', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: [{ text: 'line', font: { size: '0.5em' } }],
          font: { size: 'lg' },
        },
      ],
    };

    const text = findText(compileToScene(ir).scene, 'line');
    expect(text.lines[0].fontSize).toBe(9);
  });

  it('applies existing node scale after resolving presets', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'scaled', font: { size: 'lg' }, scale: 2 }],
    };

    expect(findText(compileToScene(ir).scene, 'scaled').fontSize).toBe(36);
  });

  it('passes resolved font size to lowerTex', () => {
    const calls: Array<number> = [];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: [{ runs: [{ tex: 'x' }] }], font: { size: 'sm' } }],
    };

    compileToScene(ir, {
      lowerTex: (_content, style) => {
        calls.push(style.fontSize);
        return null;
      },
    });

    expect(calls).toEqual([14]);
  });

  it('rejects non-positive root font size', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'bad' }],
    };

    expect(() => compileToScene(ir, { fontSize: 0 }).scene).toThrow(/fontSize/);
  });
});
