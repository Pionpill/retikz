// @vitest-environment jsdom
import type { Scene, ScenePrimitive } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import { bindWaapiDescriptors } from '../../src/animation';
import { renderToSvgString } from '../../src/svg';

describe('资源中的基础图元', () => {
  it('带箭头的路径绘制动画只在宿主容器应用一次透明度', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      resources: [],
      primitives: [
        {
          type: 'path',
          id: 'host',
          opacity: 0.5,
          stroke: 'black',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [30, 0] },
          ],
          animations: [
            {
              property: 'pathDraw',
              duration: 100,
              keyframes: [
                { at: 0, value: 0 },
                { at: 1, value: 1 },
              ],
            },
          ],
          arrowEnd: {
            shape: 'test',
            baseSize: 10,
            refX: 10,
            markerWidth: 10,
            markerHeight: 10,
            marker: [{ type: 'rect', x: 0, y: 0, width: 5, height: 5, fill: 'black' }],
          },
        },
      ],
    };
    const root = document.createElement('div');
    root.innerHTML = renderToSvgString(scene, { idPrefix: 'path-opacity' });
    expect(root.querySelectorAll('[data-retikz-id="host"]')).toHaveLength(1);
    expect(root.querySelector('[data-retikz-id="host"]')?.getAttribute('opacity')).toBe('0.5');
    expect(root.querySelector('path')?.hasAttribute('opacity')).toBe(false);
    expect(root.querySelector('path')?.getAttribute('pathLength')).toBe('1');
  });

  it('箭头内的裁剪引用使用同一场景前缀并保留文本', () => {
    const content: ScenePrimitive = {
      type: 'group',
      clipRef: 'window',
      children: [
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'A' }],
          fontSize: 8,
          lineHeight: 8,
          measuredWidth: 5,
          measuredHeight: 8,
          align: 'start',
          baseline: 'top',
          fill: 'red',
        },
      ],
    };
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'path',
          id: 'host',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [30, 0] },
          ],
          stroke: 'black',
          arrowEnd: { shape: 'test', baseSize: 10, refX: 10, markerWidth: 10, markerHeight: 10, marker: [content] },
        },
      ],
      resources: [
        {
          kind: 'clip',
          id: 'window',
          path: {
            fillRule: 'nonzero',
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [10, 0] },
              { kind: 'line', to: [10, 10] },
              { kind: 'close' },
            ],
          },
        },
      ],
    };
    const svg = renderToSvgString(scene, { idPrefix: 'resource-test' });
    expect(svg).toContain('clip-path="url(#retikz-clip-resource-test-window)"');
    expect(svg).toContain('>A</tspan>');
  });
});

it('隔离 Pattern 播放所属模块并将本地 ID 保留在 DOM 宿主索引之外', () => {
  const scene: Scene = {
    layout: { x: 0, y: 0, width: 100, height: 100 },
    primitives: ['A', 'B'].map(id => ({
      type: 'rect',
      id,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: { kind: 'resourceRef', id: 'tile' },
    })),
    resources: [
      {
        kind: 'paint',
        id: 'tile',
        spec: { kind: 'pattern', shape: 'dots' },
        tile: {
          size: 10,
          motif: [
            {
              type: 'rect',
              id: 'local',
              x: 0,
              y: 0,
              width: 2,
              height: 2,
              fill: 'red',
              animations: [
                {
                  property: 'opacity',
                  duration: 100,
                  trigger: { onEvent: 'click' },
                  keyframes: [
                    { at: 0, value: 0 },
                    { at: 1, value: 1 },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  };
  const svg = renderToSvgString(scene, { idPrefix: 'owners' });
  expect(svg).toContain('id="retikz-paint-owners-tile-host-A"');
  expect(svg).toContain('id="retikz-paint-owners-tile-host-B"');
  expect(svg).toContain('data-retikz-animation-owner="A"');
  expect(svg).toContain('data-retikz-animation-owner="B"');
  expect(svg).not.toContain('data-retikz-id="local"');
  expect(renderToSvgString(scene, { idPrefix: 'owners', animate: false })).not.toContain('data-retikz-anim=');
});

it('单击一台宿主仅重新启动其图案动画', () => {
  const scene: Scene = {
    layout: { x: 0, y: 0, width: 100, height: 100 },
    primitives: ['A', 'B'].map(id => ({
      type: 'rect',
      id,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: { kind: 'resourceRef', id: 'tile' },
    })),
    resources: [
      {
        kind: 'paint',
        id: 'tile',
        spec: { kind: 'pattern', shape: 'dots' },
        tile: {
          size: 10,
          motif: [
            {
              type: 'rect',
              id: 'local',
              x: 0,
              y: 0,
              width: 2,
              height: 2,
              fill: 'red',
              animations: [
                {
                  property: 'opacity',
                  duration: 100,
                  trigger: { onEvent: 'click' },
                  keyframes: [
                    { at: 0, value: 0 },
                    { at: 1, value: 1 },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  };
  const container = document.createElement('div');
  container.innerHTML = renderToSvgString(scene, { idPrefix: 'events' });
  const elements = Array.from(container.querySelectorAll('[data-retikz-anim]'));
  const animations = elements.map(() => ({ cancel: vi.fn(), play: vi.fn(), pause: vi.fn(), currentTime: 0 }));
  const starts = elements.map((element, index) => {
    const animate = vi.fn(() => animations[index]);
    Object.defineProperty(element, 'animate', { value: animate });
    return animate;
  });
  const controls = bindWaapiDescriptors(container);
  container.querySelector('[data-retikz-id="A"]')!.dispatchEvent(new Event('click'));
  expect(starts.map(start => start.mock.calls.length)).toEqual([1, 0]);
  container.querySelector('[data-retikz-id="A"]')!.dispatchEvent(new Event('click'));
  expect(animations.map(animation => animation.play.mock.calls.length)).toEqual([1, 0]);
  controls.dispose();
});

it('普通标记的动画沿宿主事件上下文绑定且实例隔离', async () => {
  const { compileToScene, defineMark } = await import('@retikz/core');
  const mark = defineMark({
    name: 'animated',
    emit: () => [
      {
        type: 'rect',
        id: 'local',
        x: -3,
        y: -3,
        width: 6,
        height: 6,
        fill: 'red',
        animations: [
          {
            property: 'opacity',
            duration: 100,
            trigger: { onEvent: 'click' },
            keyframes: [
              { at: 0, value: 0 },
              { at: 1, value: 1 },
            ],
          },
        ],
      },
    ],
  });
  const scene = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: ['A', 'B'].map((id, index) => ({
        type: 'path',
        id,
        children: [
          { type: 'step', kind: 'move', to: [0, index * 30] },
          { type: 'step', kind: 'line', to: [100, index * 30] },
        ],
        marks: [{ pos: 0.5, shape: 'animated' }],
      })),
    },
    { marks: [mark] },
  ).scene;
  const svg = renderToSvgString(scene, { idPrefix: 'marks' });
  expect(svg).toContain('data-retikz-animation-owner="A"');
  expect(svg).toContain('data-retikz-animation-owner="B"');
  expect(svg).not.toContain('data-retikz-id="local"');
  const container = document.createElement('div');
  container.innerHTML = svg;
  expect(container.querySelectorAll('[data-retikz-animation-owner="A"]')).toHaveLength(1);
  expect(container.querySelectorAll('[data-retikz-animation-owner="B"]')).toHaveLength(1);
});
