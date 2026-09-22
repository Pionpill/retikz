import { runInNewContext } from 'node:vm';

import * as clip from '@retikz/extension';
import * as inspect from '@retikz/inspect';
import type { InspectLayoutProps } from '@retikz/inspect/react';
import * as inspectVanilla from '@retikz/inspect/vanilla';
import { createInputScene } from '@retikz/react';
import * as vanilla from '@retikz/vanilla';
import { isValidElement } from 'react';
import { ModuleKind, transpileModule } from 'typescript';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import {
  availableSourceViews,
  buildPreviewSource,
} from '../../src/modules/docs/components/component-preview/source-panel';
import * as theme from '../../src/modules/docs/components/component-preview/theme';
import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview/types';
import * as measure from '../../src/modules/docs/components/component-preview/vanilla-preview';
import Demo2, {
  createPreviewControlContract as contract2,
  previewSource as source2,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-arc';
import Demo5, {
  createPreviewControlContract as contract5,
  previewSource as source5,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-clip';
import Demo7, {
  createPreviewControlContract as contract7,
  previewSource as source7,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-coordinate';
import Demo1, {
  createPreviewControlContract as contract1,
  previewSource as source1,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-cubic';
import Demo3, {
  createPreviewControlContract as contract3,
  previewSource as source3,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-ellipse-arc';
import Demo4, {
  createPreviewControlContract as contract4,
  previewSource as source4,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-node-geometry';
import Demo0, {
  createPreviewControlContract as contract0,
  previewSource as source0,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-quadratic';
import Demo6, {
  createPreviewControlContract as contract6,
  previewSource as source6,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-scope';

const demos = [
  ['inspect-quadratic', Demo0, source0, contract0],
  ['inspect-cubic', Demo1, source1, contract1],
  ['inspect-arc', Demo2, source2, contract2],
  ['inspect-ellipse-arc', Demo3, source3, contract3],
  ['inspect-node-geometry', Demo4, source4, contract4],
  ['inspect-clip', Demo5, source5, contract5],
  ['inspect-scope', Demo6, source6, contract6],
  ['inspect-coordinate', Demo7, source7, contract7],
] as const;
describe('Inspect demo source views', () => {
  it.each(demos)(
    '%s has matching bilingual controls and keeps main geometry independent of inspection',
    (_name, _Component, source, contractFor) => {
      const zh = contractFor('zh');
      const en = contractFor('en');
      const fields = getPreviewControlFields(zh.controls);
      expect(fields.map(field => ({ ...field, label: '' }))).toEqual(
        getPreviewControlFields(en.controls).map(field => ({ ...field, label: '' })),
      );
      expect(zh.canonicalValues).toEqual(en.canonicalValues);
      const codeFor = (values: Readonly<PreviewControlValues>) =>
        source.buildViews?.({ lang: 'zh', values }).config?.files[0].code ?? '';
      const baseline = codeFor(zh.canonicalValues);
      const disabled = { ...zh.canonicalValues };
      for (const field of fields) if (field.kind === 'switch') disabled[field.id] = false;
      const withoutHelpers = codeFor(disabled);
      const mainGeometry = (code: string) =>
        JSON.parse(code, (key, value) => (key === 'authoring' ? undefined : value)).input;
      expect(mainGeometry(withoutHelpers)).toEqual(mainGeometry(baseline));
      expect(withoutHelpers).not.toEqual(baseline);
      for (const field of fields) {
        if (field.kind === 'switch') continue;
        if (field.kind !== 'point' && field.kind !== 'range') continue;
        for (const edge of ['min', 'max'] as const) {
          const values: PreviewControlValues = { ...zh.canonicalValues };
          values[field.id] = field.kind === 'point' ? [...field[edge]] : field[edge];
          expect(codeFor(values)).not.toEqual(baseline);
        }
      }
      for (const edge of ['min', 'max'] as const) {
        const values = { ...zh.canonicalValues };
        for (const field of fields) {
          if (field.kind === 'point') values[field.id] = [...field[edge]];
          else if (field.kind === 'range') values[field.id] = field[edge];
        }
        const output = source.buildViews?.({ lang: 'en', values }).vanilla?.render?.('svg');
        if (!isValidElement<{ svg: string }>(output)) throw new Error('Expected SVG output');
        expect(output.props.svg).not.toMatch(/NaN|Infinity/);
      }
    },
  );
  it('rebuilds geometry and inspection options from current controls', () => {
    const baseline = source4.buildViews?.({ lang: 'zh' });
    const changed = source4.buildViews?.({ lang: 'zh', values: { position: [30, 20], bounds: false } });
    expect(changed?.config?.files[0].code).not.toEqual(baseline?.config?.files[0].code);
    expect(changed?.config?.files[0].code).toContain('"bounds": false');
  });
  it.each(demos)(
    '%s preserves inspection in generated Vanilla and Config for both languages',
    (name, Component, previewSource) => {
      for (const lang of ['zh', 'en'] as const) {
        const previewTheme = { mode: lang === 'zh' ? 'light' : 'dark' } as const;
        const result = buildPreviewSource({
          Component,
          previewSource,
          lang,
          name,
          key: name,
          segments: [],
          rawSource: 'export default Demo;',
          sourceFiles: [],
          sourceContents: {},
          hideCode: false,
          theme: previewTheme,
        });
        expect(availableSourceViews(result.source ?? {})).toEqual(['react', 'vanilla', 'config']);
        expect(result.previewIr).toBeNull();
        const configCode = result.source?.config?.files[0].code ?? '';
        expect(configCode).toContain('authoring');
        expect(configCode).not.toContain('token');
        const config = JSON.parse(configCode);
        const sourceCode = result.source?.vanilla?.files[0].code ?? '';
        const moduleExports: { svg?: string } = {};
        const modules: Record<string, unknown> = {
          '@retikz/vanilla': vanilla,
          '@retikz/inspect': inspect,
          '@retikz/inspect/vanilla': inspectVanilla,
          '@retikz/extension': clip,
          '@/modules/docs/components/component-preview/theme': theme,
          '@/modules/docs/components/component-preview/vanilla-preview': measure,
          [`./${name}.config.json`]: config,
        };
        runInNewContext(transpileModule(sourceCode, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, {
          exports: moduleExports,
          require: (id: string) => {
            if (!(id in modules)) throw new Error(`Unexpected generated import: ${id}`);
            return modules[id];
          },
        });
        expect(moduleExports.svg).toContain('data-retikz-readonly-layer');
        for (const view of ['vanilla', 'config'] as const) {
          const rendered = result.source?.[view]?.render?.('svg');
          expect(isValidElement<{ svg: string }>(rendered)).toBe(true);
          if (!isValidElement<{ svg: string }>(rendered)) throw new Error('Expected SVG preview');
          expect(rendered.props.svg).toEqual(moduleExports.svg);
        }
        const root = previewSource.canonicalRender?.(lang);
        if (!isValidElement<InspectLayoutProps>(root)) throw new Error('Expected InspectLayout');
        const original = createInputScene(root.props.children);
        const input = {
          ...original.scene,
          theme: previewTheme,
          viewBox: root.props.viewBox,
          ...(root.props.request === undefined
            ? {}
            : { authoring: inspectVanilla.createInspectionVanillaAuthoring(root.props.request) }),
        };
        expect(
          vanilla.renderToSvgString(input, {
            adapters: original.adapters,
            compile: {
              clips: root.props.extensions?.clips,
              themeStyles: theme.PreviewThemeDefinitionBundle.core,
              measureText: measure.browserMeasurer,
            },
            compileDriver: inspectVanilla.createInspectionVanillaDriver({
              registry: root.props.registry,
              selection: root.props.selection,
            }),
          }),
        ).toEqual(moduleExports.svg);
        expect(JSON.stringify(vanilla.normalizeScene(input).ir)).not.toContain('authoring');
      }
    },
  );
});
