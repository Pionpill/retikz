import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../../src/', import.meta.url));

const sourceFilesUnder = async (directory: string): Promise<Array<string>> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: Array<string> = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFilesUnder(path)));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
};

describe('Chart semantic source layout', () => {
  it('uses _chart providers and concrete Point chartType owners', async () => {
    const paths = (await sourceFilesUnder(sourceRoot)).map(path => relative(sourceRoot, path).replaceAll('\\', '/'));

    expect(paths.some(path => path.startsWith('_assembly/'))).toBe(false);
    expect(paths.some(path => path.startsWith('_shared/'))).toBe(false);
    expect(paths).toContain('_chart/providers/provider.ts');
    expect(paths).toContain('_chart/providers/registry.ts');
    expect(paths).toContain('_chart/providers/theme.ts');
    expect(paths).toContain('_chart/providers/definition.ts');
    expect(paths).toContain('_chart/resolve/resolve.ts');
    expect(paths).toContain('_chart/schemas/source.ts');
    expect(paths).toContain('point/constants.ts');
    expect(paths).toContain('point/shared/schema.ts');
    expect(paths).toContain('point/scatter/schema.ts');
    expect(paths).toContain('point/scatter/recipe.ts');
    expect(paths).toContain('point/scatter/provider.ts');
    expect(paths).not.toContain('point/family.ts');
  });

  it('keeps generic Chart owners independent from concrete families', async () => {
    const files = await sourceFilesUnder(sourceRoot);
    const normalizedPathOf = (path: string): string => relative(sourceRoot, path).replaceAll('\\', '/');
    const chartFiles = files.filter(path => normalizedPathOf(path).startsWith('_chart/'));
    const contents = (await Promise.all(chartFiles.map(path => readFile(path, 'utf8')))).join('\n');
    expect(contents).not.toMatch(/from ['"][^'"]*\/point(?:\/|['"])/);
    expect(contents).not.toMatch(/\bChartCatalog\b|\bChartFamilyDefinition\b|\bPointChartSchema\b/);
  });

  it('keeps family modules independent from provider lookup state', async () => {
    const files = await sourceFilesUnder(sourceRoot);
    const normalizedPathOf = (path: string): string => relative(sourceRoot, path).replaceAll('\\', '/');
    const pointFiles = files.filter(path => normalizedPathOf(path).startsWith('point/'));
    const pointContents = (await Promise.all(pointFiles.map(path => readFile(path, 'utf8')))).join('\n');
    expect(pointContents).not.toMatch(
      /from ['"][^'"]*_chart\/providers\/(?:registry|resolve|theme|definition)(?:\/|['"])/,
    );
    expect(pointContents).not.toMatch(/ChartFamilyDefinition|defineChartFamily|ChartCatalog/);
  });
});
