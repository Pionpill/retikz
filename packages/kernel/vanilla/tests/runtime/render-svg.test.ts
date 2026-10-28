import type { BoundaryDefinition, ClipDefinition, IRScene } from '@retikz/core';
import { compileToScene, defineBoundary, defineClip } from '@retikz/core';
import { renderToSvgString as svgRenderToString } from '@retikz/render/svg';
import { describe, expect, it, vi } from 'vitest';
import { literal, number, strictObject } from 'zod';

import { renderToSvgString } from '../../src';

/*
 * @retikz/vanilla renderToSvgString（SSR / 构建期，node 环境，无 DOM）
 */
const nodeIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
};

it('SSR 自定义测量与 SVG 输出共享宿主默认字体', () => {
  const measureText = vi.fn(() => ({ width: 20, height: 16 }));
  const svg = renderToSvgString(nodeIr, { defaultFontFamily: 'serif', compile: { measureText } });
  expect(measureText).toHaveBeenCalledWith('A', expect.objectContaining({ family: 'serif' }));
  expect(svg).toContain('font-family="serif"');
});

it('预编译 Scene 只改变显示字体，不调用测量器或改变几何', () => {
  const scene = compileToScene(nodeIr).scene;
  const snapshot = JSON.stringify(scene);
  const measureText = vi.fn(() => ({ width: 999, height: 16 }));
  expect(renderToSvgString(scene, { defaultFontFamily: 'serif', compile: { measureText } })).toContain(
    'font-family="serif"',
  );
  expect(measureText).not.toHaveBeenCalled();
  expect(JSON.stringify(scene)).toBe(snapshot);
});

const boundaryIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'a',
      position: [0, 0],
      boundary: 'pin',
      layout: { minimumSize: 40 },
    },
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [100, 0] },
        { type: 'step', kind: 'line', to: { id: 'a' } },
      ],
    },
  ],
};

const fixedBoundary = (): BoundaryDefinition =>
  defineBoundary({
    name: 'pin',
    paramsSchema: strictObject({}),
    computeBoundaryPoint: rect => [rect.x + 7, rect.y],
  });

const circleFrameClip = (): ClipDefinition =>
  defineClip({
    kind: 'circleFrame',
    schema: strictObject({
      kind: literal('circleFrame'),
      params: strictObject({
        cx: number(),
        cy: number(),
        outer: number().positive(),
        inner: number().positive(),
      }),
    }),

    lower: spec => {
      const params = {
        cx: spec.params.cx,
        cy: spec.params.cy,
        outer: spec.params.outer,
        inner: spec.params.inner,
      };
      return {
        commands: [
          { kind: 'move', to: [params.cx + params.outer, params.cy] },
          {
            kind: 'arc',
            center: [params.cx, params.cy],
            radius: params.outer,
            startAngle: 0,
            endAngle: 360,
          },
          { kind: 'close' },
          { kind: 'move', to: [params.cx + params.inner, params.cy] },
          {
            kind: 'arc',
            center: [params.cx, params.cy],
            radius: params.inner,
            startAngle: 0,
            endAngle: 360,
          },
          { kind: 'close' },
        ],
        fillRule: 'evenodd',
      };
    },
  });

const clipIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip: { kind: 'circleFrame', params: { cx: 0, cy: 0, outer: 40, inner: 20 } },
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    },
  ],
};

describe('@retikz/vanilla renderToSvgString', () => {
  it('render-string-matches-svg：与 @retikz/render/svg 输出逐字一致（薄包、未另写序列化）', () => {
    const scene = compileToScene(nodeIr).scene;

    // vanilla 缺省 idPrefix='r'，与显式 'r' 的 svg 输出应逐字相同
    expect(renderToSvgString(scene)).toBe(svgRenderToString(scene, { idPrefix: 'r' }));
  });

  it('ir-default-fallback-measurer：ir 入参在 Node 下确定（默认 fallback / 可注入 measureText）', () => {
    const a = renderToSvgString(nodeIr);
    const b = renderToSvgString(nodeIr);

    expect(a).toBe(b); // 同输入逐字一致 → 确定性（fallbackMeasurer）

    // 注入更宽的度量器 → 节点尺寸变 → 输出不同（证明 measureText 真生效、ir contract 完整）
    const wide = renderToSvgString(nodeIr, { compile: { measureText: () => ({ width: 999, height: 40 }) } });

    expect(wide).not.toBe(a);
  });

  it('empty-scene-string：空 scene 产合法 <svg>、不抛', () => {
    const empty = { layout: { x: 0, y: 0, width: 10, height: 10 }, primitives: [] };

    expect(renderToSvgString(empty as never)).toMatch(/^<svg/);
  });

  it('显示尺寸显式覆盖，缺省跟随内容边界', () => {
    const scene = compileToScene(nodeIr).scene;

    // render 侧直接接受 width/height（vanilla 不做正则注入）
    const sized = svgRenderToString(scene, { idPrefix: 'r', width: 200, height: 100 });

    expect(sized.match(/^<svg[^>]*>/)?.[0]).toContain('width="200" height="100"');

    // vanilla 透传到 render，输出与 render 逐字一致
    expect(renderToSvgString(scene, { output: { width: 200, height: 100 } })).toBe(sized);

    const root = renderToSvgString(scene).match(/^<svg[^>]*>/)?.[0];

    expect(root).toContain(`width="${scene.layout.width}"`);
    expect(root).toContain(`height="${scene.layout.height}"`);
  });

  it('将边界提供者传递给编译选项', () => {
    expect(() => renderToSvgString(boundaryIr)).toThrow(/options\.boundaries/i);
    expect(renderToSvgString(boundaryIr, { compile: { boundaries: [fixedBoundary()] } })).toMatch(/^<svg/);
  });

  it('将裁剪提供者传递给编译选项', () => {
    expect(() => renderToSvgString(clipIr)).toThrow(/Unknown provider 'circleFrame'/);

    const svg = renderToSvgString(clipIr, {
      compile: { clips: [circleFrameClip()] },
    });

    expect(svg).toContain('<clipPath');
    expect(svg).toContain('clip-rule="evenodd"');
  });
});
