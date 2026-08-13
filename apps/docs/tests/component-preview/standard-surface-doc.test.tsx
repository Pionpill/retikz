import { SurfaceSchema } from '@retikz/standard';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '@/modules/docs/components/component-preview/vanilla-preview';
import SurfaceBasicDemo from '@/modules/docs/contents/library/standard/composite/surface/surface-basic.demo';
import SurfaceOverflowEnDemo from '@/modules/docs/contents/library/standard/composite/surface/surface-overflow.en.demo';
import SurfaceOverflowZhDemo from '@/modules/docs/contents/library/standard/composite/surface/surface-overflow.zh.demo';
import { librarySection } from '@/modules/docs/data/library';

const surfaceRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/standard/composite/surface');
const readPage = (language: 'zh' | 'en'): string => readFileSync(resolve(surfaceRoot, `index.${language}.mdx`), 'utf8');

describe('Standard Surface documentation', () => {
  it('registers the route after Frame and keeps both locale labels available', () => {
    const composites = librarySection
      .find(section => section.id === 'standard')
      ?.pages.find(page => page.id === 'composite')?.children;
    const ids = composites?.map(node => node.id) ?? [];

    expect(ids.indexOf('surface')).toBe(ids.indexOf('frame') + 1);
    expect(readFileSync(resolve(process.cwd(), 'src/i18n/locales/zh.json'), 'utf8')).toContain(
      '"standardSurface": "表面"',
    );
    expect(readFileSync(resolve(process.cwd(), 'src/i18n/locales/en.json'), 'utf8')).toContain(
      '"standardSurface": "Surface"',
    );
  });

  it('documents the public paths, canonical defaults, provider, and spatial handle in both languages', () => {
    for (const source of [readPage('zh'), readPage('en')]) {
      for (const value of [
        'SurfaceSchema',
        'IRSurfaceSchema',
        'SurfaceDefinition',
        'SurfaceProvider',
        'SurfaceVanillaAdapter',
        'surfaceChild',
        'surface-basic',
        'surface-overflow',
      ]) {
        expect(source).toContain(value);
      }
      expect(source).toContain('visible');
      expect(source).toContain('cornerRadius');
      expect(source).toContain('surface');
    }
  });

  it.each([SurfaceBasicDemo, SurfaceOverflowZhDemo, SurfaceOverflowEnDemo])(
    'derives canonical IR and a real Vanilla SVG for each demo',
    Demo => {
      const preview = buildPreviewIR(Demo);
      const surfaces = preview.ir.children.filter(
        child => 'namespace' in child && child.namespace === 'standard' && child.type === 'surface',
      );

      expect(surfaces.length).toBeGreaterThan(0);
      surfaces.forEach(surface => expect(SurfaceSchema.parse(surface)).toEqual(surface));
      const vanilla = buildVanillaPreview(preview);
      expect(vanilla.code).toContain('surface(');
      expect(vanilla.code).toContain('surfaceChild(');
      expect(vanilla.svg).toContain('<svg');
    },
  );
});
