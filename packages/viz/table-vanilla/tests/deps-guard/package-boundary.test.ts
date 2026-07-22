import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type PackageManifest = Readonly<{
  name: string;
  retikz: Readonly<{
    domain: string;
    releaseGroup: string;
    layer: string;
    publishable: boolean;
  }>;
  dependencies: Readonly<Record<string, string>>;
}>;

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8')) as PackageManifest;

describe('@retikz/table-vanilla package boundary', () => {
  it('is a publishable viz adapter in the Table release group', () => {
    expect(manifest.name).toBe('@retikz/table-vanilla');
    expect(manifest.retikz).toEqual({
      domain: 'viz',
      releaseGroup: 'table',
      layer: 'adapter',
      publishable: true,
    });
  });

  it('depends on Table and Kernel Vanilla without taking React or Plot dependencies', () => {
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      '@retikz/core',
      '@retikz/data',
      '@retikz/table',
      '@retikz/vanilla',
    ]);
    expect(manifest.dependencies).not.toHaveProperty('@retikz/plot');
    expect(manifest.dependencies).not.toHaveProperty('react');
    expect(manifest.dependencies).not.toHaveProperty('react-dom');
  });
});
