import {
  AxesDefinition,
  AxesModule,
  createStandardBundle,
  FrameDefinition,
  FrameModule,
  GridDefinition,
  GridModule,
  StandardAllPreset,
} from '@retikz/standard';
import { describe, expect, it } from 'vitest';

describe('@retikz/standard root exports', () => {
  it('exposes each capability and the preset surface', () => {
    expect(GridModule.composites).toEqual([GridDefinition]);
    expect(AxesModule.composites).toEqual([AxesDefinition]);
    expect(FrameModule.composites).toEqual([FrameDefinition]);
    expect(createStandardBundle([GridModule]).compile.composites).toEqual([GridDefinition]);
    expect(StandardAllPreset.modules).toEqual(['standard.grid', 'standard.axes', 'standard.frame']);
  });
});
