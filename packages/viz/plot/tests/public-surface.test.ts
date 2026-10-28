import { describe, expect, it } from 'vitest';

import * as plot from '../src';

describe('@retikz/plot 公开接口', () => {
  it('将数据转换定义保存在其所属的包中', () => {
    expect(plot).not.toHaveProperty('TransformSchema');
    expect(plot).not.toHaveProperty('StackTransformSchema');
    expect(plot).not.toHaveProperty('PlotTransform');
    expect(plot).not.toHaveProperty('resolvePlotTransformRegistry');
  });

  it('从包根导出构面配置 schema 和组合解析器', () => {
    const publicSurface = plot as Record<string, unknown>;

    expect(publicSurface.PlotFacetConfigurationSchema).toBeDefined();
    expect(publicSurface.resolvePlotFacetComposition).toBeTypeOf('function');
  });

  it('从包根导出 Plot 拥有的构面分区原子', () => {
    const publicSurface = plot as Record<string, unknown>;

    expect(publicSurface.PlotPartitionScalarSchema).toBeDefined();
    expect(publicSurface.PlotPartitionDimensionSchema).toBeDefined();
    expect(publicSurface.PlotFacetOptionsSchema).toBeDefined();
  });

  it('将点字形组装助手保留在内部以下沉标记', () => {
    const publicSurface = plot as Record<string, unknown>;

    expect(publicSurface).not.toHaveProperty('pointGlyphStyle');
  });
});
