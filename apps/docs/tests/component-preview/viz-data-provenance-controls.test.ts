import type { PlotLineageRun } from '@retikz/plot';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls/define-preview-controls';
import { previewControlContract as plotLineageZh } from '../../src/modules/docs/contents/viz/data/provenance/plot/plot-lineage.controls';
import { previewControlContract as plotLineageEn } from '../../src/modules/docs/contents/viz/data/provenance/plot/plot-lineage.en.controls';
import * as plotLineageOptions from '../../src/modules/docs/contents/viz/data/provenance/plot/plot-lineage-options';
import { buildPlotLineageOptions } from '../../src/modules/docs/contents/viz/data/provenance/plot/plot-lineage-options';

const comparableContract = (contract: PreviewControlContract) => ({
  controls: JSON.parse(
    JSON.stringify(contract.controls, (key, value) =>
      ['title', 'label', 'help', 'customLabel'].includes(key) ? undefined : value,
    ),
  ) as PreviewControlsDefinition,
  canonicalValues: contract.canonicalValues,
  presets: contract.presets?.map(preset => ({ id: preset.id, values: preset.values })),
  relatedApis: contract.relatedApis,
});

describe('Viz Data Plot lineage controls', () => {
  it('keeps the bilingual panel contract structurally identical and complete', () => {
    expect(comparableContract(plotLineageZh)).toEqual(comparableContract(plotLineageEn));
    expect(plotLineageZh.controls.presentation).toBe('panel');
    expect(plotLineageZh.controls.sections[0]).toMatchObject({ defaultCollapsed: true });
    expect(plotLineageZh.controls.sections[0].controls[0].kind).toBe('table');

    const writableIds = getPreviewControlFields(plotLineageZh.controls)
      .map(control => control.id)
      .sort();
    expect(writableIds).toEqual([
      'layoutContext',
      'markEncoding',
      'markIdentity',
      'markSelectEnabled',
      'markTopN',
      'rootSortEnabled',
      'rootSortOrder',
      'scaleMappings',
    ]);
    expect(Object.keys(plotLineageZh.canonicalValues).sort()).toEqual(writableIds);
    for (const preset of plotLineageZh.presets) {
      expect(Object.keys(preset.values).sort()).toEqual(writableIds);
    }
  });

  it('maps every writable control to the public lineage options', () => {
    expect(
      buildPlotLineageOptions({
        markIdentity: false,
        markEncoding: true,
        scaleMappings: true,
        layoutContext: false,
      }),
    ).toEqual({
      markIdentity: false,
      markEncoding: true,
      scaleMappings: true,
      layoutContext: false,
    });
  });

  it('omits disabled root and mark transforms', () => {
    const buildTransforms = Reflect.get(plotLineageOptions, 'buildPlotLineageTransforms');

    expect(buildTransforms).toBeTypeOf('function');
    if (typeof buildTransforms !== 'function') return;

    expect(
      buildTransforms({
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      }),
    ).toEqual({ root: [], mark: [] });
  });

  it('maps enabled controls to root sort and mark-local top-N transforms', () => {
    const buildTransforms = Reflect.get(plotLineageOptions, 'buildPlotLineageTransforms');

    expect(buildTransforms).toBeTypeOf('function');
    if (typeof buildTransforms !== 'function') return;

    expect(
      buildTransforms({
        rootSortEnabled: true,
        rootSortOrder: 'ascending',
        markSelectEnabled: true,
        markTopN: 2,
      }),
    ).toEqual({
      root: [{ kind: 'sort', field: 'revenue', order: 'ascending' }],
      mark: [{ kind: 'select', selector: { kind: 'top', by: 'revenue', n: 2 } }],
    });
  });

  it('extracts root and mark transform-step row counts from the real lineage artifact', () => {
    const summarizeTransformSteps = Reflect.get(plotLineageOptions, 'summarizePlotLineageTransformSteps');
    const lineage = {
      plotId: 'salesPlot',
      dataReference: 'sales',
      data: {
        root: {
          events: [
            {
              kind: 'transformStep',
              operationIndex: 0,
              operationKind: 'sort',
              inputRowCount: 5,
              outputRowCount: 5,
              inputFields: ['revenue'],
              outputFields: [],
            },
          ],
        },
        marks: [
          {
            markIndex: 0,
            events: [
              {
                kind: 'transformStep',
                operationIndex: 0,
                operationKind: 'select',
                inputRowCount: 5,
                outputRowCount: 3,
                inputFields: ['revenue'],
                outputFields: [],
              },
            ],
          },
        ],
      },
      marks: [],
    } satisfies PlotLineageRun;

    expect(summarizeTransformSteps).toBeTypeOf('function');
    if (typeof summarizeTransformSteps !== 'function') return;

    expect(summarizeTransformSteps(lineage)).toEqual([
      { scope: 'root', operation: 'sort', inputRows: 5, outputRows: 5 },
      { scope: 'mark[0]', operation: 'select', inputRows: 5, outputRows: 3 },
    ]);
  });

  it('keeps the chart and lineage summary side by side with the summary using the full preview height', () => {
    const source = readFileSync(
      resolve('src/modules/docs/contents/viz/data/provenance/plot/plot-lineage.demo.tsx'),
      'utf8',
    );

    expect(source).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');
    expect(source).toContain('sm:grid-cols-[300px_minmax(0,1fr)]');
    expect(source).toContain('h-[232px]');
    expect(source).toContain('sm:h-[304px]');
    expect(source).toContain('height={220}');
    expect(source).toContain('width={300}');
    expect(source).toContain('<pre className="m-0 h-full');
    expect(source).toContain('text-[10px]');
    expect(source).not.toContain('grid-rows');
    expect(304).toBeGreaterThan(156);
  });

  it('replaces the duplicated React code block with the controlled preview in both locales', () => {
    for (const locale of ['zh', 'en']) {
      const source = readFileSync(
        resolve(`src/modules/docs/contents/viz/data/provenance/plot/index.${locale}.mdx`),
        'utf8',
      );
      expect(source).toContain("files={['plot-lineage', 'plot-lineage.data.ts', 'plot-lineage-options.ts']}");
      expect(source).toContain('size="lg"');
      expect(source).not.toContain("import { useCallback, useState } from 'react';");
    }
  });
});
