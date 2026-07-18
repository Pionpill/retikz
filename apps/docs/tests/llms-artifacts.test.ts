import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { collectDocManifest, writeDocArtifacts } from '../scripts/docs-manifest';
import { generateLlmsTxt } from '../scripts/gen-llms-txt';

const docsRoot = path.resolve(import.meta.dirname, '..');
const tempDirs: Array<string> = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('LLM documentation artifacts', () => {
  it('把分组落地页和显式页型归一到 manifest', () => {
    const manifest = collectDocManifest(docsRoot);
    const byPath = new Map(manifest.map(entry => [entry.path, entry]));

    expect(byPath.get('/kernel/concepts')).toMatchObject({ pageType: 'group', audience: 'user' });
    expect(byPath.get('/kernel/components/layout')).toMatchObject({ pageType: 'group' });
    expect(byPath.get('/kernel/components/shapes/custom-shape')).toMatchObject({
      pageType: 'extension',
      audience: 'extension-author',
      capability: 'kernel.shape',
    });
    expect(byPath.get('/kernel/reference/runtime/extensions')).toMatchObject({
      pageType: 'reference',
      audience: 'extension-author',
      capability: 'kernel.extensions',
    });
  });

  it('为 Kernel 每页提供双语原始 MDX URL，并正确去除 frontmatter 引号', () => {
    const kernelEntries = collectDocManifest(docsRoot).filter(entry => entry.module === 'kernel');
    const layout = kernelEntries.find(entry => entry.path === '/kernel/components/layout');

    expect(kernelEntries.length).toBeGreaterThan(70);
    expect(kernelEntries.every(entry => entry.content.zh?.url.endsWith('index.zh.mdx'))).toBe(true);
    expect(kernelEntries.every(entry => entry.content.en?.url.endsWith('index.en.mdx'))).toBe(true);
    expect(kernelEntries.every(entry => entry.content.zh?.description && entry.content.en?.description)).toBe(true);
    expect(layout?.content.en?.description.startsWith("'")).toBe(false);
  });

  it('把同页 demo、data 与 controls 作为 LLM 可读取的配套源码', () => {
    const pathPage = collectDocManifest(docsRoot).find(entry => entry.path === '/viz/grammar/mark/path');

    expect(pathPage?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: expect.stringMatching(/\/line-curve\.demo\.tsx$/) }),
        expect.objectContaining({ url: expect.stringMatching(/\/line-curve\.controls\.ts$/) }),
      ]),
    );
  });

  it('llms.txt 链接原始内容、保留交互页入口，并收录分组页', () => {
    const text = generateLlmsTxt(docsRoot);

    expect(text).toContain('AI-native drawing and visualization toolkit');
    expect(text).toContain('https://pionpill.github.io/retikz/llms/kernel/components/layout/index.en.mdx');
    expect(text).toContain('Interactive: https://pionpill.github.io/retikz/kernel/components/layout');
    expect(text).not.toContain('TikZ React adapter');
  });

  it('写出 manifest 与不依赖 SPA 的原始 MDX', () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'retikz-llms-'));
    tempDirs.push(outDir);

    writeDocArtifacts(docsRoot, outDir);

    const manifestPath = path.join(outDir, 'manifest.json');
    const rawPath = path.join(outDir, 'kernel', 'components', 'layout', 'index.en.mdx');
    const demoPath = path.join(outDir, 'kernel', 'concepts', 'design', 'principles', 'principles-compile.demo.tsx');
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(rawPath)).toBe(true);
    expect(existsSync(demoPath)).toBe(true);
    expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/kernel/components/layout', pageType: 'group' })]),
    );
    expect(readFileSync(rawPath, 'utf8')).toContain('title: Layout');
  });
});
