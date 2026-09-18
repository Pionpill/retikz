import { compile, run } from '@mdx-js/mdx';
import type { PropsWithChildren } from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { createInspectApiReferenceMdx } from '../../scripts/api-reference/inspect';

describe('Inspect API Reference', () => {
  it('按公开子入口分组，并将 schema 字段委托给可链接的 Schema 参考', async () => {
    for (const lang of ['zh', 'en'] as const) {
      const source = await createInspectApiReferenceMdx(lang);
      const sections = source.split(/^## /m).slice(1);
      expect(sections).toHaveLength(3);
      expect(sections[0]).toContain('`@retikz/inspect`');
      expect(sections[0]).toContain('### defineInspector');
      expect(sections[0]).toContain('(options: RetikzInspectErrorOptions) => RetikzInspectError');
      expect(sections[1]).toContain('`@retikz/inspect/react`');
      expect(sections[1]).toContain('### InspectLayout');
      expect(sections[1]).not.toContain('### createInspectionVanillaDriver');
      expect(sections[2]).toContain('`@retikz/inspect/vanilla`');
      expect(sections[2]).toContain('### createInspectionVanillaDriver');
      for (const schema of [
        'PathInspectOptionsSchema',
        'NodeInspectOptionsSchema',
        'ClipInspectOptionsSchema',
        'ScopeInspectOptionsSchema',
        'CoordinateInspectOptionsSchema',
      ]) {
        const schemaSection = source.split(`### ${schema}\n`)[1]?.split('\n### ')[0];
        expect(schemaSection).toContain(`/kernel/packages/inspect/schema-reference#${schema.toLowerCase()}`);
        expect(schemaSection).not.toContain('```');
      }
      const definitionInput = source.split('### InspectorDefinitionInput\n')[1]?.split('\n### ')[0] ?? '';
      expect(definitionInput).not.toContain(lang === 'zh' ? '#### 展开类型' : '#### Expanded type');
      expect(definitionInput).toContain('export type InspectorDefinitionInput');
      const diagnosticOrigin = source.split('### InspectionDiagnosticOrigin\n')[1]?.split('\n### ')[0] ?? '';
      expect(diagnosticOrigin).not.toContain(lang === 'zh' ? '#### 展开类型' : '#### Expanded type');
      expect(diagnosticOrigin).toContain('Readonly<');
      const selectionRule = source.split('### InspectionSelectionRule\n')[1]?.split('\n### ')[0] ?? '';
      expect(selectionRule).not.toContain(lang === 'zh' ? '#### 展开类型' : '#### Expanded type');
      expect(selectionRule).toContain('Readonly<');
      const errorCode = source.split('### RetikzInspectErrorCode\n')[1]?.split('\n### ')[0] ?? '';
      expect(errorCode).toContain('export const RetikzInspectErrorCode = {');
      expect(errorCode).toContain('} as const;');
      const registryFactory = source.split('### createInspectorRegistry\n')[1]?.split('\n### ')[0] ?? '';
      expect(registryFactory).toContain('export declare const createInspectorRegistry:');
      const inspectError = source.split('### RetikzInspectError\n')[1]?.split('\n### ')[0] ?? '';
      expect(inspectError).toContain('export class RetikzInspectError extends RetikzError');
      const inspectorContext = source.split('### InspectorContext\n')[1]?.split('\n### ')[0] ?? '';
      expect(inspectorContext).toContain(
        lang === 'zh' ? 'callback 消费的已解析 options 类型' : 'Resolved options type consumed by the callback',
      );
      const scopeProps = source.split('### InspectScopeProps\n')[1]?.split('\n### ')[0] ?? '';
      expect(scopeProps).toContain(lang === 'zh' ? 'label="直接属性"' : 'label="Direct members"');
      expect(scopeProps).toContain('`InspectionVanillaAuthoringInput`');
      expect(scopeProps).toContain('`ScopeProps`');
      expect(scopeProps).not.toContain('`animations?`');
      if (lang === 'en') expect(source.replaceAll(/```[\s\S]*?```/g, '')).not.toMatch(/[\u3400-\u9fff]/u);
      const compiled = await compile(source, { remarkPlugins: [remarkGfm], outputFormat: 'function-body' });
      const module = await run(compiled, jsxRuntime);
      const html = renderToStaticMarkup(
        createElement(module.default, {
          components: {
            ApiSourceLink: (props: PropsWithChildren) => createElement('span', null, props.children),
            DocTabs: (props: PropsWithChildren) => createElement('div', null, props.children),
            DocTab: (props: PropsWithChildren) => createElement('div', null, props.children),
            DocSteps: (props: PropsWithChildren) => createElement('ol', null, props.children),
            DocStep: (props: PropsWithChildren) => createElement('li', null, props.children),
          },
        }),
      );
      expect(html).toContain('InspectorDefinitionInput');
    }
  }, 20000);
});
