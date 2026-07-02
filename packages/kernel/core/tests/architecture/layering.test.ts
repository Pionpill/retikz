import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');

const tsFiles = (dir: string): Array<string> => {
  const entries = readdirSync(dir);
  const files: Array<string> = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...tsFiles(path));
    } else if (entry.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
};

const importDeclarations = (file: string): Array<string> =>
  Array.from(
    readFileSync(file, 'utf8').matchAll(/(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+['"][^'"]+['"];?/gu),
    match => match[0],
  );

const importSource = (declaration: string): string | undefined =>
  declaration.match(/\sfrom\s+['"]([^'"]+)['"]/)?.[1];

const importsFromOwner = (file: string, declaration: string, owner: 'geometry' | 'primitive'): boolean => {
  const source = importSource(declaration);
  if (!source?.startsWith('.')) return false;

  const ownerRoot = join(SRC_ROOT, owner);
  const target = join(dirname(file), source);
  return target === ownerRoot || target.startsWith(`${ownerRoot}${sep}`);
};

const importsFromSchemaSubmodule = (file: string, declaration: string): boolean => {
  const source = importSource(declaration);
  if (!source?.startsWith('.')) return false;

  const schemaRoot = join(SRC_ROOT, 'schemas');
  const target = join(dirname(file), source);
  return target.startsWith(`${schemaRoot}${sep}`);
};

describe('core layer import boundaries', () => {
  it('does not keep legacy primitive or geometry owner directories', () => {
    const legacyOwners = ['primitive', 'geometry'].filter(owner => existsSync(join(SRC_ROOT, owner)));

    expect(legacyOwners).toEqual([]);
  });

  it('contract code does not import from legacy primitive owner paths', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'contract'))
      .filter(file => !relative(join(SRC_ROOT, 'contract'), file).replace(/\\/g, '/').startsWith('scene/'))
      .flatMap(file =>
        importDeclarations(file)
          .filter(line => importsFromOwner(file, line, 'primitive'))
          .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
      );

    expect(offenders).toEqual([]);
  });

  it('contract code does not import from legacy geometry owner paths', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'contract')).flatMap(file =>
      importDeclarations(file)
        .filter(line => importsFromOwner(file, line, 'geometry'))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('shared code does not import upward into schemas, contract, providers, primitive, or compile', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'shared')).flatMap(file =>
      importDeclarations(file)
        .filter(line => /from ['"].*(schemas|contract|providers|primitive|compile)/.test(line))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('source code outside schemas imports schemas through the owner barrel', () => {
    const offenders = tsFiles(SRC_ROOT)
      .filter(file => !relative(SRC_ROOT, file).replace(/\\/g, '/').startsWith('schemas/'))
      .flatMap(file =>
        importDeclarations(file)
          .filter(line => importsFromSchemaSubmodule(file, line))
          .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
      );

    expect(offenders).toEqual([]);
  });

  it('scene contracts reuse schema field-level types for shared vocabulary', () => {
    const sceneRoot = join(SRC_ROOT, 'contract', 'scene');
    const forbiddenPatterns = [
      { label: 'position tuple', pattern: /\[number,\s*number\]/u },
      { label: 'clip fill rule union', pattern: /'nonzero'\s*\|\s*'evenodd'/u },
      { label: 'path line cap union', pattern: /'butt'\s*\|\s*'round'\s*\|\s*'square'/u },
      { label: 'path line join union', pattern: /'miter'\s*\|\s*'round'\s*\|\s*'bevel'/u },
      { label: 'font style union', pattern: /'normal'\s*\|\s*'italic'\s*\|\s*'oblique'/u },
      { label: 'font weight primitive union', pattern: /fontWeight\??:\s*string\s*\|\s*number/u },
      { label: 'font family primitive', pattern: /fontFamily\??:\s*string/u },
    ];

    const offenders = tsFiles(sceneRoot).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return forbiddenPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${relative(SRC_ROOT, file)}: ${label}`);
    });

    expect(offenders).toEqual([]);
  });

  it('scene contracts do not rename whole IR branches as Scene-owned types', () => {
    const sceneRoot = join(SRC_ROOT, 'contract', 'scene');
    const forbiddenPatterns = [
      { label: 'direct IR branch alias', pattern: /export type \w+ = IR\w+/u },
      { label: 'extracted IR branch alias', pattern: /export type \w+ = Extract<IR\w+/u },
      { label: 'omitted IR branch alias', pattern: /export type \w+ = Omit<IR\w+/u },
    ];

    const offenders = tsFiles(sceneRoot).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return forbiddenPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${relative(SRC_ROOT, file)}: ${label}`);
    });

    expect(offenders).toEqual([]);
  });

  it('implementation code imports scene types from contract/scene instead of legacy primitive paths', () => {
    const offenders = tsFiles(SRC_ROOT).flatMap(file =>
      importDeclarations(file)
        .filter(line => importsFromOwner(file, line, 'primitive'))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('implementation code imports geometry helpers from shared/geometry instead of legacy geometry paths', () => {
    const offenders = tsFiles(SRC_ROOT).flatMap(file =>
      importDeclarations(file)
        .filter(line => importsFromOwner(file, line, 'geometry'))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('compile code does not import provider shape internals', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'compile')).flatMap(file =>
      importDeclarations(file)
        .filter(line => /from ['"].*providers\/shape\//.test(line.replace(/\\/g, '/')))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });
});
