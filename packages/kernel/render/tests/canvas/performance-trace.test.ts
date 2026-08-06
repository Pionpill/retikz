import type { Scene } from '@retikz/core';
import type { PerformanceTraceRecord } from '@retikz/runtime';

import {
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';

import { drawScene } from '../../src/canvas';
import { createSpyCanvasContext } from './draw-scene/helpers';

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

describe('drawScene performance trace', () => {
  it('每次完整 Canvas draw 递归统计 Group 与 child occurrence', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = createRuntimeTraceReporter({
      owner: '@retikz/render:canvas',
      phases: [
        {
          phase: PerformanceTracePhase.Commit,
          unit: PerformanceTraceUnit.ScenePrimitive,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      sink: record => records.push(record),
    });

    drawScene(createSpyCanvasContext() as unknown as CanvasRenderingContext2D, scene, { trace });

    expect(records).toEqual([
      {
        owner: '@retikz/render:canvas',
        phase: PerformanceTracePhase.Commit,
        unit: PerformanceTraceUnit.ScenePrimitive,
        outcome: PerformanceTraceOutcome.Full,
        visited: 3,
        reused: 0,
        changed: 3,
      },
    ]);
  });
});
