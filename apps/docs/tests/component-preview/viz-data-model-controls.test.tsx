// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildPlotIR } from '@retikz/plot-react';
import type { FC } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import i18n from '../../src/i18n';
import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewOverlayControlField,
  PreviewPanelControlItem,
} from '../../src/modules/docs/components/component-preview';
import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as extensionFormatZh } from '../../src/modules/docs/contents/viz/data/model/extensions/extension-format.controls';
import { previewControlContract as extensionFormatEn } from '../../src/modules/docs/contents/viz/data/model/extensions/extension-format.en.controls';
import { previewControlContract as extensionResolverZh } from '../../src/modules/docs/contents/viz/data/model/extensions/extension-resolver.controls';
import { previewControlContract as extensionResolverEn } from '../../src/modules/docs/contents/viz/data/model/extensions/extension-resolver.en.controls';
import { renderDataModelOrderPreview } from '../../src/modules/docs/contents/viz/data/model/intake/data-model-order-preview';
import { previewControlContract as orderZh } from '../../src/modules/docs/contents/viz/data/model/intake/data-model-order.controls';
import { previewControlContract as orderEn } from '../../src/modules/docs/contents/viz/data/model/intake/data-model-order.en.controls';
import OrderDemo from '../../src/modules/docs/contents/viz/data/model/intake/data-model-order.zh.demo';
import { previewControlContract as sourceBindingZh } from '../../src/modules/docs/contents/viz/data/model/intake/source-binding.controls';
import { previewControlContract as sourceBindingEn } from '../../src/modules/docs/contents/viz/data/model/intake/source-binding.en.controls';
import SourceBindingDemo from '../../src/modules/docs/contents/viz/data/model/intake/source-binding.zh.demo';
import { renderValidationPolicyPreview } from '../../src/modules/docs/contents/viz/data/model/intake/validation-policy-preview';
import { previewControlContract as validationZh } from '../../src/modules/docs/contents/viz/data/model/intake/validation-policy.controls';
import { previewControlContract as validationEn } from '../../src/modules/docs/contents/viz/data/model/intake/validation-policy.en.controls';
import ValidationDemo from '../../src/modules/docs/contents/viz/data/model/intake/validation-policy.zh.demo';
import { previewControlContract as valueParsingZh } from '../../src/modules/docs/contents/viz/data/model/intake/value-parsing.controls';
import { previewControlContract as valueParsingEn } from '../../src/modules/docs/contents/viz/data/model/intake/value-parsing.en.controls';
import ValueParsingDemo from '../../src/modules/docs/contents/viz/data/model/intake/value-parsing.zh.demo';

const roots: Array<ReturnType<typeof createRoot>> = [];

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeAll(async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  await i18n.changeLanguage('zh');
});

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
});

const controlShape = (control: PreviewPanelControlItem | PreviewOverlayControlField) => ({
  kind: control.kind,
  id: control.id,
  visibleWhen: control.visibleWhen,
  options: control.kind === 'select' ? control.options.map(option => option.value) : undefined,
  defaultValue: 'defaultValue' in control ? control.defaultValue : undefined,
  min: 'min' in control ? control.min : undefined,
  max: 'max' in control ? control.max : undefined,
  step: 'step' in control ? control.step : undefined,
});

const controlsShape = (definition: PreviewControlsDefinition) => {
  if (definition.presentation !== 'panel') {
    return { presentation: definition.presentation, controls: definition.controls.map(controlShape) };
  }

  return {
    presentation: definition.presentation,
    defaultSize: definition.defaultSize,
    sections: definition.sections.map(section => ({
      defaultCollapsed: section.defaultCollapsed,
      visibleWhen: section.visibleWhen,
      controls: section.controls.map(controlShape),
    })),
  };
};

const contractShape = (contract: PreviewControlContract) => ({
  controls: controlsShape(contract.controls),
  canonicalValues: contract.canonicalValues,
  presets: contract.presets?.map(preset => ({ id: preset.id, values: preset.values })),
  relatedApis: contract.relatedApis,
});

const expectCompletePanelContract = (contract: PreviewControlContract): void => {
  expect(contract.controls.presentation).toBe('panel');

  if (contract.controls.presentation !== 'panel') return;

  expect(contract.controls.sections[0]?.controls[0]?.kind).toBe('table');

  const writableIds = getPreviewControlFields(contract.controls)
    .map(control => control.id)
    .sort();

  expect(Object.keys(contract.canonicalValues).sort()).toEqual(writableIds);

  for (const preset of contract.presets ?? []) {
    expect(Object.keys(preset.values).sort()).toEqual(writableIds);
  }
};

const renderWithValues = (Component: FC, values: Record<string, boolean | number | string>): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: values,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );

