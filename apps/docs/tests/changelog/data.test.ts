import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { changelog } from '@/data/changelog';
import { PACKAGE_IDS } from '@/data/changelog.types';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const Localized = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const ChangeItem: z.ZodType = z.lazy(() =>
  z.object({ label: Localized, content: Localized, children: z.array(ChangeItem).optional() }),
);
const SubVersion = z.object({
  version: z.string().min(1),
  date: z.string().regex(DATE),
  summary: Localized.optional(),
  items: z.array(ChangeItem),
});
const PackageBlock = z.object({
  pkg: z.enum(PACKAGE_IDS),
  version: z.string().min(1),
  description: z.object({ zh: z.string().min(1).max(200), en: z.string().min(1).max(200) }),
  highlights: z.array(ChangeItem),
  subVersions: z.array(SubVersion),
});
const Release = z.object({
  minor: z.string().min(1),
  stableDate: z.string().regex(DATE).nullable(),
  packages: z.array(PackageBlock),
});

describe('changelog data', () => {
  it('符合 schema(含 description ≤200 / 合法 pkg / YYYY-MM-DD)', () => {
    expect(() => z.array(Release).parse(changelog)).not.toThrow();
  });

  it('里程碑非空', () => {
    expect(changelog.length).toBeGreaterThan(0);
  });

  it('每个里程碑的 subVersions 日期倒序', () => {
    for (const release of changelog) {
      for (const block of release.packages) {
        const dates = block.subVersions.map(s => s.date);
        const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
        expect(dates, `${release.minor} ${block.pkg}`).toEqual(sorted);
      }
    }
  });
});
