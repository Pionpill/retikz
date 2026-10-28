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

test('接受结构对齐的双语页面', async () => {
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

test('接受单个本地化的 ComponentPreview 插图', async () => {
  const fixture = await createFixture();

  try {
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.zh.mdx', validPage());
    await fixture.write('apps/docs/src/modules/docs/contents/kernel/components/example/index.en.mdx', validPage());
    await fixture.write(
      'apps/docs/src/modules/docs/contents/kernel/components/example/basic.tsx',
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

test('报告博客以外页面缺少对应英文页面的问题', async () => {
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

test('报告内部锚点损坏', async () => {
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

test('接受显式 HTML id 作为锚点目标', async () => {
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

test('接受已注册且没有 MDX 文件的数据驱动路由', async () => {
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

test('报告 SourceLinks 范围超出目标文件', async () => {
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

test('报告缺少 ComponentPreview 演示文件', async () => {
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

test('报告在页面目录中无法解析的 Showcase 元数据预览', async () => {
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

test('报告 Showcase Gallery 缺少附属文件或本地化控件的问题并给出字段路径', async () => {
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

test('报告 Showcase frontmatter 分类值无效的问题并给出字段路径', async () => {
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

test('报告使用 Showcase 布局但文档数据缺少 showcase 元数据的问题', async () => {
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

test('报告存在 Showcase 元数据但文档数据缺少静态预览的问题', async () => {
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

test('报告缺少英文 Showcase 控件，而不是回退到中文基本文件', async () => {
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

test('报告无法静态检查的 Showcase 示例语法', async () => {
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
