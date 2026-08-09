import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { runLayoutPackageBoundary } from '../../../layout/tests/inspect/isolated-consumer';

describe('@retikz/layout-react optional inspect boundary', () => {
  it('根入口不转导可选 Inspect，manifest 提供独立子入口', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    expect(Object.keys(manifest.exports)).toEqual(['.', './inspect']);
    expect(readFileSync(new URL('../../src/index.ts', import.meta.url), 'utf8')).not.toMatch(/inspect/i);
  });

  it('在隔离 consumer 中验证根入口、缺失 peer 与安装 peer 三态', () => {
    const result = runLayoutPackageBoundary(
      fileURLToPath(new URL('../../', import.meta.url)),
      '@retikz/layout-react',
      "if (!imported.createLayoutReactAuthoring({ namespace: 'test', name: 'item' }, true)) process.exit(9);",
    );
    expect(result.rootWithoutPeer).toMatchObject({ status: 0 });
    expect(result.inspectWithoutPeer.status).not.toBe(0);
    expect(result.inspectWithoutPeer.stderr).toContain('@retikz/inspect');
    expect(result.inspectWithPeer).toMatchObject({ status: 0 });
  });
});
