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
  it('removes the former technical owner directories', async () => {
    const paths = (await sourceFilesUnder(sourceRoot)).map(path => relative(sourceRoot, path).replaceAll('\\', '/'));

    expect(paths.some(path => path.startsWith('pipeline/') || path.startsWith('providers/'))).toBe(false);
  });

  it('keeps lower shared and family owners independent from higher resolution owners', async () => {
    const sharedFiles = await sourceFilesUnder(join(sourceRoot, 'shared'));
    const familyFiles = await sourceFilesUnder(join(sourceRoot, 'families'));
    const contents = await Promise.all([...sharedFiles, ...familyFiles].map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"].*\/(presentation|style|resolution)/.test(content))).toBe(false);
  });

  it('keeps family owners independent from resolution', async () => {
    const files = await sourceFilesUnder(sourceRoot);
    const catalogImports = await Promise.all(
      files.map(async path => ({ path: relative(sourceRoot, path), content: await readFile(path, 'utf8') })),
    );

    expect(
      catalogImports
        .filter(({ path }) => path.startsWith('families/'))
        .some(({ content }) => content.includes('/resolution')),
    ).toBe(false);
  });

  it('keeps Chart-wide schema aggregation on semantic owner barrels', async () => {
    const schemaFiles = [join(sourceRoot, 'schemas/chart.ts'), join(sourceRoot, 'schemas/internal.ts')];
    const contents = await Promise.all(schemaFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /families\/.*\/schema|internal\/fixture\/schema/.test(content))).toBe(false);
  });
});
