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
  it('uses the base, shared, and Point family owners without legacy routes', async () => {
    const paths = (await sourceFilesUnder(sourceRoot)).map(path => relative(sourceRoot, path).replaceAll('\\', '/'));

    expect(paths.some(path => path.startsWith('base/'))).toBe(true);
    expect(paths.some(path => path.startsWith('shared/'))).toBe(true);
    expect(paths.some(path => path.startsWith('point/'))).toBe(true);
    expect(paths.some(path => path.startsWith('families/') || path.startsWith('resolution/'))).toBe(false);
    expect(
      paths.some(path => path.startsWith('schemas/') || path.startsWith('presentation/') || path.startsWith('style/')),
    ).toBe(false);
  });

  it('keeps base independent from the Point family', async () => {
    const baseFiles = await sourceFilesUnder(join(sourceRoot, 'base'));
    const contents = await Promise.all(baseFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"].*\/point(?:\/|['"])/.test(content))).toBe(false);
  });

  it('keeps shared independent from base and Point owners', async () => {
    const sharedFiles = await sourceFilesUnder(join(sourceRoot, 'shared'));
    const contents = await Promise.all(sharedFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"].*\/(base|point)(?:\/|['"])/.test(content))).toBe(false);
  });

  it('lets the Point family consume base and shared through their owner barrels', async () => {
    const pointFiles = await sourceFilesUnder(join(sourceRoot, 'point'));
    const contents = await Promise.all(pointFiles.map(path => readFile(path, 'utf8')));

    expect(contents.some(content => /from ['"].*\/(base|shared)(?:\/|['"])/.test(content))).toBe(true);
    expect(contents.some(content => /from ['"].*\/(base|shared)\/[^'"/]+\//.test(content))).toBe(false);
  });
});
