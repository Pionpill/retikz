import { describe, expect, it } from 'vitest';

import * as standardExports from '../src';
import {
  AxesDefinition,
  createGrid,
  FlexLayoutDefinition,
  FrameDefinition,
  GridDefinition,
  GridLayoutDefinition,
  LegendArtifactSchema,
  LegendDefinition,
  LegendSchema,
  OverlayLayoutDefinition,
  STANDARD_NAMESPACE,
} from '../src';

describe('@retikz/standard root exports', () => {
  it('exposes composite definitions and factories', () => {
    expect(AxesDefinition).toBe(standardExports.AxesDefinition);
    expect(FlexLayoutDefinition).toBe(standardExports.FlexLayoutDefinition);
    expect(FrameDefinition).toBe(standardExports.FrameDefinition);
    expect(GridDefinition).toBe(standardExports.GridDefinition);
    expect(GridLayoutDefinition).toBe(standardExports.GridLayoutDefinition);
    expect(LegendDefinition).toBe(standardExports.LegendDefinition);
    expect(OverlayLayoutDefinition).toBe(standardExports.OverlayLayoutDefinition);
    expect(STANDARD_NAMESPACE).toBe(standardExports.STANDARD_NAMESPACE);
    expect(LegendDefinition.schema).toBe(LegendSchema);
    expect(LegendDefinition.artifactSchema).toBe(LegendArtifactSchema);
    expect(createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } })).toMatchObject({
      namespace: 'standard',
      type: 'grid',
    });
  });

  it('does not expose the removed Standard composition API', () => {
    for (const name of [
      'StandardCapabilityModule',
      'StandardBundle',
      'createStandardBundle',
      'GridModule',
      'AxesModule',
      'FrameModule',
      'LegendModule',
      'FlexLayoutModule',
      'GridLayoutModule',
      'OverlayLayoutModule',
      'StandardAllPreset',
      'StandardLayoutPreset',
      'LogicFrameDefinition',
      'createLogicFrame',
      'LogicFrameSchema',
      'TerminalSchema',
      'StageSchema',
      'DecisionSchema',
      'JunctionSchema',
      'ConnectorDefinition',
      'CalloutDefinition',
    ]) {
      expect(standardExports).not.toHaveProperty(name);
    }
  });

  it('keeps composite compiler helpers package-private', () => {
    expect(standardExports).not.toHaveProperty('compileFlexLayout');
    expect(standardExports).not.toHaveProperty('compileLogicFrame');
    expect(standardExports).not.toHaveProperty('compileTerminal');
    expect(standardExports).not.toHaveProperty('compileStage');
    expect(standardExports).not.toHaveProperty('compileDecision');
    expect(standardExports).not.toHaveProperty('compileJunction');
  });
});
