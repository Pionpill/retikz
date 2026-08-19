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
  it('uses the _chart, _shared, and Point family owners without legacy routes', async () => {
    const paths = (await sourceFilesUnder(sourceRoot)).map(path => relative(sourceRoot, path).replaceAll('\\', '/'));

    expect(paths.some(path => path.startsWith('_chart/'))).toBe(true);
    expect(paths.some(path => path.startsWith('_shared/'))).toBe(true);
    expect(paths.some(path => path.startsWith('point/'))).toBe(true);
    expect(paths).toContain('_shared/recipe/plot.ts');
    expect(paths).toContain('_shared/schemas/json.ts');
    expect(paths).toContain('point/shared/schema.ts');
    expect(paths).toContain('point/shared/plot.ts');
    expect(paths).toContain('point/shared/recipe.ts');
    expect(paths).not.toContain('_shared/normalize.ts');
    expect(paths).toContain('point/bubble/index.ts');
    expect(paths).toContain('point/scatter/index.ts');
    expect(paths).toContain('point/connected-scatter/index.ts');
    expect(paths).not.toContain('_shared/schemas/point.ts');
    expect(paths).not.toContain('_shared/recipe/point.ts');
    expect(paths).not.toContain('point/shared/plot-seed.ts');
    expect(paths).not.toContain('_shared/recipe/plot-seed.ts');
    expect(
      paths.some(
        path =>
          path.startsWith('base/') ||
          path.startsWith('shared/') ||
          path.startsWith('schemas/') ||
          path.startsWith('resolution/'),
      ),
    ).toBe(false);
    expect(
      paths.some(path => path.startsWith('schemas/') || path.startsWith('presentation/') || path.startsWith('style/')),
    ).toBe(false);
  });

  it('keeps _shared independent from _chart and Point owners', async () => {
    const sharedFiles = await sourceFilesUnder(join(sourceRoot, '_shared'));
    const contents = await Promise.all(sharedFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"](?:\.\.\/)+(_chart|point)(?:\/|['"])/.test(content))).toBe(false);
  });

  it('keeps _chart dispatch independent from Point recipes', async () => {
    const chartFiles = await sourceFilesUnder(join(sourceRoot, '_chart'));
    const contents = await Promise.all(chartFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"][^'"]*\/point(?:\/|['"])/.test(content))).toBe(false);
  });

  it('lets the Point family consume only _shared through its owner barrel', async () => {
    const pointFiles = await sourceFilesUnder(join(sourceRoot, 'point'));
    const contents = await Promise.all(pointFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"].*\/_shared(?:\/|['"])/.test(content))).toBe(true);
    expect(contents.some(content => /from ['"].*\/_chart(?:\/|['"])/.test(content))).toBe(false);
  });
});
