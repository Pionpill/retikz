import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { runStandardPackageBoundary } from './isolated-consumer';

type PackageManifest = {
  exports: Record<string, unknown>;
  publishConfig: { exports: Record<string, unknown> };
};

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as PackageManifest;
const packageRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('@retikz/standard optional inspect boundary', () => {
  it('publishes independent root and inspect entries', () => {
    expect(Object.keys(manifest.exports)).toEqual(['.', './inspect']);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.', './inspect']);
    expect(readFileSync(new URL('../../src/index.ts', import.meta.url), 'utf8')).not.toMatch(/inspect/);
  });

  it('在隔离 consumer 中验证根入口、缺失 peer 与安装 peer 三态', () => {
    const result = runStandardPackageBoundary(
      packageRoot,
      '@retikz/standard',
      "if (imported.createLayoutInspectionBarrier({ kind: 'scene' }).rules.length !== 1) process.exit(9);",
    );
    expect(result.rootWithoutPeer).toMatchObject({ status: 0 });
    expect(result.inspectWithoutPeer.status).not.toBe(0);
    expect(result.inspectWithoutPeer.stderr).toContain('@retikz/inspect');
    expect(result.inspectWithPeer).toMatchObject({ status: 0 });
  });
});
