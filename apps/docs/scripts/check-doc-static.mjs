import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateReferenceIncludes } from './check-doc-reference-includes.mjs';

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const repoRoot = resolve(docsRoot, '..', '..');

process.chdir(repoRoot);

const { auditDocs } = await import('../../../.agents/skills/docs-doc-principle/scripts/check-doc-integrity.mjs');

const scopeIndex = process.argv.findIndex(arg => arg === '--scope');

const scope = scopeIndex >= 0 ? (process.argv[scopeIndex + 1] ?? '.') : '.';

const result = await auditDocs({
  contentsRoot: resolve(docsRoot, 'src/modules/docs/contents'),
  repoRoot,
  scope,
});

const contentsRoot = resolve(docsRoot, 'src/modules/docs/contents');
const pages = execFileSync('rg', ['--files', resolve(contentsRoot, scope)], { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/u)
  .filter(file => /index\.(zh|en)\.mdx$/u.test(file));
result.errors = validateReferenceIncludes(result.errors, pages, contentsRoot);

if (result.errors.length > 0) {
  console.error(`Docs integrity failed (${result.errors.length} issues):`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Docs integrity passed (${result.checkedPages} pages, scope: ${scope}).`);
}
