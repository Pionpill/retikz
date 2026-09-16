import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createLayoutApiReferenceMdx } from '../../scripts/api-reference/layout';

describe('Layout API 公开范围', () => {
  it('只展示组件契约，保留字段类型并生成有效源码链接', async () => {
    const source = await createLayoutApiReferenceMdx('en');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    expect(headings).toContain('LayoutProps');
    expect(headings).toContain('Layout');
    expect(headings).not.toContain('Node');
    expect(headings).not.toContain('Scope');
    expect(source).toContain("IRScene['theme']");
    expect(source).toContain('`compileDriver?`');
    expect(source.replaceAll(/```[\s\S]*?```/g, '')).not.toMatch(/[\u3400-\u9fff]/u);
    const paths = [...source.matchAll(/path=\{"([^"}]+)"\}/g)].map(match => match[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect(existsSync(resolve('../..', path))).toBe(true);
  });
});
