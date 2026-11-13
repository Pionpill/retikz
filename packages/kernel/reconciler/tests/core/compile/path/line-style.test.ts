import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../../../core/src/schemas';
import { compileTestResult } from '../../../helpers/compilation';
import { findPathPrim } from './helpers';

describe('lineCap / lineJoin', () => {
  it('lineCap 透传到 PathPrimitive.lineCap', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          style: { lineCap: 'round' },
        },
      ],
    };

    expect(findPathPrim(compileTestResult(ir).scene.primitives).lineCap).toBe('round');
  });

  it('lineJoin 透传到 PathPrimitive.lineJoin', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
          style: { lineJoin: 'bevel' },
        },
      ],
    };

    expect(findPathPrim(compileTestResult(ir).scene.primitives).lineJoin).toBe('bevel');
  });

  it('未指定时 PathPrimitive 字段为 undefined（不写 SVG 默认值）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const p = findPathPrim(compileTestResult(ir).scene.primitives);

    expect(p.lineCap).toBeUndefined();
    expect(p.lineJoin).toBeUndefined();
  });
});
