// @vitest-environment jsdom
import type { CompileResult } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  PATH_INSPECTOR_KEY,
  RetikzInspectError,
} from '../../src';
import {
  mountInspection,
  prepareInspectionPresentation,
  renderInspectionToCanvas,
  renderInspectionToSvgString,
} from '../../src/vanilla';

const result: CompileResult = {
  scene: {
    layout: { x: -20, y: -10, width: 100, height: 70 },
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
  idPrefix: 'aux',
};
describe('独立辅助宿主', () => {
  it('Canvas 呈现失败保留原因并清空辅助画布', () => {
    const canvas = document.createElement('canvas');
    const cause = new Error('canvas unavailable');
    vi.spyOn(canvas, 'getContext').mockImplementation(() => {
      throw cause;
    });
    const output = prepareInspectionPresentation(result, options);
    expect(() => renderInspectionToCanvas(canvas, output, options)).toThrow(RetikzInspectError);
    expect(() => renderInspectionToCanvas(canvas, output, options)).toThrow(expect.objectContaining({ cause }));
    expect(canvas.width).toBe(0);
  });
  it('回调重入后的新结果不会被先前更新覆盖', () => {
    const container = document.createElement('div');
    const view = mountInspection(container);
    const definition = defineInspector({
      namespace: 'test',
      type: 'reentrant',
      subject: { kind: 'primitive', type: 'path' },
      inspect: () => {
        view.update(result, { ...options, requests: [] });
        return [{ coordinateSpace: 'scene', child: { type: 'node', position: [0, 0] } }];
      },
    });
    view.update(result, {
      ...options,
      registry: createInspectorRegistry([definition]),
      requests: [{ inspector: definition }],
    });
    expect(container.querySelector('svg')).toBeNull();
    view.dispose();
  });
  it('SSR 使用主图视口，辅助内容不包含主图身份', () => {
    const output = prepareInspectionPresentation(result, options);
    expect(output.frame?.primary.primitives).toEqual([]);
    expect(output.frame?.primary.layout).toEqual(result.scene.layout);
    expect(renderInspectionToSvgString(output, options)).toContain('viewBox="-20 -10 100 70"');
  });
  it('更新失败移除旧层，保留同容器主图节点，释放后不再更新', () => {
    const container = document.createElement('div');
    const primary = document.createElement('svg');
    container.appendChild(primary);
    const view = mountInspection(container);
    expect(view.update(result, options).error).toBeUndefined();
    expect(container.querySelectorAll('svg')).toHaveLength(2);
    const failed = view.update(result, {
      ...options,
      requests: [{ inspector: { namespace: 'unknown', type: 'missing' } }],
    });
    expect(failed.error).toBeDefined();
    expect(container.children[0]).toBe(primary);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    view.dispose();
    view.update(result, options);
    expect(container.children).toHaveLength(1);
  });
});
