import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramExports from '../src';
import * as diagramCommon from '../src/_diagram';
import * as flowExports from '../src/flow';

describe('@retikz/diagram 封装外壳', () => {
  it('声明 Diagram 发布元数据', () => {
    expect(manifest.name).toBe('@retikz/diagram');
    expect(manifest.version).toBe('0.1.0-alpha.2');
    expect(manifest.retikz).toEqual({
      domain: 'schematic',
      releaseGroup: 'diagram',
      layer: 'tier2',
      publishable: true,
    });
  });

  it('将包内部 Foundation 契约保留在公共根之外', () => {
    expect(Object.keys(diagramExports)).toEqual([]);
  });

  it('仅从显式对称子路径发布 Flow', () => {
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
        defineFlowTheme: expect.any(Function),
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

  it('收集内部_diagram 所属模块中共享的 Diagram 功能', () => {
    expect(diagramCommon).toEqual(
      expect.objectContaining({
        DIAGRAM_NAMESPACE: 'diagram',
        DiagramFrameSchema: expect.any(Object),
        DiagramPresentationSchema: expect.any(Object),
        DiagramDefaultsSchema: expect.any(Object),
        lowerDiagramFoundation: expect.any(Function),
        resolveDiagramFoundation: expect.any(Function),
      }),
    );
  });
});
