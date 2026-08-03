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

const showcasePage = ({
  family = 'point',
  usage = 'distribution',
  examplePreview = 'scatter-basic',
  attachedFile = 'scatter-basic.data.ts',
  controls = 'scatter-basic',
} = {}) => `---
title: Scatter
description: Scatter showcase
family: ${family}
usage: ${usage}
---

<ShowcaseGallery
  examples={[
    {
      id: 'scatter-basic',
      title: 'Basic scatter',
      description: 'Compare two variables.',
      preview: {
        files: ['${examplePreview}', '${attachedFile}'],
        controls: { name: '${controls}' },
        size: 'xl',
      },
    },
  ]}
>
  ## API
</ShowcaseGallery>
`;

const showcaseData = ({ includeShowcase = true, includePreview = true, metadataPreview = 'scatter-basic' } = {}) => `
export const vizSection = [
  {
    id: 'chart',
    pages: [
      {
        id: 'points',
        children: [
          {
            id: 'scatter',
            meta: {
              layout: 'showcase',
              ${
                includeShowcase
                  ? `showcase: {
                family: 'points',
                role: 'primary',
                ${includePreview ? `preview: '${metadataPreview}',` : ''}
                order: 10,
              },`
                  : ''
              }
            },
          },
        ],
      },
    ],
  },
];
`;

const writeShowcaseTaxonomy = fixture =>
  fixture.write(
    'apps/docs/src/modules/docs/components/showcase/frontmatter.ts',
    `export const ShowcaseFamily = { Point: 'point' } as const;\nexport const ShowcaseUsage = { Distribution: 'distribution' } as const;\n`,
  );

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

test('reports a Showcase metadata preview that does not resolve in the page directory', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage();
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.data.ts',
      'export const data = [];\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.controls.ts',
      'export const controls = {};\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.controls.ts',
      'export const controls = {};\n',
    );
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData({ metadataPreview: 'missing-preview' }));
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });

    assert.match(
      result.errors.join('\n'),
      /contents\/viz\/chart\/points\/scatter\/index\.zh\.mdx: showcase\.preview: demo does not exist: missing-preview/i,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('reports missing Showcase Gallery attached files and localized controls with field paths', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage({ attachedFile: 'missing.data.ts', controls: 'missing-controls' });
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData());
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });
    const errors = result.errors.join('\n');

    assert.match(errors, /index\.en\.mdx: examples\[0\]\.preview\.files\[1\]: file does not exist: missing\.data\.ts/i);
    assert.match(
      errors,
      /index\.en\.mdx: examples\[0\]\.preview\.controls\.name: controls do not exist: missing-controls/i,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('reports invalid Showcase frontmatter taxonomy values with field paths', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage({ family: 'unknown-family', usage: 'unknown-usage' });
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.data.ts',
      'export const data = [];\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.controls.ts',
      'export const controls = {};\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.controls.ts',
      'export const controls = {};\n',
    );
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData());
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });
    const errors = result.errors.join('\n');

    assert.match(errors, /index\.zh\.mdx: frontmatter\.family: unsupported value: unknown-family/i);
    assert.match(errors, /index\.zh\.mdx: frontmatter\.usage: unsupported value: unknown-usage/i);
  } finally {
    await fixture.cleanup();
  }
});

test('reports Showcase layout without showcase metadata in docs data', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage();
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData({ includeShowcase: false }));
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });

    assert.match(
      result.errors.join('\n'),
      /apps\/docs\/src\/modules\/docs\/data\/viz\.ts: \/viz\/chart\/points\/scatter\.meta\.showcase: metadata is required/i,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('reports Showcase metadata without a static preview in docs data', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage();
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData({ includePreview: false }));
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });

    assert.match(
      result.errors.join('\n'),
      /apps\/docs\/src\/modules\/docs\/data\/viz\.ts: \/viz\/chart\/points\/scatter\.meta\.showcase\.preview: string literal is required/i,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('reports missing English Showcase controls instead of falling back to the Chinese base file', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage();
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.demo.tsx',
      'export default () => null;\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.data.ts',
      'export const data = [];\n',
    );
    await fixture.write(
      'apps/docs/src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.controls.ts',
      'export const controls = {};\n',
    );
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData());
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });

    assert.match(
      result.errors.join('\n'),
      /index\.en\.mdx: examples\[0\]\.preview\.controls\.name: controls do not exist: scatter-basic/i,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('reports Showcase example syntax that cannot be checked statically', async () => {
  const fixture = await createFixture();
  try {
    const content = showcasePage()
      .replace('examples={[\n    {', 'examples={[\n    ...sharedExamples,\n    {')
      .replace("files: ['scatter-basic', 'scatter-basic.data.ts']", 'files: previewFiles');
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.en.mdx', content);
    await fixture.write('apps/docs/src/modules/docs/data/viz.ts', showcaseData());
    await writeShowcaseTaxonomy(fixture);

    const result = await auditDocs({
      contentsRoot: fixture.contentsRoot,
      repoRoot: fixture.repoRoot,
      scope: 'viz/chart/points',
    });
    const errors = result.errors.join('\n');

    assert.match(errors, /index\.zh\.mdx: examples\[0\]: static object is required/i);
    assert.match(errors, /index\.zh\.mdx: examples\[1\]\.preview\.files: static string or array is required/i);
  } finally {
    await fixture.cleanup();
  }
});
