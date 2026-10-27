import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '@retikz/core';

import { BUILTIN_RIBBON_WIDTH_PROFILES } from './bulge';
import { extensionRibbonCapDefinitions } from './cap';
import { resolveRibbonCapRegistry } from './cap-registry';
import type { RibbonCapDefinition } from './cap-types';
import { createRibbonPathDefinition } from './definition';
import { resolveRibbonWidthProfileRegistry } from './profile-registry';
import type { RibbonWidthProfileDefinition } from './profile-types';

const ribbonKey: CoreProviderKey = { capability: 'path', name: 'ribbon' };

/** Ribbon 提供者的注册参数 */
export type RibbonProviderParams = Readonly<{
  /** 宽度函数定义 */
  profiles: ReadonlyArray<RibbonWidthProfileDefinition>;
  /** 自定义端帽定义 */
  caps: ReadonlyArray<RibbonCapDefinition>;
}>;

/** 去重相同定义引用后，交给 Ribbon 注册表诊断同名定义冲突 */
const makeRibbonDefinition: CoreDependencyProvider<RibbonProviderParams>['makeDefinition'] = contributions => {
  const profiles = new Set<RibbonWidthProfileDefinition>();
  const caps = new Set<RibbonCapDefinition>();
  for (const params of contributions) {
    for (const profile of params.profiles) profiles.add(profile);
    for (const cap of params.caps) caps.add(cap);
  }
  return createRibbonPathDefinition({ profiles: [...profiles], caps: [...caps] });
};

/**
 * 创建供 Core 依赖解析器装配 Ribbon Path 的贡献项
 * @description 包含 ribbon 根依赖与内置定义，调用方可追加宽度函数和端帽；不自动注入编译器
 * @param options 扩展注册项，默认 {}；profiles 与 caps 默认 []，仍保留全部内置定义
 * @returns 包含 ribbon 根依赖及对应 provider 的贡献项，交给 resolveCoreProviderDependencies 装配
 * @throws RetikzExtensionError：不同宽度函数定义同名，或端帽注册名重复时
 */
export const createRibbonProviderContribution = (
  options: Readonly<{
    /**
     * 追加的宽度函数定义；不能以不同定义覆盖内置或已注册名称
     * @default []
     */
    profiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
    /**
     * 追加的端帽定义；名称不能与内置或其它端帽重复
     * @default []
     */
    caps?: ReadonlyArray<RibbonCapDefinition>;
  }> = {},
): CoreProviderContribution => {
  const profiles = options.profiles ?? [];
  const caps = options.caps ?? [];
  resolveRibbonWidthProfileRegistry(BUILTIN_RIBBON_WIDTH_PROFILES, profiles);
  resolveRibbonCapRegistry(extensionRibbonCapDefinitions, caps);
  const params: RibbonProviderParams = Object.freeze({
    profiles: Object.freeze([...BUILTIN_RIBBON_WIDTH_PROFILES, ...profiles]),
    caps: Object.freeze([...caps]),
  });

  return {
    roots: [ribbonKey],
    providers: [{ key: ribbonKey, params, makeDefinition: makeRibbonDefinition }],
  };
};
