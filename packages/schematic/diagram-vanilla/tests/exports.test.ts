import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramVanillaExports from '../src';

describe('@retikz/diagram-vanilla package shell', () => {
  it('declares the Diagram adapter release metadata', () => {
    expect(manifest.name).toBe('@retikz/diagram-vanilla');
    expect(manifest.version).toBe('0.1.0-alpha.1');
    expect(manifest.retikz).toEqual({
      domain: 'schematic',
      releaseGroup: 'diagram',
      layer: 'adapter',
      publishable: true,
    });
  });

  it('keeps the public root empty before authoring design', () => {
    expect(Object.keys(diagramVanillaExports)).toEqual([]);
  });
});
