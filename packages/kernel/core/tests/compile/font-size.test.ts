import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import type { ScenePrimitive, TextLine, TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

const collectTexts = (primitives: Array<ScenePrimitive>): Array<TextPrimitive> => {
  const texts: Array<TextPrimitive> = [];

  for (const primitive of primitives) {
    if (primitive.type === 'text') texts.push(primitive);
    if (primitive.type === 'group') texts.push(...collectTexts(primitive.children));
  }

  return texts;
};

const lineText = (line: string | TextLine): string => (typeof line === 'string' ? line : line.text);

const findText = (scene: ReturnType<typeof compileToScene>['scene'], text: string): TextPrimitive => {
  const primitive = collectTexts(scene.primitives).find(candidate =>
    candidate.lines.some(line => lineText(line) === text),
  );

  expect(primitive).toBeDefined();

  return primitive!;
};

describe('编译字体大小预设和相对单位', () => {
  it('使用根字体大小作为默认字体大小', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'default' }],
    };

    expect(findText(compileToScene(ir).scene, 'default').fontSize).toBe(16);
  });

  it('使用默认根字体大小解析网页预设', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: 'web',
          style: { font: { size: 'sm' } },
        },
      ],
    };

    expect(findText(compileToScene(ir).scene, 'web').fontSize).toBe(14);
  });

  it('拒绝核心 schema 中的 TikZ 预设', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: 'web',
          style: { font: { size: 'sm' } },
        },
        {
          type: 'node',
          position: [40, 0],
          text: 'tikz',
          style: { font: { size: 'small' } },
        },
      ],
    };

    expect(() => compileToScene(ir).scene).toThrow();
  });

  it('从 CompileOptions.fontSize 解析 rem', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: 'rem',
          style: { font: { size: '1.25rem' } },
        },
      ],
    };

    expect(findText(compileToScene(ir, { fontSize: 20 }).scene, 'rem').fontSize).toBe(25);
  });

  it('解析路径标签预设', () => {
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

  it('从节点字体大小解析行 em', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: [{ text: 'line', font: { size: '0.5em' } }],
          style: { font: { size: 'lg' } },
        },
      ],
    };

    const text = findText(compileToScene(ir).scene, 'line');

    expect(text.lines[0].fontSize).toBe(9);
  });

  it('解析预设后应用现有节点比例', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: 'scaled',
          scale: 2,
          style: { font: { size: 'lg' } },
        },
      ],
    };

    expect(findText(compileToScene(ir).scene, 'scaled').fontSize).toBe(36);
  });

  it('将解析的字体大小传递给 lowerTex', () => {
    const calls: Array<number> = [];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          text: [{ segments: [{ tex: 'x' }] }],
          style: { font: { size: 'sm' } },
        },
      ],
    };

    compileToScene(ir, {
      lowerTex: (_content, style) => {
        calls.push(style.fontSize);
        return null;
      },
    });

    expect(calls).toEqual([14]);
  });

  it('拒绝非正根字体大小', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'bad' }],
    };

    expect(() => compileToScene(ir, { fontSize: 0 }).scene).toThrow(/fontSize/);
  });
});
