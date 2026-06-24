import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Scene } from '@retikz/core';
import { drawScene } from '../src/canvas';

type CanvasCall = {
  name: string;
  args: Array<unknown>;
};

type SpyCanvasContext = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'fill' | 'rect' | 'restore' | 'save' | 'setLineDash' | 'stroke'
> & {
  calls: Array<CanvasCall>;
  globalAlpha: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
};

const createSpyCanvasContext = (): SpyCanvasContext => {
  const calls: Array<CanvasCall> = [];
  const record = (name: string) => (...args: Array<unknown>) => {
    calls.push({ name, args });
  };

  return {
    calls,
    fillStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '#000',
    beginPath: record('beginPath'),
    fill: record('fill'),
    rect: record('rect'),
    restore: record('restore'),
    save: record('save'),
    setLineDash: record('setLineDash'),
    stroke: record('stroke'),
  };
};

const collectFiles = (directory: string): Array<string> => {
  const out: Array<string> = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      out.push(...collectFiles(absolute));
    } else {
      out.push(absolute);
    }
  }
  return out;
};

describe('canvas 降级与边界规格', () => {
  it('unsupported-paint-degrades：不支持的 paint resource 必须告警并跳过该 fill，但保留可绘制部分', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const context = createSpyCanvasContext();
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 40, height: 20 },
      resources: [
        {
          kind: 'paint',
          id: 'paint-1',
          spec: {
            kind: 'image',
            href: 'https://example.com/x.png',
          },
        },
      ],
      primitives: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 40,
          height: 20,
          fill: { kind: 'resourceRef', id: 'paint-1' },
          stroke: '#111',
        },
      ],
    };

    expect(() => drawScene(context as unknown as CanvasRenderingContext2D, scene)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/paint|image|skipped/i));
    expect(context.calls.map(call => call.name).filter(name => name !== 'save' && name !== 'restore')).toEqual(['beginPath', 'rect', 'setLineDash', 'stroke']);

    warn.mockRestore();
  });

  it('render 内部边界：canvas 不引用 svg、svg 不引用 canvas（替代原跨包边界）', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    // render 仅依赖 core + csstype（纯类型）；不依赖 react / 任何框架
    expect(packageJson.dependencies).toEqual({ '@retikz/core': 'workspace:*', csstype: 'catalog:' });

    const readSrc = (dir: string): string =>
      collectFiles(dir)
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
        .map(file => readFileSync(file, 'utf8'))
        .join('\n');

    // canvas 后端不得导入 svg、不走 SVG 字符串中转（ADR-02 并列 renderer、不走 SVG 中转）
    const canvasSrc = readSrc('src/canvas');
    expect(canvasSrc).not.toContain('render/svg');
    expect(canvasSrc).not.toContain('../svg');
    expect(canvasSrc).not.toContain('buildSvgDocument');
    expect(canvasSrc).not.toContain('renderToSvgString');
    expect(canvasSrc).not.toContain('<svg');

    // svg 后端不得反向依赖 canvas
    const svgSrc = readSrc('src/svg');
    expect(svgSrc).not.toContain('render/canvas');
    expect(svgSrc).not.toContain('../canvas');
    expect(svgSrc).not.toContain('drawScene');
    expect(svgSrc).not.toContain('renderToCanvas');
  });
});
