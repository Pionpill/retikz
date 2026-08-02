import {
  AxesDefinition,
  AxesModule,
  createLegend,
  createStandardBundle,
  FlexLayoutDefinition,
  FlexLayoutModule,
  FrameDefinition,
  FrameModule,
  GridDefinition,
  GridLayoutDefinition,
  GridLayoutModule,
  GridModule,
  LegendArtifactSchema,
  LegendDefinition,
  LegendModule,
  LegendSchema,
  OverlayLayoutDefinition,
  OverlayLayoutModule,
  StandardAllPreset,
  StandardLayoutPreset,
} from '@retikz/standard';
import { describe, expect, it } from 'vitest';

describe('@retikz/standard root exports', () => {
  it('exposes each capability and the preset surface', () => {
    expect(GridModule.composites).toEqual([GridDefinition]);
    expect(AxesModule.composites).toEqual([AxesDefinition]);
    expect(FrameModule.composites).toEqual([FrameDefinition]);
    expect(FlexLayoutModule.composites).toEqual([FlexLayoutDefinition]);
    expect(GridLayoutModule.composites).toEqual([GridLayoutDefinition]);
    expect(OverlayLayoutModule.composites).toEqual([OverlayLayoutDefinition]);
    expect(LegendModule.composites).toEqual([LegendDefinition]);
    expect(LegendDefinition.schema).toBe(LegendSchema);
    expect(LegendDefinition.artifactSchema).toBe(LegendArtifactSchema);
    expect(createLegend({ content: { kind: 'items', items: [] } })).toMatchObject({
      namespace: 'standard',
      type: 'legend',
    });
    expect(createStandardBundle([GridModule]).compile.composites).toEqual([GridDefinition]);
    expect(StandardLayoutPreset.compile.composites).toEqual([
      FlexLayoutDefinition,
      GridLayoutDefinition,
      OverlayLayoutDefinition,
    ]);
    expect(StandardAllPreset.modules).toEqual([
      'standard.grid',
      'standard.axes',
      'standard.frame',
      'standard.flexLayout',
      'standard.gridLayout',
      'standard.overlayLayout',
      'standard.legend',
    ]);
  });
});
