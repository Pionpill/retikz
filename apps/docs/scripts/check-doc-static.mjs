import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (result.errors.length > 0) {
  console.error(`Docs integrity failed (${result.errors.length} issues):`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Docs integrity passed (${result.checkedPages} pages, scope: ${scope}).`);
}
