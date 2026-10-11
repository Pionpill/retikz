import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

it('静态检查展开 include 后接受真实源码标题锚点，并保留绝对及页内断链', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'retikz-reference-includes-'));
  try {
    const directory = path.join(root, 'kernel/reference');
    mkdirSync(path.join(directory, '_includes'), { recursive: true });
    const page = path.join(directory, 'index.zh.mdx');
    writeFileSync(page, '{/* @include kernel/reference/generated */}', 'utf8');
    writeFileSync(
      path.join(directory, '_includes/generated.zh.mdx'),
      '#### <ApiSourceLink path="source.ts">IRValue</ApiSourceLink> / <ApiSourceLink>ValueSchema</ApiSourceLink>\n\n[valid](/kernel/reference#irvalue--valueschema)\n[broken](#missing)\n[broken route](/kernel/missing)',
      'utf8',
    );
    const checker = path.resolve(import.meta.dirname, '../scripts/check-doc-reference-includes.mjs');
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `import { validateReferenceIncludes } from ${JSON.stringify(`file:///${checker.replaceAll('\\', '/')}`)}; const [root,page] = process.argv.slice(1); console.log(JSON.stringify(validateReferenceIncludes([page + ': anchor does not exist: /kernel/reference#irvalue--valueschema', page + ': anchor does not exist: /kernel/reference#missing'], [page], root)));`,
          root,
          page,
        ],
        { encoding: 'utf8' },
      ),
    );
    expect(result).toHaveLength(3);
    expect(result.join('\n')).not.toContain('irvalue--valueschema');
    expect(result.join('\n')).toContain('included anchor does not exist: #missing');
    expect(result.join('\n')).toContain('included route does not exist: /kernel/missing');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
