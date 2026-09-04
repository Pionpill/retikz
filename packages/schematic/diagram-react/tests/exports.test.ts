import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramReactExports from '../src';

describe('@retikz/diagram-react package shell', () => {
  it('declares the Diagram adapter release metadata', () => {
    expect(manifest.name).toBe('@retikz/diagram-react');
    expect(manifest.version).toBe('0.1.0-alpha.1');
    expect(manifest.retikz).toEqual({
      domain: 'schematic',
      releaseGroup: 'diagram',
      layer: 'adapter',
      publishable: true,
    });
  });

  it('keeps the public root empty before authoring design', () => {
    expect(Object.keys(diagramReactExports)).toEqual([]);
  });

  it('publishes Flow authoring only from the explicit symmetric subpath', () => {
    expect(manifest.exports).toHaveProperty('./flow');
    expect(manifest.publishConfig.exports).toHaveProperty('./flow');
  });
});
