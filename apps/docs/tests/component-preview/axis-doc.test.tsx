import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import {
  axisCartesianPlaygroundControls,
  previewControlContract,
} from '../../src/modules/docs/contents/viz/plot/guide/axis/axis-cartesian-playground.controls';
import AxisCartesianPlayground from '../../src/modules/docs/contents/viz/plot/guide/axis/axis-cartesian-playground.demo';
import {
  axisCartesianPlaygroundControls as englishAxisCartesianPlaygroundControls,
  previewControlContract as englishPreviewControlContract,
} from '../../src/modules/docs/contents/viz/plot/guide/axis/axis-cartesian-playground.en.controls';

const fieldContractOf = (definition: PreviewControlsDefinition) => {
  if (definition.presentation !== 'panel') throw new Error('Axis playground must use panel controls');
  return definition.sections.map(section => ({
    visibleWhen: section.visibleWhen,
    fields: section.controls.map(field => ({
      id: field.id,
      kind: field.kind,
      defaultValue: field.kind === 'table' ? undefined : field.defaultValue,
      visibleWhen: field.visibleWhen,
    })),
  }));
};

const renderWithDomainEndpoints = (includeDomain: boolean): string =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: previewControlContract.canonicalValues,
          values: { ...previewControlContract.canonicalValues, includeDomain },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(AxisCartesianPlayground),
    ),
  );

const pathDataOf = (markup: string): Array<string> => [...markup.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);

const moveCountOf = (pathData: string): number => pathData.match(/\bM /g)?.length ?? 0;

describe('Axis 文档 playground', () => {
  it('domain endpoint control is bilingual and part of the canonical contract', () => {
    expect(fieldContractOf(englishAxisCartesianPlaygroundControls)).toEqual(
      fieldContractOf(axisCartesianPlaygroundControls),
    );
    expect(fieldContractOf(axisCartesianPlaygroundControls)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              id: 'includeDomain',
              kind: 'switch',
              defaultValue: false,
            }),
          ]),
        }),
      ]),
    );
    expect(previewControlContract.canonicalValues.includeDomain).toBe(false);
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
    expect(previewControlContract.relatedApis).toContain('Axis.grid.includeDomain');
    expect(englishPreviewControlContract.relatedApis).toEqual(previewControlContract.relatedApis);
  });

  it('enabling domain endpoints adds the two missing boundary grid positions', () => {
    const disabledPaths = pathDataOf(renderWithDomainEndpoints(false));
    const enabledPaths = pathDataOf(renderWithDomainEndpoints(true));

    expect(moveCountOf(enabledPaths[0]) - moveCountOf(disabledPaths[0])).toBe(2);
    expect(moveCountOf(disabledPaths[1]) - moveCountOf(enabledPaths[1])).toBe(2);
  });
});
