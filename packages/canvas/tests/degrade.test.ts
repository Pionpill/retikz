import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Scene } from '@retikz/core';
import { drawScene } from '../src';

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
            type: 'image',
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

  it('no-svg-roundtrip/core-only-dep：canvas 包只依赖 core，源码不得导入 svg 或走 SVG 字符串中转', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies).toEqual({ '@retikz/core': 'workspace:*' });

    const source = collectFiles('src')
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
      .map(file => readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toContain('@retikz/svg');
    expect(source).not.toContain('buildSvgDocument');
    expect(source).not.toContain('renderToSvgString');
    expect(source).not.toContain('<svg');
  });
});
