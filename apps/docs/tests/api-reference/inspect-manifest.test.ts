import { compile, run } from '@mdx-js/mdx';
import type { PropsWithChildren } from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { createInspectApiReferenceMdx } from '../../scripts/api-reference/inspect';
import { ApiTable } from '../../src/modules/docs/components/mdx-content/api-table';

describe('Inspect API 参考', () => {
  it('双语参考完整呈现结果消费与独立宿主，不暴露已删除的 authoring 契约', async () => {
    for (const lang of ['zh', 'en'] as const) {
      const source = await createInspectApiReferenceMdx(lang);
      for (const symbol of [
        'InspectionTarget',
        'InspectorSubject',
        'InspectionRequest',
        'compileInspectionToScene',
        'defineInspector',
        'InspectionOverlay / InspectionOverlayProps',
        'mountInspection',
        'prepareInspectionPresentation',
        'renderInspectionToSvgString',
        'renderInspectionToCanvas',
      ])
        expect(source).toContain('### ' + symbol);
      for (const old of [
        'InspectLayout',
        'InspectScope',
        'InspectPath',
        'InspectionSelectionRule',
        'createInspectionVanillaDriver',
        'NodeInspectOptionsSchema',
        'CoordinateInspectOptionsSchema',
      ])
        expect(source).not.toContain(old);
      const section = (name: string) => source.split('### ' + name + '\n')[1]?.split('\n### ')[0] ?? '';
      expect(section('compileInspectionToScene')).toContain('CompileResult');
      expect(section('InspectionTarget')).toContain('value="primitive"');
      expect(section('InspectionTarget')).toContain('value="artifact"');
      expect(section('InspectorSubject')).toContain('value="artifact"');
      for (const name of ['PathInspectOptionsSchema', 'GroupInspectOptionsSchema', 'ClipInspectOptionsSchema']) {
        expect(section(name)).toContain('/reference#');
        expect(section(name)).not.toContain('```');
      }
      if (lang === 'en') expect(source.replaceAll(/```[\s\S]*?```/g, '')).not.toMatch(/[\u3400-\u9fff]/u);
      const compiled = await compile(source, { remarkPlugins: [remarkGfm], outputFormat: 'function-body' });
      const module = await run(compiled, jsxRuntime);
      const wrapper = (props: PropsWithChildren) => createElement('div', null, props.children);
      const html = renderToStaticMarkup(
        createElement(module.default, {
          components: {
            ApiTable,
            ApiSourceLink: wrapper,
            DocTabs: wrapper,
            DocTab: wrapper,
            DocSteps: wrapper,
            DocStep: wrapper,
          },
        }),
      );
      expect(html).toContain('InspectionOverlay');
      expect(html).toContain('InspectionTarget');
    }
  }, 20000);
});
