// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import type { SubPage } from '@/modules/docs/data';

import { DocDifficulty, kernelSection, librarySection, schematicSection, vizSection } from '@/modules/docs/data';

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
});
