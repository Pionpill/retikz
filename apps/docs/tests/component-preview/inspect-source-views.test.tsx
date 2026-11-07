import { runInNewContext } from 'node:vm';

import * as clip from '@retikz/extension';
import * as inspect from '@retikz/inspect';
import * as inspectVanilla from '@retikz/inspect/vanilla';
import * as vanilla from '@retikz/vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModuleKind, transpileModule } from 'typescript';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import * as theme from '../../src/modules/docs/components/component-preview/theme';
import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview/types';
import * as measure from '../../src/modules/docs/components/component-preview/vanilla-preview';
import Demo5, {
  createPreviewControlContract as contract5,
  previewSource as source5,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-clip';
import Demo1, {
  createPreviewControlContract as contract1,
  previewSource as source1,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-cubic';
import Demo6, {
  createPreviewControlContract as contract6,
  previewSource as source6,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-group';
import Demo0, {
  createPreviewControlContract as contract0,
  previewSource as source0,
} from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-quadratic';

const demos = [
  ['inspect-quadratic', Demo0, source0, contract0],
  ['inspect-cubic', Demo1, source1, contract1],
  ['inspect-clip', Demo5, source5, contract5],
  ['inspect-group', Demo6, source6, contract6],
] as const;
describe('Inspect 结果消费示例', () => {
  it.each(demos)('%s 保持主图独立并同步双语控件', (_name, _Component, source, contractFor) => {
    const zh = contractFor('zh');
    const en = contractFor('en');
    const fields = getPreviewControlFields(zh.controls);
    expect(fields.map(field => ({ ...field, label: '' }))).toEqual(
      getPreviewControlFields(en.controls).map(field => ({ ...field, label: '' })),
    );
    expect(zh.canonicalValues).toEqual(en.canonicalValues);
    const baseline = source.buildViews!({ lang: 'zh', values: zh.canonicalValues });
    const disabled = { ...zh.canonicalValues };
    for (const field of fields) if (field.kind === 'switch') disabled[field.id] = false;
    const without = source.buildViews!({ lang: 'zh', values: disabled });
    const normalConfig = JSON.parse(baseline.config!.files[0].code);
    const disabledConfig = JSON.parse(without.config!.files[0].code);
    expect(normalConfig.input).toEqual(disabledConfig.input);
    expect(normalConfig.requests).not.toEqual(disabledConfig.requests);
    for (const edge of ['min', 'max'] as const) {
      const values: PreviewControlValues = { ...zh.canonicalValues };
      for (const field of fields) {
        if (field.kind === 'point') values[field.id] = [...field[edge]];
        else if (field.kind === 'range') values[field.id] = field[edge];
      }
      const rendered = source.buildViews!({ lang: 'en', values }).vanilla!.render!('svg');
      expect(renderToStaticMarkup(rendered)).not.toMatch(/NaN|Infinity/);
    }
  });
  it.each(demos)('%s 生成的 Vanilla 源码实际编译主图与独立辅助图', (_name, _Component, source) => {
    for (const lang of ['zh', 'en'] as const) {
      const views = source.buildViews!({ lang, theme: { mode: lang === 'zh' ? 'light' : 'dark' } });
      const moduleExports: { primarySvg?: string; overlay?: string } = {};
      const modules: Record<string, unknown> = {
        '@retikz/vanilla': vanilla,
        '@retikz/inspect': inspect,
        '@retikz/inspect/vanilla': inspectVanilla,
        '@retikz/extension': clip,
        '@/modules/docs/components/component-preview/theme': theme,
        '@/modules/docs/components/component-preview/vanilla-preview': measure,
      };
      runInNewContext(
        transpileModule(views.vanilla!.files[0].code, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText,
        {
          exports: moduleExports,
          require: (id: string) => {
            if (!(id in modules)) throw new Error(id);
            return modules[id];
          },
        },
      );
      expect(moduleExports.primarySvg).toContain('<svg');
      expect(moduleExports.primarySvg).not.toContain('data-retikz-readonly-layer');
      expect(moduleExports.overlay).toContain('data-retikz-readonly-layer');
      const rendered = renderToStaticMarkup(views.vanilla!.render!('svg'));
      expect(rendered).toContain(moduleExports.primarySvg);
      expect(rendered).toContain(moduleExports.overlay);
    }
  });
});
