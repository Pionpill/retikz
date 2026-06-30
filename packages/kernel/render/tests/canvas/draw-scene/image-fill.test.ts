import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext } from './helpers';

describe('drawScene 图片填充', () => {
  const imageScene = (fit?: 'fill' | 'contain' | 'cover'): Scene => ({
    layout: { x: 0, y: 0, width: 200, height: 200 },
    resources: [{ kind: 'paint', id: 'img', spec: { kind: 'image', href: 'pic.png', ...(fit ? { fit } : {}) } }],
    primitives: [{ type: 'rect', x: 0, y: 0, width: 200, height: 200, fill: { kind: 'resourceRef', id: 'img' } }],
  });
  const mockImage = { width: 100, height: 50 } as unknown as CanvasImageSource;

  it('image-cover：默认 cover 等比放大覆盖 bbox、clip 到形状、居中', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene(), {
      getImage: () => mockImage,
      warnUnsupported: w => warnings.push(w.feature),
    });

    // cover：scale=max(200/100,200/50)=4 → 400×200，居中到 bbox(200×200) → dx=-100, dy=0
    expect(context.calls.some(c => c.name === 'clip')).toBe(true);
    expect(context.calls.find(c => c.name === 'drawImage')?.args).toEqual([mockImage, -100, 0, 400, 200]);
    expect(warnings).not.toContain('paint');
  });

  it('image-contain：contain 等比缩放装入 bbox、居中', () => {
    const context = createSpyCanvasContext();

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene('contain'), { getImage: () => mockImage });

    // contain：scale=min(2,4)=2 → 200×100，居中 → dx=0, dy=50
    expect(context.calls.find(c => c.name === 'drawImage')?.args).toEqual([mockImage, 0, 50, 200, 100]);
  });

  it('image-fill：fill 拉伸铺满 bbox', () => {
    const context = createSpyCanvasContext();

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene('fill'), { getImage: () => mockImage });

    expect(context.calls.find(c => c.name === 'drawImage')?.args).toEqual([mockImage, 0, 0, 200, 200]);
  });

  it('image-loading：getImage 返回 null（未就绪）→ 本帧不画、不告警', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene(), {
      getImage: () => null,
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'drawImage')).toBe(false);
    expect(warnings).not.toContain('paint');
  });

  it('image-no-loader：未提供 getImage → 降级告警 paint', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];

    drawScene(context as unknown as CanvasRenderingContext2D, imageScene(), {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(context.calls.some(c => c.name === 'drawImage')).toBe(false);
    expect(warnings).toContain('paint');
  });
});
