import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { auditDocs } from './check-doc-integrity.mjs';

const createFixture = async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'retikz-doc-integrity-'));
  const contentsRoot = path.join(repoRoot, 'apps/docs/src/modules/docs/contents');

  const write = async (relativePath, content) => {
    const target = path.join(repoRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  };

  return {
    contentsRoot,
    repoRoot,
    write,
    cleanup: () => rm(repoRoot, { force: true, recursive: true }),
  };
};

const validPage = ({ anchor = 'api', sourcePath = 'packages/example.ts' } = {}) => `---
title: Example
description: Example page
---

## API

[API](/kernel/components/example#${anchor})

<ComponentPreview files="basic" />

<SourceLinks sources={[{ label: 'source', path: '${sourcePath}', startLine: 1, endLine: 2 }]} />
`;

test('accepts a structurally aligned bilingual page', async () => {
  const fixture = await createFixture();
  try {
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', validPage());
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', validPage());
    await fixture.write(
      'apps/docs/src/modules/docs/contents/kernel/components/example/basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write('packages/example.ts', 'export const a = 1;\nexport const b = 2;\n');

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedPages, 1);
  } finally {
    await fixture.cleanup();
  }
});

test('reports a missing English peer outside blog', async () => {
  const fixture = await createFixture();
  try {
    await fixture.write(
      'apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx',
      '---\ntitle: Example\ndescription: Example page\n---\n',
    );

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.match(result.errors.join('\n'), /missing bilingual peer.*index\.en\.mdx/i);
  } finally {
    await fixture.cleanup();
  }
});

test('reports broken internal anchors', async () => {
  const fixture = await createFixture();
  try {
    const content = validPage({ anchor: 'missing' });
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/kernel/components/example/basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write('packages/example.ts', 'export const a = 1;\nexport const b = 2;\n');

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.match(result.errors.join('\n'), /anchor.*missing/i);
  } finally {
    await fixture.cleanup();
  }
});

test('accepts an explicit HTML id as an anchor target', async () => {
  const fixture = await createFixture();
  try {
    const content = validPage({ anchor: 'betweenposition' }).replace(
      '## API',
      '## API\n\n<span id="betweenposition"></span>',
    );
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/kernel/components/example/basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write('packages/example.ts', 'export const a = 1;\nexport const b = 2;\n');

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.deepEqual(result.errors, []);
  } finally {
    await fixture.cleanup();
  }
});

test('accepts a registered data-driven route without an MDX file', async () => {
  const fixture = await createFixture();
  try {
    const content = `---
title: Example
description: Example page
---

## Related

[Changelog](/kernel/releases/changelog)
`;
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/data/kernel.ts',
      `export const kernelSection = [{ id: 'releases', pages: [{ id: 'changelog' }] }];\n`,
    );

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.deepEqual(result.errors, []);
  } finally {
    await fixture.cleanup();
  }
});

test('reports SourceLinks ranges beyond the target file', async () => {
  const fixture = await createFixture();
  try {
    const content = validPage().replace('endLine: 2', 'endLine: 3');
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/kernel/components/example/basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write('packages/example.ts', 'export const a = 1;\nexport const b = 2;\n');

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.match(result.errors.join('\n'), /endLine 3 exceeds 2 lines/i);
  } finally {
    await fixture.cleanup();
  }
});

test('reports a missing ComponentPreview demo file', async () => {
  const fixture = await createFixture();
  try {
    const content = validPage();
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', content);
    await fixture.write('packages/example.ts', 'export const a = 1;\nexport const b = 2;\n');

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'kernel/components',
    });

    assert.match(result.errors.join('\n'), /ComponentPreview demo.*basic/i);
  } finally {
    await fixture.cleanup();
  }
});
