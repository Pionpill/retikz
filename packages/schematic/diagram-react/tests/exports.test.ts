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

  it('在编写设计之前将公共根保留为空', () => {
    expect(Object.keys(diagramReactExports)).toEqual([]);
  });

  it('仅从显式对称子路径发布 Flow 编写', () => {
    expect(manifest.exports).toHaveProperty('./flow');
    expect(manifest.publishConfig.exports).toHaveProperty('./flow');
  });
});
