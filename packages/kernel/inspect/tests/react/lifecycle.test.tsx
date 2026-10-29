// @vitest-environment jsdom
import type { CompileResult } from '@retikz/core';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  PATH_INSPECTOR_KEY,
} from '../../src';
import type { InspectionRequest } from '../../src';
import { InspectionOverlay } from '../../src/react';

vi.mock('@retikz/render/canvas', () => ({
  renderFrameToCanvas: (canvas: HTMLCanvasElement) => {
    canvas.width = 24;
  },
}));

const result: CompileResult = {
  scene: {
    layout: { x: 0, y: 0, width: 40, height: 40 },
    primitives: [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'quad', control: [10, 20], to: [30, 0] },
        ],
      },
    ],
  },
  artifacts: [],
};
const options = {
  registry: createDefaultInspectorRegistry(),
  requests: [{ inspector: PATH_INSPECTOR_KEY }],
  idPrefix: 'lifecycle',
};

describe('React 独立呈现生命周期', () => {
  it('新主图先提交，检查回调执行时旧辅助层已经撤下', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    flushSync(() =>
      root.render(
        <>
          <span data-primary="true">before</span>
          <InspectionOverlay result={result} options={options} />
        </>,
      ),
    );
    expect(container.querySelector('svg')).not.toBeNull();
    let observed: { text: string | null | undefined; overlay: Element | null } | undefined;
    const definition = defineInspector({
      namespace: 'test',
      type: 'order',
      subject: { kind: 'primitive', type: 'path' },
      inspect: () => {
        observed = {
          text: container.querySelector('[data-primary]')?.textContent,
          overlay: container.querySelector('svg'),
        };
        return [];
      },
    });
    flushSync(() =>
      root.render(
        <>
          <span data-primary="true">after</span>
          <InspectionOverlay
            result={result}
            options={{
              ...options,
              registry: createInspectorRegistry([definition]),
              requests: [{ inspector: definition }],
            }}
          />
        </>,
      ),
    );
    expect(observed).toEqual({ text: 'after', overlay: null });
    flushSync(() => root.unmount());
  });
  it.each(['svg', 'canvas'] as const)('%s 更新失败及关闭时清空辅助图，通知异常不影响主图', renderer => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const report = vi.fn(() => {
      throw new Error('notification failure');
    });
    const render = (requests: ReadonlyArray<InspectionRequest>) =>
      flushSync(() =>
        root.render(
          <>
            <span data-primary="true">primary</span>
            <InspectionOverlay
              result={result}
              options={{ ...options, requests }}
              renderer={renderer}
              onError={report}
            />
          </>,
        ),
      );
    render(options.requests);
    const primary = container.querySelector('[data-primary]');
    if (renderer === 'svg') expect(container.querySelector('svg')).not.toBeNull();
    else expect(container.querySelector('canvas')?.width).toBe(24);
    render([{ inspector: { namespace: 'missing', type: 'missing' } }]);
    expect(report).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-primary]')).toBe(primary);
    expect(container.querySelector('svg')).toBeNull();
    if (renderer === 'canvas') expect(container.querySelector('canvas')?.width).toBe(0);
    render(options.requests);
    render([]);
    expect(container.querySelector('svg')).toBeNull();
    const canvas = container.querySelector('canvas');
    if (canvas) expect(canvas.width).toBe(0);
    flushSync(() => root.unmount());
    expect(container.children).toHaveLength(0);
  });
});
