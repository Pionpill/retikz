import { describe, expect, it } from 'vitest';

import * as standardExports from '../src';
import { RetikzStandardError } from '../src';
import * as containerExports from '../src/container';
import * as presentationExports from '../src/presentation';
import {
  AxesDefinition,
  createGrid,
  FrameDefinition,
  GridDefinition,
  LegendArtifactSchema,
  LegendDefinition,
  LegendSchema,
} from '../src/presentation';

describe('@retikz/standard family exports', () => {
  it('exposes presentation composites from their family entry', () => {
    expect(AxesDefinition).toBe(presentationExports.AxesDefinition);
    expect(FrameDefinition).toBe(presentationExports.FrameDefinition);
    expect(GridDefinition).toBe(presentationExports.GridDefinition);
    expect(LegendDefinition).toBe(presentationExports.LegendDefinition);
    expect(LegendDefinition.schema).toBe(LegendSchema);
    expect(LegendDefinition.artifactSchema).toBe(LegendArtifactSchema);
    expect(createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } })).toMatchObject({
      namespace: 'standard',
      type: 'grid',
    });
    expect(containerExports).not.toHaveProperty('GridDefinition');
    expect(standardExports).toHaveProperty('RetikzStandardError', RetikzStandardError);
    expect(standardExports).not.toHaveProperty('GridDefinition');
  });
});
