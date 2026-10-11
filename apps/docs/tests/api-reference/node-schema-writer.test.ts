import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { nodeSchemas, writeNodeSchemaReferenceMdx } from '../../scripts/schema-reference/node';

it('节点 Schema 生成保留完整家族和共享边界标签契约的双语说明', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'retikz-node-schemas-'));
  try {
    writeNodeSchemaReferenceMdx(directory);
    for (const language of ['zh', 'en']) {
      const source = readFileSync(path.join(directory, `schemas.${language}.mdx`), 'utf8');
      expect([...source.matchAll(/<ZodSchema\b[\s\S]*?name="([^"]+)"/gu)].map(match => match[1]).toSorted()).toEqual(
        [...Object.keys(nodeSchemas), 'BoundaryLabelSchema'].toSorted(),
      );
      expect(source).toContain(
        language === 'zh' ? 'Ribbon 端点直接使用此 Schema' : 'Ribbon endpoints use this schema directly',
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
