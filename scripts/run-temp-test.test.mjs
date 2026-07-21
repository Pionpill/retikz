import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { resolveTemporaryTest, runTemporaryTest } from './run-temp-test.mjs';

const createFixture = async () => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'retikz-temp-test-'));
  const workspace = 'apps/docs';
  const workspaceRoot = path.join(repositoryRoot, workspace);
  const scratchRoot = path.join(workspaceRoot, 'tests', '_scratch');
  const file = 'tests/_scratch/preview-controls.test.ts';
  const filePath = path.join(workspaceRoot, file);

  await mkdir(scratchRoot, { recursive: true });
  await writeFile(filePath, 'export {};\n', 'utf8');

  return {
    repositoryRoot,
    workspace,
    file,
    filePath,
    scratchRoot,
  };
};

test('resolves only a temporary test below the selected workspace scratch directory', async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repositoryRoot, { recursive: true, force: true }));

  assert.deepEqual(
    resolveTemporaryTest({
      repositoryRoot: fixture.repositoryRoot,
      workspace: fixture.workspace,
      file: fixture.file,
    }),
    {
      workspaceRoot: path.join(fixture.repositoryRoot, fixture.workspace),
      scratchRoot: fixture.scratchRoot,
      filePath: fixture.filePath,
      testFile: fixture.file,
    },
  );

  assert.throws(
    () =>
      resolveTemporaryTest({
        repositoryRoot: fixture.repositoryRoot,
        workspace: fixture.workspace,
        file: 'tests/preview-controls.test.ts',
      }),
    /tests[\\/]_scratch/,
  );
});

test('rejects a scratch junction that resolves outside the repository', async t => {
  const fixture = await createFixture();
  const externalScratchRoot = await mkdtemp(path.join(os.tmpdir(), 'retikz-temp-test-external-'));
  const externalFilePath = path.join(externalScratchRoot, 'preview-controls.test.ts');
  t.after(() => rm(fixture.repositoryRoot, { recursive: true, force: true }));
  t.after(() => rm(externalScratchRoot, { recursive: true, force: true }));

  await rm(fixture.scratchRoot, { recursive: true, force: true });
  await symlink(externalScratchRoot, fixture.scratchRoot, 'junction');
  await writeFile(externalFilePath, 'export {};\n', 'utf8');

  assert.throws(
    () =>
      resolveTemporaryTest({
        repositoryRoot: fixture.repositoryRoot,
        workspace: fixture.workspace,
        file: fixture.file,
      }),
    /resolves outside the workspace/,
  );

  assert.equal(existsSync(externalFilePath), true);
});

test('removes the temporary test after a successful run and prunes its empty scratch directory', async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repositoryRoot, { recursive: true, force: true }));

  await runTemporaryTest({
    repositoryRoot: fixture.repositoryRoot,
    workspace: fixture.workspace,
    file: fixture.file,
    run: async () => 0,
  });

  assert.equal(existsSync(fixture.filePath), false);
  assert.equal(existsSync(fixture.scratchRoot), false);
});

test('removes the temporary test after a failed run before forwarding the failure', async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repositoryRoot, { recursive: true, force: true }));
  const failure = new Error('expected test failure');

  await assert.rejects(
    () =>
      runTemporaryTest({
        repositoryRoot: fixture.repositoryRoot,
        workspace: fixture.workspace,
        file: fixture.file,
        run: async () => {
          throw failure;
        },
      }),
    failure,
  );

  assert.equal(existsSync(fixture.filePath), false);
  assert.equal(existsSync(fixture.scratchRoot), false);
});

test('keeps the temporary test only when explicitly requested', async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.repositoryRoot, { recursive: true, force: true }));

  await runTemporaryTest({
    repositoryRoot: fixture.repositoryRoot,
    workspace: fixture.workspace,
    file: fixture.file,
    keep: true,
    run: async () => 0,
  });

  assert.equal(existsSync(fixture.filePath), true);
});
