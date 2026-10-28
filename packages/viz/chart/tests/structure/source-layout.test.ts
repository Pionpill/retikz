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

describe('Chart 语义源布局', () => {
  it('使通用 Chart 所属模块独立于具体系列', async () => {
    const files = await sourceFilesUnder(sourceRoot);
    const normalizedPathOf = (path: string): string => relative(sourceRoot, path).replaceAll('\\', '/');
    const chartFiles = files.filter(path => normalizedPathOf(path).startsWith('_chart/'));
    const contents = (await Promise.all(chartFiles.map(path => readFile(path, 'utf8')))).join('\n');

    expect(contents).not.toMatch(/from ['"][^'"]*\/point(?:\/|['"])/);
    expect(contents).not.toMatch(/\bChartCatalog\b|\bChartFamilyDefinition\b|\bPointChartSchema\b/);
  });

  it('使系列模块独立于提供者查找状态', async () => {
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
