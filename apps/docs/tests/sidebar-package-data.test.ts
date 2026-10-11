import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { kernelSection } from '@/modules/docs/data';
import { buildSidebarCategories } from '@/modules/docs/layout';

const identityT = ((key: string) => key) as TFunction;

describe('Kernel 包侧栏数据', () => {
  it('保留各包及其文档 URL 层级，不将更新日志混入开发包', () => {
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
        'foundation',
        'kernel.pkgFoundation',
        [
          ['utilities', 'kernel.pkgFoundationUtilities'],
          ['types-schemas', 'kernel.pkgFoundationTypesSchemas'],
          ['validation-errors', 'kernel.pkgFoundationValidationErrors'],
          ['reference', 'kernel.pkgFoundationApiReference'],
        ],
      ],
      [
        'math',
        'kernel.pkgMath',
        [
          ['primitives', 'kernel.pkgMathPrimitives'],
          ['transforms', 'kernel.pkgMathTransforms'],
          ['algorithms', 'kernel.pkgMathAlgorithms'],
          ['reference', 'kernel.pkgMathApiReference'],
        ],
      ],
      [
        'runtime',
        'kernel.pkgRuntime',
        [
          ['usage', 'kernel.pkgRuntimeUsage'],
          ['source', 'kernel.pkgRuntimeSource'],
          ['identity', 'kernel.pkgRuntimeIdentity'],
          ['computation', 'kernel.pkgRuntimeComputation'],
          ['transaction', 'kernel.pkgRuntimeTransaction'],
          ['participant', 'kernel.pkgRuntimeParticipant'],
          ['trace', 'kernel.pkgRuntimeTrace'],
          ['lifecycle', 'kernel.pkgRuntimeLifecycle'],
          ['reference', 'kernel.pkgRuntimeApiReference'],
        ],
      ],
      ['core', 'kernel.pkgCore', [['overview', 'kernel.pkgOverview']]],
      [
        'tex',
        'kernel.pkgTex',
        [
          ['authoring', 'kernel.pkgTexAuthoring'],
          ['configuration', 'kernel.pkgTexConfiguration'],
          ['mechanism', 'kernel.pkgTexMechanism'],
          ['reference', 'kernel.pkgTexApiReference'],
        ],
      ],
      [
        'inspect',
        'kernel.pkgInspect',
        [
          ['builtins', 'kernel.pkgInspectBuiltins'],
          ['custom', 'kernel.pkgInspectCustom'],
          ['mechanism', 'kernel.pkgInspectMechanism'],
          ['reference', 'kernel.pkgInspectApiReference'],
        ],
      ],
      ['vanilla', 'kernel.pkgVanilla', [['overview', 'kernel.pkgOverview']]],
      ['react', 'kernel.pkgReact', [['overview', 'kernel.pkgOverview']]],
      [
        'render',
        'kernel.pkgRender',
        [
          ['overview', 'kernel.pkgOverview'],
          ['svg', 'kernel.pkgRenderSvg'],
          ['canvas', 'kernel.pkgRenderCanvas'],
          ['hydration', 'kernel.pkgHydration'],
        ],
      ],
    ]);
  });
});
