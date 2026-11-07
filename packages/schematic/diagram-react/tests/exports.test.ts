import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramReactExports from '../src';

describe('@retikz/diagram-react 封装外壳', () => {
  it('声明 Diagram 适配器版本元数据', () => {
    expect(manifest.name).toBe('@retikz/diagram-react');
    expect(manifest.version).toBe('0.1.0-alpha.2');
    expect(manifest.retikz).toEqual({
      domain: 'schematic',
      releaseGroup: 'diagram',
      layer: 'adapter',
      publishable: true,
    });
  });

  it('从公共根导出统一错误契约', () => {
    expect(diagramReactExports.RetikzDiagramReactError).toBeDefined();
    expect(diagramReactExports.RetikzDiagramReactErrorCode.BranchChildInvalid).toBe(
      'DIAGRAM_REACT_BRANCH_CHILD_INVALID',
    );
    expect(diagramReactExports.RetikzDiagramReactErrorCode.FlowChildInvalid).toBe('DIAGRAM_REACT_FLOW_CHILD_INVALID');
  });

  it('仅从显式对称子路径发布 Flow 编写', () => {
    expect(manifest.exports).toHaveProperty('./flow');
    expect(manifest.publishConfig.exports).toHaveProperty('./flow');
  });
});
