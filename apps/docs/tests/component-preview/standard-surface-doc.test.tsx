import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Layout } from '@retikz/react';
import { Grid, Surface } from '@retikz/standard-react/presentation';
import { SurfaceSchema } from '@retikz/standard/presentation';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '@/modules/docs/components/component-preview/vanilla-preview';
import SurfaceBasicDemo from '@/modules/docs/contents/library/standard/presentation/surface/surface-basic.demo';
import SurfaceOverflowEnDemo from '@/modules/docs/contents/library/standard/presentation/surface/surface-overflow.en.demo';
import SurfaceOverflowZhDemo from '@/modules/docs/contents/library/standard/presentation/surface/surface-overflow.zh.demo';
import { librarySection } from '@/modules/docs/data/library';

const surfaceRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/standard/presentation/surface');
const readPage = (language: 'zh' | 'en'): string => readFileSync(resolve(surfaceRoot, `index.${language}.mdx`), 'utf8');

describe('Standard Surface documentation', () => {
  it('generates nested Grid authoring code and renders the Surface composition through Vanilla', () => {
    const vanilla = buildVanillaPreview(
      buildPreviewIR(() => (
        <Layout>
          <Surface padding={12}>
            <Grid bounds={{ start: [-100, -60], end: [100, 60] }} />
          </Surface>
        </Layout>
      )),
    );

    expect(vanilla.code).toContain('surfaceChild(grid(');
    expect(vanilla.code).toContain('GridInputEmbedAdapter');
    expect(vanilla.code).toContain('SurfaceInputEmbedAdapter');
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('<path');
  });

  it('registers the route after Frame in the presentation group and keeps both locale labels available', () => {
    const presentationPages = librarySection
      .find(section => section.id === 'standard')
      ?.pages.find(page => page.id === 'presentation')?.children;
    const ids = presentationPages?.map(node => node.id) ?? [];

    expect(ids.indexOf('surface')).toBe(ids.indexOf('frame') + 1);
    expect(readFileSync(resolve(process.cwd(), 'src/i18n/locales/zh.json'), 'utf8')).toContain(
      '"standardSurface": "表面"',
    );
    expect(readFileSync(resolve(process.cwd(), 'src/i18n/locales/en.json'), 'utf8')).toContain(
      '"standardSurface": "Surface"',
    );
  });

  it('documents the single Source schema, execution defaults, provider, and spatial handle in both languages', () => {
    for (const source of [readPage('zh'), readPage('en')]) {
      for (const value of [
        'SurfaceSchema',
        'SurfaceDefinition',
        'SurfaceProvider',
        'SurfaceInputEmbedAdapter',
        'surfaceChild',
        'surface-basic',
        'surface-overflow',
      ]) {
        expect(source).toContain(value);
      }
      expect(source).not.toContain('IRSurfaceSchema');
      expect(source).toContain('visible');
      expect(source).toContain('cornerRadius');
      expect(source).toContain('surface');
    }
  });

  it.each([SurfaceBasicDemo, SurfaceOverflowZhDemo, SurfaceOverflowEnDemo])(
    'derives sparse Source IR and a real Vanilla SVG for each demo',
    Demo => {
      const preview = buildPreviewIR(Demo);
      const surfaces = preview.ir.children.filter(
        child => 'namespace' in child && child.namespace === 'standard' && child.type === 'surface',
      );

      expect(surfaces.length).toBeGreaterThan(0);
      surfaces.forEach(surface =>
        expect(SurfaceSchema.parse(surface)).toEqual({ padding: 0, overflow: 'visible', cornerRadius: 0, ...surface }),
      );
      const vanilla = buildVanillaPreview(preview);
      expect(vanilla.code).toContain('surface(');
      expect(vanilla.code).toContain('surfaceChild(');
      expect(vanilla.svg).toContain('<svg');
    },
  );
});
