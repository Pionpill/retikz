import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramExports from '../src';
import * as diagramCommon from '../src/_diagram';
import * as flowExports from '../src/flow';

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

  it('publishes Flow only from the explicit symmetric subpath', () => {
    expect(manifest.exports).toHaveProperty('./flow');
    expect(flowExports).toEqual(
      expect.objectContaining({
        FLOW_TYPE: 'flow',
        FlowDiagramSchema: expect.any(Object),
        FlowLayoutSchema: expect.any(Object),
        FlowDiagramArtifactSchema: expect.any(Object),
        FlowDiagramDefinition: expect.any(Object),
        FlowLayoutAlignment: { Start: 'start', Center: 'center', End: 'end' },
        FlowDiagramProviderKey: expect.any(Object),
        createFlowDiagramProviderContribution: expect.any(Function),
        defineFlowLayout: expect.any(Function),
        defineFlowThemeStyle: expect.any(Function),
      }),
    );
    expect(flowExports).not.toHaveProperty('DIAGRAM_NAMESPACE');
    expect(flowExports).not.toHaveProperty('FlowType');
    expect(flowExports).not.toHaveProperty('FlowGroupKind');
    expect(flowExports).not.toHaveProperty('FlowElementType');
    expect(flowExports).not.toHaveProperty('FlowElementSchema');
    expect(flowExports).not.toHaveProperty('createCompileFlowDiagram');
    expect(flowExports).not.toHaveProperty('resolveFlowDiagram');
  });

  it('collects shared Diagram capabilities in the internal _diagram owner', () => {
    expect(diagramCommon).toEqual(
      expect.objectContaining({
        DIAGRAM_NAMESPACE: 'diagram',
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
