import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  AxesDefinition,
  AxesModule,
  createGrid,
  FlexLayoutDefinition,
  FlexLayoutModule,
  FrameDefinition,
  FrameModule,
  GridDefinition,
  GridLayoutDefinition,
  GridLayoutModule,
  GridModule,
  LegendDefinition,
  LegendModule,
  OverlayLayoutDefinition,
  OverlayLayoutModule,
  StandardAllPreset,
} from '../../src';

describe('StandardAllPreset', () => {
  it('contains the current Standard catalog once in stable order', () => {
    expect(StandardAllPreset.modules).toEqual([
      'standard.grid',
      'standard.axes',
      'standard.frame',
      'standard.flexLayout',
      'standard.gridLayout',
      'standard.overlayLayout',
      'standard.legend',
    ]);
    expect(StandardAllPreset.compile.composites).toEqual([
      GridDefinition,
      AxesDefinition,
      FrameDefinition,
      FlexLayoutDefinition,
      GridLayoutDefinition,
      OverlayLayoutDefinition,
      LegendDefinition,
    ]);
    expect(StandardAllPreset.compile.composites).toEqual([
      GridModule.composites[0],
      AxesModule.composites[0],
      FrameModule.composites[0],
      FlexLayoutModule.composites[0],
      GridLayoutModule.composites[0],
      OverlayLayoutModule.composites[0],
      LegendModule.composites[0],
    ]);
    expect(Object.isFrozen(StandardAllPreset)).toBe(true);
  });

  it('does not globally register capabilities when it is imported', () => {
    const warningCodes: Array<string> = [];
    expect(StandardAllPreset.compile.composites).toHaveLength(7);

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
