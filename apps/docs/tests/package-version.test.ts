import { describe, expect, it } from 'vitest';

import { getDocPackageVersion, getPackageReleaseVersion } from '@/modules/docs/data/package-version';

import corePackage from '../../../packages/kernel/core/package.json';
import foundationPackage from '../../../packages/kernel/foundation/package.json';
import inspectPackage from '../../../packages/kernel/inspect/package.json';
import mathPackage from '../../../packages/kernel/math/package.json';
import reactPackage from '../../../packages/kernel/react/package.json';
import renderPackage from '../../../packages/kernel/render/package.json';
import runtimePackage from '../../../packages/kernel/runtime/package.json';
import texPackage from '../../../packages/kernel/tex/package.json';
import vanillaPackage from '../../../packages/kernel/vanilla/package.json';
import tablePackage from '../../../packages/viz/table/package.json';

describe('包版本注册表', () => {
  it('直接使用 Kernel 各 package manifest 的 lockstep 版本', () => {
    const kernelVersions = [
      foundationPackage.version,
      mathPackage.version,
      runtimePackage.version,
      corePackage.version,
      inspectPackage.version,
      renderPackage.version,
      reactPackage.version,
      vanillaPackage.version,
      texPackage.version,
    ];

    expect(new Set(kernelVersions)).toEqual(new Set([corePackage.version]));
    expect(getPackageReleaseVersion('kernel')).toBe(corePackage.version);
  });

  it('将 packages 路由映射到其实际 release group 版本', () => {
    expect(getDocPackageVersion({ moduleId: 'kernel', sectionId: 'packages' })).toBe(corePackage.version);
    expect(getDocPackageVersion({ moduleId: 'viz', sectionId: 'table' })).toBe(tablePackage.version);
    expect(getDocPackageVersion({ moduleId: 'kernel', sectionId: 'components' })).toBeUndefined();
  });
});
