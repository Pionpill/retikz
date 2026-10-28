import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import * as diagramVanillaExports from '../src';

describe('@retikz/diagram-vanilla 封装外壳', () => {
  it('声明 Diagram 适配器版本元数据', () => {
    expect(manifest.name).toBe('@retikz/diagram-vanilla');
    expect(manifest.version).toBe('0.1.0-alpha.2');
    expect(manifest.retikz).toEqual({
      domain: 'schematic',
      releaseGroup: 'diagram',
      layer: 'adapter',
      publishable: true,
    });
  });

  it('在编写设计之前将公共根保留为空', () => {
    expect(Object.keys(diagramVanillaExports)).toEqual([]);
  });

  it('仅从显式对称子路径发布 Flow 编写', () => {
    expect(manifest.exports).toHaveProperty('./flow');
    expect(manifest.publishConfig.exports).toHaveProperty('./flow');
  });
});
