import type { IRNode, IRPath, IRPathLabel, IRScene, IRTextBlock, TextPrimitive } from '@retikz/core';
import { definePath, PathSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { compileToScene } from '../../../src/compile';
import { WeaveManager } from '../../../src/weave';
import { flattenPrims } from '../../helpers/flatten';

const measureText = (text: string) => ({ width: [...text].length * 5, height: 10, ascent: 8, descent: 2 });
const layout = { textAlign: 'end' as const, lineHeight: 20, maxTextWidth: 10 };
const font = { size: 10 };

const primitivesOf = (child: IRScene['children'][number]) =>
  flattenPrims(compileToScene({ type: 'scene', version: 1, children: [child] }, { measureText }).scene.primitives)
    .filter((primitive): primitive is TextPrimitive => primitive.type === 'text')
    .flatMap(primitive =>
      primitive.lines.map((line, index) => ({
        text: line.text,
        x:
          primitive.x -
          (primitive.align === 'start' ? 0 : measureText(line.text).width / (primitive.align === 'end' ? 1 : 2)),
        y: primitive.y + index * primitive.lineHeight,
        fontSize: line.fontSize ?? primitive.fontSize,
        fill: line.fill ?? primitive.fill,
        opacity: (line.opacity ?? 1) * (primitive.opacity ?? 1),
      })),
    );

const pathOf = (label: IRPathLabel): IRPath => ({
  type: 'path',
  label: { ...label, side: 'center', interrupt: false },
  children: [
    { type: 'step', kind: 'move', to: [-100, 0] },
    { type: 'step', kind: 'line', to: [100, 0] },
  ],
});

describe('正文和标签共享文本能力', () => {
  it('路径标签折行与透明度更新后的增量结果等同完整编译', () => {
    const initial = { ...pathOf({ text: 'abcd', font }), id: 'path-text' };
    const input: IRScene = { type: 'scene', version: 1, children: [initial] };
    const manager = new WeaveManager(input, { measureText });
    const mounted = manager.mount();
    const next = { ...pathOf({ text: 'abcdef', font, ...layout, opacity: 0.5 }), id: 'path-text' };
    const update = manager.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'path-text' }, input: next },
      ],
    });
    expect(update.compilation.result).toEqual(compileToScene({ ...input, children: [next] }, { measureText }));
    update.commit();
    update.finish();
  });
  it('Definition 动态宿主与边界标签复用确定态文本和折行', () => {
    const source = { text: 'abcd', font, ...layout, opacity: 0.5 };
    const definition = definePath({
      name: 'shared-labels',
      schema: PathSchema.extend({ kind: literal('shared-labels') }),
      compile: context => {
        const canon = context.resolveHostLabel(source);
        expect(canon.text.lines[0].segments).toMatchObject([{ text: 'abcd' }]);
        expect(canon.text.lineHeight).toBe(20);
        const host = context.emitHostLabels({
          sourcePath: ['label'],
          labels: [canon],
          samples: [{ point: [0, 0], tangent: [1, 0] }],
        });
        const boundary = context.emitBoundaryLabels([
          { label: source, point: [100, 0], outward: [1, 0], sourcePath: ['kindOptions', 'label'] },
        ]);
        return context.wrapOutput({ primitives: [...host, ...boundary], boundsPoints: [] });
      },
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [{ type: 'path', kind: 'shared-labels', style: { opacity: 0.5 } }] },
      { measureText, paths: [definition] },
    );
    const text = flattenPrims(output.scene.primitives).filter(primitive => primitive.type === 'text');
    expect(text.flatMap(primitive => primitive.lines.map(line => line.text))).toEqual(['ab', 'cd', 'ab', 'cd']);
    expect(text.map(primitive => primitive.opacity)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(text[1].y - text[0].y).toBe(20);
    expect(text[3].y - text[2].y).toBe(20);
  });
  it('文本宽度、行高和透明度更新后的增量结果等同完整编译', () => {
    const initial: IRNode = {
      type: 'node',
      id: 'text',
      text: 'abcd',
      label: { text: 'label', ...layout },
      style: { font },
    };
    const input: IRScene = { type: 'scene', version: 1, children: [initial] };
    const manager = new WeaveManager(input, { measureText });
    const mounted = manager.mount();
    for (const width of [10, 30]) {
      const next: IRNode = {
        ...initial,
        text: 'abcdef',
        layout: { ...layout, maxTextWidth: width },
        label: { text: 'label\nnext', ...layout, maxTextWidth: width, opacity: 0.5 },
      };
      const update = manager.update({
        operations: [
          { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'text' }, input: next },
        ],
      });
      expect(update.compilation.result).toEqual(compileToScene({ ...input, children: [next] }, { measureText }));
      update.commit();
      update.finish();
    }
  });
  it.each<IRTextBlock>(['abcd\nx', [{ segments: [{ text: 'abcd\nx' }] }]])(
    '三类宿主使用相同折行、行高和对齐：%j',
    text => {
      const body: IRNode = { type: 'node', text, layout, style: { font } };
      const label = { text, font, ...layout };
      const expected = primitivesOf(body);
      expect(expected.map(line => line.text)).toEqual(['ab', 'cd', 'x']);
      expect(expected.map(line => line.y)).toEqual([-17, 3, 23]);
      expect(primitivesOf({ type: 'node', label: { ...label, position: 'center' } })).toEqual(expected);
      expect(primitivesOf(pathOf(label))).toEqual(expected);
    },
  );

  it.each([0, 0.5])('标签透明度逐层相乘并保留零：%s', opacity => {
    const text: IRTextBlock = [{ opacity: 0.5, segments: [{ text: 'x', opacity: 0.5 }] }];
    const label = { text, opacity, font };
    const node: IRNode = { type: 'node', style: { opacity: 0.5 }, label: { ...label, position: 'center' } };
    const path = { ...pathOf(label), style: { opacity: 0.5 } };
    expect(primitivesOf(node)[0].opacity).toBe(0.5 * opacity * 0.5 * 0.5);
    expect(primitivesOf(path)[0].opacity).toBe(0.5 * opacity * 0.5 * 0.5);
  });
});
