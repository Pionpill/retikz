import type { FC, ReactNode } from 'react';

import { describe, expect, it } from 'vitest';

import type { PreviewControlContract } from '@/modules/docs/components/component-preview';

import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { relationStatusOf } from '@/modules/docs/contents/schematic/graph/relation/basic/relation-role-controls';

type ControlModule = Readonly<{
  previewControlContract: PreviewControlContract;
}>;

type DemoModule = Readonly<{
  default: FC;
  previewSource: Readonly<{ canonicalRender?: () => ReactNode }>;
}>;

const entityRoleControlPaths = [
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-participant.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-activity.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-event.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-state.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-gateway.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-resource.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-concept.controls.ts',
] as const;

const relationRoleControlPaths = [
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-association.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-dependency.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-generalization.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-flow.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-influence.controls.ts',
] as const;

const styleControlPaths = [
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-style.controls.ts',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-style.controls.ts',
] as const;

const entityRoleDemoPaths = [
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-participant.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-activity.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-event.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-state.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-gateway.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-resource.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-concept.zh.demo.tsx',
] as const;

const relationRoleDemoPaths = [
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-association.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-dependency.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-generalization.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-flow.zh.demo.tsx',
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-influence.zh.demo.tsx',
] as const;

const roleControls: Partial<Record<string, ControlModule>> = {
  ...import.meta.glob<ControlModule>(
    '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-*.controls.ts',
    { eager: true },
  ),
  ...import.meta.glob<ControlModule>(
    '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-*.controls.ts',
    { eager: true },
  ),
};

const englishRoleControls: Partial<Record<string, ControlModule>> = {
  ...import.meta.glob<ControlModule>(
    '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-*.en.controls.ts',
    { eager: true },
  ),
  ...import.meta.glob<ControlModule>(
    '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-*.en.controls.ts',
    { eager: true },
  ),
};

const roleDemos: Partial<Record<string, DemoModule>> = {
  ...import.meta.glob<DemoModule>('../../src/modules/docs/contents/schematic/graph/entity/basic/entity-*.zh.demo.tsx', {
    eager: true,
  }),
  ...import.meta.glob<DemoModule>(
    '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-*.zh.demo.tsx',
    { eager: true },
  ),
};

const statusDemoFiles = {
  ...import.meta.glob('../../src/modules/docs/contents/schematic/graph/entity/basic/entity-status.*'),
  ...import.meta.glob('../../src/modules/docs/contents/schematic/graph/relation/basic/relation-status.*'),
};

const expectedStatusValues = ['', 'error', 'success', 'warning', 'disabled'];

const englishPathOf = (path: string): string => path.replace('.controls.ts', '.en.controls.ts');

describe('Graph semantic status controls', () => {
  it('does not keep separate Entity or Relation semantic-status demos', () => {
    expect(Object.keys(statusDemoFiles)).toEqual([]);
  });

  it('adds an unstyled option and every closed status to every bilingual Entity and Relation playground', () => {
    for (const path of [...entityRoleControlPaths, ...relationRoleControlPaths, ...styleControlPaths]) {
      const controls = roleControls[path];
      const englishControls = englishRoleControls[englishPathOf(path)];

      expect(controls).toBeDefined();
      expect(englishControls).toBeDefined();
      if (controls === undefined || englishControls === undefined) continue;

      const status = getPreviewControlFields(controls.previewControlContract.controls).find(
        field => field.id === 'status',
      );
      expect(status).toMatchObject({ kind: 'select', defaultValue: '' });
      expect(status?.kind === 'select' ? status.options.map(option => option.value) : []).toEqual(expectedStatusValues);
      expect(controls.previewControlContract.canonicalValues).toMatchObject({ status: '' });
      expect(englishControls.previewControlContract.canonicalValues).toEqual(
        controls.previewControlContract.canonicalValues,
      );
      expect(englishControls.previewControlContract.relatedApis).toEqual(controls.previewControlContract.relatedApis);
    }
  });

  it('omits the Relation status when the unstyled option is selected', () => {
    expect(relationStatusOf('')).toBeUndefined();
  });

  it('omits the canonical status from every Entity and Relation role Source preview', () => {
    for (const path of [...entityRoleDemoPaths, ...relationRoleDemoPaths]) {
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
