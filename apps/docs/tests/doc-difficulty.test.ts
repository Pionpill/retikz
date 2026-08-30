// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import type { Section, SubPage } from '@/modules/docs/data';

import {
  DocDifficulty,
  isDocDifficultyVisible,
  kernelSection,
  librarySection,
  schematicSection,
  vizSection,
} from '@/modules/docs/data';
import { filterSectionsByDifficulty, flattenLeaves } from '@/modules/docs/layout';
import { useDocDifficultyStore } from '@/modules/docs/store';

const label = 'common.notFound' as const;

const sections: Array<Section> = [
  {
    id: 'guide',
    label,
    document: true,
    pages: [
      { id: 'intro', label, difficulty: DocDifficulty.Beginner },
      { id: 'api', label },
      { id: 'advanced', label, difficulty: DocDifficulty.Advanced },
      {
        id: 'internals',
        label,
        children: [{ id: 'runtime', label, difficulty: DocDifficulty.Internals }],
      },
    ],
  },
  {
    id: 'hidden',
    label,
    pages: [{ id: 'maintainer', label, difficulty: DocDifficulty.Internals }],
  },
];

describe('document difficulty visibility', () => {
  it('keeps unmarked documents visible at every maximum difficulty', () => {
    expect(isDocDifficultyVisible(undefined, DocDifficulty.Beginner)).toBe(true);
    expect(isDocDifficultyVisible(undefined, DocDifficulty.Advanced)).toBe(true);
    expect(isDocDifficultyVisible(undefined, DocDifficulty.Internals)).toBe(true);
  });

  it('uses cumulative maximum-difficulty semantics', () => {
    expect(isDocDifficultyVisible(DocDifficulty.Beginner, DocDifficulty.Beginner)).toBe(true);
    expect(isDocDifficultyVisible(DocDifficulty.Advanced, DocDifficulty.Beginner)).toBe(false);
    expect(isDocDifficultyVisible(DocDifficulty.Internals, DocDifficulty.Advanced)).toBe(false);
    expect(isDocDifficultyVisible(DocDifficulty.Beginner, DocDifficulty.Advanced)).toBe(true);
    expect(isDocDifficultyVisible(DocDifficulty.Advanced, DocDifficulty.Internals)).toBe(true);
    expect(isDocDifficultyVisible(DocDifficulty.Internals, DocDifficulty.Internals)).toBe(true);
  });
});

describe('filterSectionsByDifficulty', () => {
  it('keeps a documented section navigable when it has no child pages', () => {
    const filtered = filterSectionsByDifficulty(
      [{ id: 'diagram', label, document: true, pages: [] }],
      DocDifficulty.Beginner,
    );

    expect(flattenLeaves('schematic', filtered).map(node => node.path)).toEqual(['/schematic/diagram']);
  });

  it('filters leaves recursively and removes groups with no visible leaves', () => {
    const filtered = filterSectionsByDifficulty(sections, DocDifficulty.Beginner);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('guide');
    expect(filtered[0]?.pages.map(page => page.id)).toEqual(['intro', 'api']);
  });

  it('keeps lower levels when the maximum is Advanced', () => {
    const filtered = filterSectionsByDifficulty(sections, DocDifficulty.Advanced);

    expect(filtered.map(section => section.id)).toEqual(['guide']);
    expect(filtered[0]?.pages.map(page => page.id)).toEqual(['intro', 'api', 'advanced']);
  });

  it('keeps the complete tree for Internals without mutating the source', () => {
    const sourceSnapshot = structuredClone(sections);
    const filtered = filterSectionsByDifficulty(sections, DocDifficulty.Internals);

    expect(filtered).toEqual(sections);
    expect(filtered).not.toBe(sections);
    expect(sections).toEqual(sourceSnapshot);
  });
});

describe('document difficulty preference', () => {
  it('defaults to Advanced for first-time visitors', () => {
    expect(useDocDifficultyStore.getState().maximumDifficulty).toBe(DocDifficulty.Advanced);
  });

  it('updates the global maximum difficulty', () => {
    useDocDifficultyStore.getState().setMaximumDifficulty(DocDifficulty.Beginner);

    expect(useDocDifficultyStore.getState().maximumDifficulty).toBe(DocDifficulty.Beginner);

    useDocDifficultyStore.getState().setMaximumDifficulty(DocDifficulty.Advanced);
  });
});

describe('current documentation difficulty assignments', () => {
  const modules = [
    ['kernel', kernelSection],
    ['library', librarySection],
    ['schematic', schematicSection],
    ['viz', vizSection],
  ] as const;

  const collectDifficulties = (items: Array<SubPage>): Array<string | undefined> =>
    items.flatMap(item => (item.children ? collectDifficulties(item.children) : [item.difficulty]));

  it.each(modules)('%s includes Beginner and Advanced reading levels', (_moduleId, moduleSections) => {
    const difficulties = collectDifficulties(moduleSections.flatMap(section => section.pages));

    expect(difficulties).toContain(DocDifficulty.Beginner);
    expect(difficulties).toContain(DocDifficulty.Advanced);
  });

  it.each([
    ['kernel', kernelSection],
    ['library', librarySection],
    ['viz', vizSection],
  ] as const)('%s includes explicit Internals documents', (_moduleId, moduleSections) => {
    const difficulties = collectDifficulties(moduleSections.flatMap(section => section.pages));

    expect(difficulties).toContain(DocDifficulty.Internals);
  });

  it('keeps the Path schema query page unmarked', () => {
    const reference = kernelSection.find(section => section.id === 'reference');
    const schema = reference?.pages.find(page => page.id === 'schema');
    const path = schema?.children?.find(page => page.id === 'path');

    expect(path?.difficulty).toBeUndefined();
  });

  it.each(modules)('%s Beginner mode reduces leaves without retaining empty groups', (moduleId, moduleSections) => {
    const filtered = filterSectionsByDifficulty(moduleSections, DocDifficulty.Beginner);

    expect(flattenLeaves(moduleId, filtered).length).toBeLessThan(flattenLeaves(moduleId, moduleSections).length);
    expect(filtered.every(section => section.document || section.pages.length > 0)).toBe(true);
  });
});
