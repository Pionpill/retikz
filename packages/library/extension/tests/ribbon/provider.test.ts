import type { IRScene } from '@retikz/core';
import { compileToScene, CURRENT_IR_VERSION, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { RibbonWidthProfileDefinition } from '../../src/ribbon';
import {
  BUILTIN_RIBBON_WIDTH_PROFILES,
  createRibbonProviderContribution,
  defineRibbonWidthProfile,
} from '../../src/ribbon';

const profile = (name: string, width: number): RibbonWidthProfileDefinition =>
  defineRibbonWidthProfile({ name, widthAt: () => width });

const profileScene = (name: string): IRScene => ({
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: [
    {
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: { kind: 'profile', name }, sampling: { kind: 'fixed', samples: 3 } },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [40, 0] },
      ],
    },
  ],
});

describe('扩展功能区提供者的贡献', () => {
  it('使用一个稳定器，默认提供官方凸出轮廓', () => {
    const first = createRibbonProviderContribution();
    const second = createRibbonProviderContribution();
    const firstProvider = first.providers[0];
    const secondProvider = second.providers[0];

    expect(firstProvider.makeDefinition).toBe(secondProvider.makeDefinition);
    expect(firstProvider.params).toMatchObject({ profiles: [BUILTIN_RIBBON_WIDTH_PROFILES[0]] });

    const definitions = resolveCoreProviderDependencies({ contributions: [first] });

    expect(definitions.paths).toHaveLength(1);
    expect(definitions.paths).toMatchObject([{ name: 'ribbon' }]);
  });

  it('将多个贡献的重复配置引用合并到一个功能区定义中', () => {
    const custom = profile('custom', 8);
    const first = createRibbonProviderContribution({ profiles: [custom] });
    const second = createRibbonProviderContribution({ profiles: [custom] });
    const definitions = resolveCoreProviderDependencies({ contributions: [first, second] });

    expect(definitions.paths).toHaveLength(1);
    expect(() =>
      compileToScene(profileScene('custom'), {
        paths: definitions.paths,
        padding: 0,
      }),
    ).not.toThrow();
  });

  it('当贡献使用不同的对象定义相同的配置名称时，会明确报错', () => {
    const first = createRibbonProviderContribution({ profiles: [profile('custom', 8)] });
    const second = createRibbonProviderContribution({ profiles: [profile('custom', 12)] });

    expect(() => resolveCoreProviderDependencies({ contributions: [first, second] })).toThrow(
      /profile 'custom'.*more than once/i,
    );
  });

  it('支持 __proto__ 作为配置名称，并通过提供者参数进行编译', () => {
    const custom = profile('__proto__', 8);
    const contribution = createRibbonProviderContribution({ profiles: [custom] });
    const provider = contribution.providers[0];

    expect(provider.params).toMatchObject({ profiles: expect.arrayContaining([custom]) });

    const definitions = resolveCoreProviderDependencies({ contributions: [contribution] });

    expect(() =>
      compileToScene(profileScene('__proto__'), {
        paths: definitions.paths,
        padding: 0,
      }),
    ).not.toThrow();
  });

  it('当不同的贡献用不同的对象定义 __proto__ 时，会明确报错', () => {
    const first = createRibbonProviderContribution({ profiles: [profile('__proto__', 8)] });
    const second = createRibbonProviderContribution({ profiles: [profile('__proto__', 12)] });

    expect(() => resolveCoreProviderDependencies({ contributions: [first, second] })).toThrow(
      /profile '__proto__'.*more than once/i,
    );
  });
});
