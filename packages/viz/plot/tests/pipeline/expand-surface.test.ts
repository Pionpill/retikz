import type { IRScene } from '@retikz/core';
import { compileToScene, CURRENT_IR_VERSION, resolveCoreProviderDependencies } from '@retikz/core';
import { BUILTIN_RIBBON_WIDTH_PROFILES, ribbonPathDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions, PlotDefinitions, PlotImplementations } from '../../src/pipeline/expand';
import { createPlotProviderContribution } from '../../src/pipeline/expand';

describe('扩大管线稳定面', () => {
  it('复用同名行数组，拒绝不同引用覆盖同名数据集', () => {
    const rows = [{ value: 1 }];
    const first = createPlotProviderContribution({ sales: rows });
    const shared = createPlotProviderContribution({ sales: rows });
    const conflict = createPlotProviderContribution({ sales: [...rows] });

    expect(resolveCoreProviderDependencies({ contributions: [first, shared] }).composites).toHaveLength(1);
    expect(() => resolveCoreProviderDependencies({ contributions: [first, conflict] })).toThrow(
      /sales.*conflicts by identity/,
    );
  });

  it('合并不同分组对象中的相同共享字段，允许各 Plot 使用不同尺寸', () => {
    const channels: PlotDefinitions['channels'] = [];
    const transforms: PlotImplementations['transforms'] = [];
    const contributions = [200, 400].map(width =>
      createPlotProviderContribution(
        {},
        {
          layout: { width, height: width / 2, fontSize: 12 },
          definitions: { channels },
          implementations: { transforms },
        },
      ),
    );

    const definitions = resolveCoreProviderDependencies({ contributions });
    expect(() =>
      compileToScene({ version: CURRENT_IR_VERSION, type: 'scene', children: [] }, definitions),
    ).not.toThrow();
  });

  it.each<[PlotsLoweringOptions, PlotsLoweringOptions, string]>([
    [{ layout: { fontSize: 12 } }, { layout: { fontSize: 16 } }, 'layout.fontSize'],
    [{ definitions: { channels: [] } }, { definitions: { channels: [] } }, 'definitions.channels'],
    [{ implementations: { transforms: [] } }, { implementations: { transforms: [] } }, 'implementations.transforms'],
  ])('拒绝冲突的共享字段：%j / %j', (first, second, field) => {
    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [createPlotProviderContribution({}, first), createPlotProviderContribution({}, second)],
      }),
    ).toThrow(field);
  });

  it('明确贡献 Standard 色带路径及其配置参数', () => {
    const contribution = createPlotProviderContribution({});

    expect(contribution.roots).toContainEqual({ capability: 'path', name: 'ribbon' });

    const ribbonProvider = contribution.providers.find(
      provider => provider.key.capability === 'path' && provider.key.name === 'ribbon',
    );

    expect(ribbonProvider).toBeDefined();
    expect(ribbonProvider?.params).toMatchObject({ profiles: [BUILTIN_RIBBON_WIDTH_PROFILES[0]] });

    const definitions = resolveCoreProviderDependencies({ contributions: [contribution] });
    const ribbonDefinitions = definitions.paths?.filter(definition => definition.name === 'ribbon') ?? [];

    expect(ribbonDefinitions).toHaveLength(1);
    expect(ribbonDefinitions[0]?.schema).toBe(ribbonPathDefinition.schema);

    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions: {
            width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 8 } },
            sampling: { kind: 'fixed', samples: 3 },
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [40, 0] },
          ],
        },
      ],
    };

    expect(() => compileToScene(ir, { ...definitions, padding: 0 })).not.toThrow();
  });
});