describe('Viz Data model controls', () => {
  const localizedPairs = [
    [orderZh, orderEn],
    [sourceBindingZh, sourceBindingEn],
    [valueParsingZh, valueParsingEn],
    [validationZh, validationEn],
    [extensionFormatZh, extensionFormatEn],
    [extensionResolverZh, extensionResolverEn],
  ] as const;

  it('keeps bilingual contracts structurally identical and complete', () => {
    for (const [zh, en] of localizedPairs) {
      expect(contractShape(zh)).toEqual(contractShape(en));

      expectCompletePanelContract(zh);
      expectCompletePanelContract(en);
    }
  });

  it('uses large previews for data-table controls', () => {
    const pagePreviews = [
      ['model/field-types', 0],
      ['model/intake', 5],
      ['model/extensions', 3],
    ] as const;

    for (const [page, previewCount] of pagePreviews) {
      for (const locale of ['zh', 'en']) {
        const source = readFileSync(resolve(`src/modules/docs/contents/viz/data/${page}/index.${locale}.mdx`), 'utf8');

        const functionalPreviews = (source.match(/<ComponentPreview\b[\s\S]*?\/>/g) ?? []).filter(
          preview => !/type="(?:flow|illustration)"/.test(preview),
        );
        expect(functionalPreviews).toHaveLength(previewCount);
        for (const preview of functionalPreviews) expect(preview).toContain('size="lg"');
      }
    }
  });

  it('pins every model bar preview to the value-axis baseline', () => {
    const orderPlot = renderDataModelOrderPreview({ orderMode: 'appearance' });
    const validationBoundary = renderValidationPolicyPreview({ dataset: 'clean', policy: 'skip' }, '校验失败');
    const validationPlot = validationBoundary.props.children;
    const plots = [
      { id: 'category-order', fields: ['size', 'value'], plot: orderPlot },
      { id: 'validation-policy', fields: ['month', 'revenue'], plot: validationPlot },
    ];

    for (const { fields, id, plot } of plots) {
      const spec = buildPlotIR(plot.props.children, id, {
        dataFieldNames: new Set(fields),
        model: plot.props.model,
      });

      expect(spec.scales, id).toContainEqual({
        type: 'linear',
        name: '__y',
        domainPadding: 0,
      });
    }
  });

  it('pins the Plot provenance bar examples to the value-axis baseline', () => {
    const demoSource = readFileSync(
      resolve('src/modules/docs/contents/viz/plot/provenance/plot-lineage.preview.tsx'),
      'utf8',
    );

    expect(demoSource).toContain(
      "import { IntervalMark, Plot, PlotAxis, BuiltinPlotScale } from '@retikz/plot-react';",
    );
    expect(demoSource).toContain('<BuiltinPlotScale dimension="y" type="linear" domainPadding={0} />');

    for (const locale of ['zh', 'en']) {
      const source = readFileSync(
        resolve(`src/modules/docs/contents/viz/plot/provenance/index.${locale}.mdx`),
        'utf8',
      );

      expect(source).toContain("{ type: 'linear', name: 'y', domainPadding: 0 },");
    }
  });

  it('changes category order, source binding, and parsing through canonical controls', () => {
    expect(renderWithValues(OrderDemo, { orderMode: 'appearance' })).not.toBe(
      renderWithValues(OrderDemo, { orderMode: 'business' }),
    );
    expect(renderWithValues(SourceBindingDemo, { source: 'finance' })).toContain('<svg');
    expect(renderWithValues(ValueParsingDemo, { inputShape: 'report' })).toContain('<svg');
  });

  it('recovers from a real validation error without losing the controlled preview', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const preventExpectedWindowError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', preventExpectedWindowError);
    roots.push(root);

    const render = (values: Record<string, string>) =>
      act(() =>
        root.render(
          <PreviewControlStateContext.Provider
            value={{
              canonicalValues: validationZh.canonicalValues,
              values,
              setValue: () => undefined,
              applyValues: () => undefined,
              reset: () => undefined,
            }}
          >
            <ValidationDemo />
          </PreviewControlStateContext.Provider>,
        ),
      );

    try {
      await render({ dataset: 'allInvalid', policy: 'sample' });
      await vi.waitFor(() => expect(container.textContent).toContain('校验失败'));

      expect(container.textContent).toContain('校验失败');

      await render({ dataset: 'dirty', policy: 'skip' });
      await vi.waitFor(() => expect(container.querySelector('svg')).not.toBeNull());

      expect(container.querySelector('svg')).not.toBeNull();
    } finally {
      window.removeEventListener('error', preventExpectedWindowError);
      consoleError.mockRestore();
    }
  });
});
