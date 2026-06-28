import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '../../..');

const workspaceSrcRoots = [join(repoRoot, 'packages'), join(repoRoot, 'apps')]
  .filter(root => existsSync(root))
  .flatMap(root =>
    readdirSync(root)
      .map(group => join(root, group))
      .filter(groupPath => statSync(groupPath).isDirectory())
      .flatMap(groupPath =>
        readdirSync(groupPath)
          .map(workspace => join(groupPath, workspace, 'src'))
          .filter(srcPath => existsSync(srcPath) && statSync(srcPath).isDirectory()),
      ),
  );

const collectTsFiles = (dir: string): Array<string> =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      return collectTsFiles(full);
    }

    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });

const deprecatedNumberRefinement = [
  String.fromCharCode(46),
  'finite',
  String.fromCharCode(40),
  String.fromCharCode(41),
].join('');

describe('Zod number schemas', () => {
  it('does not use deprecated finite number refinements in source files', () => {
    const offenders = workspaceSrcRoots
      .flatMap(collectTsFiles)
      .filter(file => readFileSync(file, 'utf8').includes(deprecatedNumberRefinement))
      .map(file => relative(repoRoot, file).replaceAll('\\', '/'));

    expect(offenders).toEqual([]);
  });
});
