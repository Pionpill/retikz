import { describe, expect, it } from 'vitest';

import * as standardExports from '../src';
import {
  AxesDefinition,
  createGrid,
  FrameDefinition,
  GridDefinition,
  LegendArtifactSchema,
  LegendDefinition,
  LegendSchema,
  STANDARD_NAMESPACE,
} from '../src';

describe('@retikz/standard root exports', () => {
  it('exposes composite definitions and factories', () => {
    expect(AxesDefinition).toBe(standardExports.AxesDefinition);
    expect(FrameDefinition).toBe(standardExports.FrameDefinition);
    expect(GridDefinition).toBe(standardExports.GridDefinition);
    expect(LegendDefinition).toBe(standardExports.LegendDefinition);
    expect(STANDARD_NAMESPACE).toBe(standardExports.STANDARD_NAMESPACE);
    expect(LegendDefinition.schema).toBe(LegendSchema);
    expect(LegendDefinition.artifactSchema).toBe(LegendArtifactSchema);
    expect(createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } })).toMatchObject({
      namespace: 'standard',
      type: 'grid',
    });
  });
});
