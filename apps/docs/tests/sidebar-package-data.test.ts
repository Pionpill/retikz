import type { TFunction } from 'i18next';

import { describe, expect, it } from 'vitest';

import { kernelSection } from '@/modules/docs/data';
import { buildSidebarCategories } from '@/modules/docs/layout';

const identityT = ((key: string) => key) as TFunction;

describe('Kernel 包侧栏数据', () => {
  it('按分组保留 URL 层级，并将多篇包文档展开为扁平 slug', () => {
    const packages = buildSidebarCategories(identityT, 'kernel', kernelSection).find(
      category => category.value === 'packages',
    );

    expect(
      packages?.modules.map(module => [
        module.value,
        module.label,
        module.children?.map(child => [child.value, child.label]),
      ]),
    ).toEqual([
      [
        'base',
        'kernel.pkgGroupBase',
        [
          ['foundation', 'kernel.pkgFoundation'],
          ['math-transforms', 'kernel.pkgMathTransforms'],
          ['math-primitives', 'kernel.pkgMathPrimitives'],
          ['math-algorithms', 'kernel.pkgMathAlgorithms'],
        ],
      ],
      [
        'core',
        'kernel.pkgGroupCore',
        [
          ['core', 'kernel.pkgCore'],
          ['runtime', 'kernel.pkgRuntime'],
          ['runtime-session', 'kernel.pkgRuntimeSession'],
        ],
      ],
      [
        'extension',
        'kernel.pkgGroupExtension',
        [
          ['tex', 'kernel.pkgTex'],
          ['inspect', 'kernel.pkgInspect'],
        ],
      ],
      [
        'framework',
        'kernel.pkgGroupFramework',
        [
          ['vanilla', 'kernel.pkgVanilla'],
          ['react', 'kernel.pkgReact'],
        ],
      ],
      [
        'render',
        'kernel.pkgGroupRender',
        [
          ['render', 'kernel.pkgRender'],
          ['render-svg', 'kernel.pkgRenderSvg'],
          ['render-canvas', 'kernel.pkgRenderCanvas'],
          ['render-hydration', 'kernel.pkgHydration'],
        ],
      ],
    ]);
  });
});
