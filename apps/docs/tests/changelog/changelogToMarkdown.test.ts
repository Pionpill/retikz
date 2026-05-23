import { describe, expect, it } from 'vitest';
import type { Release } from '@/data/changelog.types';
import { changelogToMarkdown } from '@/components/shared/changelog/changelogToMarkdown';

const fixture: Array<Release> = [
  {
    minor: 'v0.2',
    stableDate: null,
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.2',
        description: { zh: '核心摘要', en: 'core summary' },
        highlights: [
          { label: { zh: '形状注册', en: 'Shape registry' }, content: { zh: '可注册', en: 'registrable' } },
        ],
        subVersions: [
          {
            version: 'alpha.3',
            date: '2026-05-23',
            items: [{ label: { zh: '开放 string', en: 'open string' }, content: { zh: 'shape 字段', en: 'shape field' } }],
          },
        ],
      },
    ],
  },
];

describe('changelogToMarkdown', () => {
  it('按里程碑→包→highlights→预发布序列化中文', () => {
    const md = changelogToMarkdown(fixture, 'zh');
    expect(md).toContain('## v0.2（开发中）');
    expect(md).toContain('### @retikz/core v0.2');
    expect(md).toContain('核心摘要');
    expect(md).toContain('- **形状注册：** 可注册');
    expect(md).toContain('#### alpha.3 — 2026-05-23');
    expect(md).toContain('- **开放 string：** shape 字段');
  });

  it('英文走 en 字段 + 英文"开发中"', () => {
    const md = changelogToMarkdown(fixture, 'en');
    expect(md).toContain('## v0.2 (in development)');
    expect(md).toContain('- **Shape registry:** registrable');
  });

  it('有 stableDate 时标题带日期', () => {
    const md = changelogToMarkdown(
      [{ minor: 'v0.1', stableDate: '2026-05-20', packages: [] }],
      'zh',
    );
    expect(md).toContain('## v0.1（2026-05-20）');
  });
});
