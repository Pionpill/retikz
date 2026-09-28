import type { FC, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { PreviewControlContract } from '@/modules/docs/components/component-preview';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { relationStatusOf } from '@/modules/docs/contents/schematic/graph/relation/usage/relation-role-controls';

type ControlModule = Readonly<{
  previewControlContract: PreviewControlContract;
  createPreviewControlContract: (lang: 'zh' | 'en') => PreviewControlContract;
}>;

type DemoModule = Readonly<{
  default: FC;
  previewSource: Readonly<{ canonicalRender?: () => ReactNode }>;
}>;

const relationRoleControlPaths = [
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-association.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-dependency.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-generalization.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-flow.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-influence.controls.ts',
] as const;

const styleControlPaths = [
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-style.controls.ts',
] as const;

const relationRoleDemoPaths = [
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-association.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-dependency.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-generalization.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-flow.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-influence.tsx',
] as const;

const roleControls: Partial<Record<string, ControlModule>> = {
  ...import.meta.glob<ControlModule>(
    '../../src/modules/docs/contents/schematic/graph/relation/usage/relation-*.controls.ts',
    { eager: true },
  ),
};

const roleDemos: Partial<Record<string, DemoModule>> = {
  ...import.meta.glob<DemoModule>('../../src/modules/docs/contents/schematic/graph/relation/usage/relation-*.tsx', {
    eager: true,
  }),
};

const expectedStatusValues = ['', 'error', 'success', 'warning', 'disabled'];

describe('Graph semantic status controls', () => {
  it('adds an unstyled option and every closed status to every bilingual Relation playground', () => {
    for (const path of [...relationRoleControlPaths, ...styleControlPaths]) {
      const controls = roleControls[path];
      const englishControls = controls?.createPreviewControlContract('en');

      expect(controls).toBeDefined();
      expect(englishControls).toBeDefined();
      if (controls === undefined || englishControls === undefined) continue;

      const status = getPreviewControlFields(controls.previewControlContract.controls).find(
        field => field.id === 'status',
      );
      expect(status).toMatchObject({ kind: 'select', defaultValue: '' });
      expect(status?.kind === 'select' ? status.options.map(option => option.value) : []).toEqual(expectedStatusValues);
      expect(controls.previewControlContract.canonicalValues).toMatchObject({ status: '' });
      expect(englishControls.canonicalValues).toEqual(controls.previewControlContract.canonicalValues);
      expect(englishControls.relatedApis).toEqual(controls.previewControlContract.relatedApis);
    }
  });

  it('omits the Relation status when the unstyled option is selected', () => {
    expect(relationStatusOf('')).toBeUndefined();
  });

  it('omits the canonical status from every Relation role Source preview', () => {
    for (const path of [...relationRoleDemoPaths]) {
      const demo = roleDemos[path];

      expect(demo).toBeDefined();
      if (demo === undefined) continue;

      const graph = buildPreviewIR(() => demo.previewSource.canonicalRender?.() ?? null).ir.children[0] as {
        children?: ReadonlyArray<unknown>;
      };
      expect(graph.children).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ status: expect.anything() })]),
      );
    }
  });
});
