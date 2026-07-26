import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  AxesDefinition,
  AxesModule,
  createGrid,
  FrameDefinition,
  FrameModule,
  GridDefinition,
  GridModule,
  StandardAllPreset,
} from '../../src';

describe('StandardAllPreset', () => {
  it('contains the current Standard catalog once in stable order', () => {
    expect(StandardAllPreset.modules).toEqual(['standard.grid', 'standard.axes', 'standard.frame']);
    expect(StandardAllPreset.compile.composites).toEqual([GridDefinition, AxesDefinition, FrameDefinition]);
    expect(StandardAllPreset.compile.composites).toEqual([
      GridModule.composites[0],
      AxesModule.composites[0],
      FrameModule.composites[0],
    ]);
    expect(Object.isFrozen(StandardAllPreset)).toBe(true);
  });

  it('does not globally register capabilities when it is imported', () => {
    const warningCodes: Array<string> = [];
    expect(StandardAllPreset.compile.composites).toHaveLength(3);

    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createGrid({ bounds: { min: [0, 0], max: [10, 10] }, spacing: 10 })],
      },
      { onWarn: warning => warningCodes.push(warning.code) },
    );

    expect(warningCodes).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
