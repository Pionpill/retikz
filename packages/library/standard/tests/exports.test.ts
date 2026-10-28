import { describe, expect, it } from 'vitest';

import * as standardExports from '../src';
import { RetikzStandardError } from '../src';
import * as collectionExports from '../src/collection';
import * as presentationExports from '../src/presentation';
import {
  axesDefinition,
  createGrid,
  frameDefinition,
  gridDefinition,
  LegendArtifactSchema,
  legendDefinition,
  LegendSchema,
} from '../src/presentation';

describe('@retikz/standard 系列出口', () => {
  it('公开其家族条目中的演示复合组件', () => {
    expect(axesDefinition).toBe(presentationExports.axesDefinition);
    expect(frameDefinition).toBe(presentationExports.frameDefinition);
    expect(gridDefinition).toBe(presentationExports.gridDefinition);
    expect(legendDefinition).toBe(presentationExports.legendDefinition);
    expect(legendDefinition.schema).toBe(LegendSchema);
    expect(legendDefinition.artifactSchema).toBe(LegendArtifactSchema);
    expect(createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } })).toMatchObject({
      namespace: 'standard',
      type: 'grid',
    });
    expect(collectionExports).not.toHaveProperty('gridDefinition');
    expect(standardExports).toHaveProperty('RetikzStandardError', RetikzStandardError);
    expect(standardExports).not.toHaveProperty('gridDefinition');
  });
});
