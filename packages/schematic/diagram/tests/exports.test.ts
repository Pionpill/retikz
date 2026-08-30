import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramExports from '../src';
import * as diagramCommon from '../src/_diagram';

describe('@retikz/diagram package shell', () => {
  it('declares the Diagram release metadata', () => {
    expect(manifest.name).toBe('@retikz/diagram');
    expect(manifest.version).toBe('0.1.0-alpha.1');
    expect(manifest.retikz).toEqual({
      domain: 'schematic',
      releaseGroup: 'diagram',
      layer: 'tier2',
      publishable: true,
    });
  });

  it('keeps package-internal Foundation contracts out of the public root', () => {
    expect(Object.keys(diagramExports)).toEqual([]);
  });

  it('collects shared Diagram capabilities in the internal _diagram owner', () => {
    expect(diagramCommon).toEqual(
      expect.objectContaining({
        DiagramFrameSchema: expect.any(Object),
        DiagramPresentationSchema: expect.any(Object),
        DiagramThemeSchema: expect.any(Object),
        defineDiagramThemeStyle: expect.any(Function),
        lowerDiagramFoundation: expect.any(Function),
        resolveDiagramFoundation: expect.any(Function),
      }),
    );
  });
});
