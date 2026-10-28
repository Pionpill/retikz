import { describe, expect, it } from 'vitest';

import { compileToScene, ThemeMode } from '../../src';
import type { PathPrimitive, RectPrimitive, ScenePrimitive, TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const sceneOf = (children: IRScene['children'], mode: ThemeMode = ThemeMode.Light): IRScene => ({
  version: 1,
  type: 'scene',
  theme: { mode },
  children,
});

const primitivesOf = (scene: IRScene): Array<ScenePrimitive> => flattenPrims(compileToScene(scene).scene.primitives);

const rectOf = (scene: IRScene): RectPrimitive =>
  primitivesOf(scene).find((primitive): primitive is RectPrimitive => primitive.type === 'rect')!;

const pathsOf = (scene: IRScene): Array<PathPrimitive> =>
  primitivesOf(scene).filter((primitive): primitive is PathPrimitive => primitive.type === 'path');

const textsOf = (scene: IRScene): Array<TextPrimitive> =>
  primitivesOf(scene).filter((primitive): primitive is TextPrimitive => primitive.type === 'text');

const textOf = (scene: IRScene, value: string): TextPrimitive =>
  textsOf(scene).find(text => text.lines.some(line => line.text === value))!;

describe('Core 上下文颜色编译', () => {
  it('子级主色不覆盖继承的具体描边，Node 和 Path 的文字使用子级主色', () => {
    const scene = sceneOf([
      {
        type: 'scope',
        defaults: { style: { color: 'red', stroke: 'black' } },
        children: [
          { type: 'node', position: [0, 0], text: 'node', style: { color: 'blue' } },
          {
            type: 'path',
            style: { color: 'blue' },
            label: { text: 'path' },
            children: [
              { type: 'step', kind: 'move', to: [0, 30] },
              { type: 'step', kind: 'line', to: [100, 30] },
            ],
          },
        ],
      },
    ]);
    expect(rectOf(scene).stroke).toBe('black');
    expect(pathsOf(scene)[0].stroke).toBe('black');
    expect(textOf(scene, 'node').fill).toBe('blue');
    expect(textOf(scene, 'path').fill).toBe('blue');
  });

  it.each([
    [ThemeMode.Light, '#d6e0eb', '#5c85ad'],
    [ThemeMode.Dark, '#0a141f', '#29527a'],
  ] as const)('Node 在 %s mode 下把 fill / stroke 数值解析为不透明颜色', (mode, fill, stroke) => {
    const rect = rectOf(
      sceneOf(
        [
          {
            type: 'node',
            position: [0, 0],
            style: { color: '#336699', fill: 0.2, stroke: 0.8, opacity: { fill: 0.4, stroke: 0.6 } },
          },
        ],
        mode,
      ),
    );

    expect(rect.fill).toBe(fill);
    expect(rect.stroke).toBe(stroke);
    expect(rect.fillOpacity).toBe(0.4);
    expect(rect.strokeOpacity).toBe(0.6);
  });

  it('完整级联后使用实例主色解析继承的数值 token', () => {
    const rect = rectOf(
      sceneOf([
        {
          type: 'scope',
          children: [
            {
              type: 'node',
              position: [0, 0],
              style: { color: '#336699' },
            },
          ],

          defaults: {
            style: { color: '#ff0000' },
            node: {
              style: { fill: 0.2, stroke: 0.8 },
            },
          },
        },
      ]),
    );

    expect(rect.fill).toBe('#d6e0eb');
    expect(rect.stroke).toBe('#5c85ad');
  });

  it('先解析 numeric fill，再执行 Node auto-contrast', () => {
    const scene = sceneOf([
      {
        type: 'node',
        position: [0, 0],
        text: 'body',
        style: { color: '#336699', fill: 0.2, textColor: 'contrast' },
      },
    ]);

    expect(rectOf(scene).fill).toBe('#d6e0eb');
    expect(textOf(scene, 'body').fill).toBe('#000000');
  });

  it('按 Node text -> line 与 label text -> run / pin 主色链依次解析', () => {
    const scene = sceneOf([
      {
        type: 'node',
        position: [0, 0],
        text: [{ text: 'line', fill: 0.5 }],
        label: {
          text: [{ segments: [{ text: 'label-run', fill: 0.5 }] }],
          textColor: 0.4,
          pin: { stroke: 0.25 },
        },
        style: { color: '#336699', textColor: 0.8 },
      },
    ]);

    expect(textOf(scene, 'line').fill).toBe('#5c85ad');
    expect(textOf(scene, 'line').lines[0]?.fill).toBe('#aec2d6');
    expect(textOf(scene, 'label-run').fill).toBe('#d6e1eb');
    expect(pathsOf(scene).find(path => path.commands.length === 2)?.stroke).toBe('#ebf0f5');
  });

  it('Path、geometry label 与 arrow 使用各自确定的主色链', () => {
    const scene = sceneOf([
      {
        type: 'path',
        arrow: { end: { shape: 'normal', color: 0.8, fill: 0.25 } },
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'line',
            to: [80, 0],
            label: { text: 'edge', textColor: 0.6 },
          },
        ],
        style: { color: '#336699', fill: 0.4, stroke: 0.2 },
      },
    ]);
    const path = pathsOf(scene).find(primitive => primitive.arrowEnd !== undefined)!;

    expect(path.fill).toBe('#adc2d6');
    expect(path.stroke).toBe('#d6e0eb');
    expect(textOf(scene, 'edge').fill).toBe('#85a3c2');
    expect(path.arrowEnd?.marker[0]).toMatchObject({ fill: '#ccd9e6' });
  });

  it('延迟 Path 捕获其所在 nested Theme mode，且 Scene 颜色槽位不残留 number', () => {
    const compiled = compileToScene(
      sceneOf([
        {
          type: 'scope',
          theme: { mode: ThemeMode.Dark },
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [40, 0] },
              ],
              style: { color: '#336699', stroke: 0.2 },
            },
          ],
        },
      ]),
    ).scene;
    const path = flattenPrims(compiled.primitives).find(
      (primitive): primitive is PathPrimitive => primitive.type === 'path',
    )!;

    expect(path.stroke).toBe('#0a141f');

    const contextualKeys = new Set(['color', 'fill', 'stroke', 'textColor']);

    const visit = (value: unknown, key?: string): void => {
      if (key !== undefined && contextualKeys.has(key)) expect(typeof value).not.toBe('number');
      if (Array.isArray(value)) value.forEach(item => visit(item));
      else if (value !== null && typeof value === 'object') {
        Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
      }
    };

    visit(compiled);
  });
});
