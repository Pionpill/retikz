import type { Scene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { buildSvgDocument, RenderTracePhase, RenderTraceUnit } from '../../../src/svg';
import type { RenderTraceRecord } from '../../../src/trace';

const scene: Scene = {
  layout: { x: 0, y: 0, width: 40, height: 20 },
  primitives: [
    {
      type: 'group',
      children: [
        { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
        { type: 'rect', x: 20, y: 0, width: 10, height: 10 },
      ],
    },
  ],
};

describe('buildSvgDocument 性能跟踪', () => {
  it('每次完整 document build 递归统计 Group 与 child occurrence', () => {
    const records: Array<RenderTraceRecord> = [];
    const trace = { report: (record: RenderTraceRecord) => records.push(record) };

    const document = buildSvgDocument(scene, { idPrefix: 'trace', trace });

    expect(document.tag).toBe('svg');
    expect(records).toEqual([
      {
        phase: RenderTracePhase.Commit,
        unit: RenderTraceUnit.ScenePrimitive,
        outcome: 'full',
        visited: 3,
        reused: 0,
        changed: 3,
      },
    ]);
  });
});
