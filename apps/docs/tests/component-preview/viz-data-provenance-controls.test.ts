import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PlotLineageRun } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls/define-preview-controls';
import type {
  PreviewControlContract,
  PreviewControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';
import * as plotLineageOptions from '../../src/modules/docs/contents/viz/plot/provenance/plot-lineage-options';
import { buildPlotLineageOptions } from '../../src/modules/docs/contents/viz/plot/provenance/plot-lineage-options';
import { previewControlContract as plotLineageZh } from '../../src/modules/docs/contents/viz/plot/provenance/plot-lineage.controls';
import { previewControlContract as plotLineageEn } from '../../src/modules/docs/contents/viz/plot/provenance/plot-lineage.en.controls';

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

describe('可视化数据 Plot 血缘控件', () => {
  it('保持双语面板契约结构相同、完整', () => {
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

  it('将每个可写控件映射到公共血缘选项', () => {
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

  it('忽略禁用的根和标记变换', () => {
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

  it('将启用的控件映射到根排序和标记本地前 N 变换', () => {
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
      root: [{ kind: 'sort', params: { field: 'revenue', order: 'ascending' } }],
      mark: [{ kind: 'select', params: { selector: { kind: 'top', by: 'revenue', n: 2 } } }],
    });
  });

  it('从实际血缘产物中提取根级和标记级变换步骤的行数', () => {
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

  it('图表与血缘摘要并排展示且摘要使用完整预览高度', () => {
    const source = readFileSync(
      resolve('src/modules/docs/contents/viz/plot/provenance/plot-lineage.preview.tsx'),
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

  it('用两个区域设置中的受控预览替换重复的 React 代码块', () => {
    for (const locale of ['zh', 'en']) {
      const source = readFileSync(resolve(`src/modules/docs/contents/viz/plot/provenance/index.${locale}.mdx`), 'utf8');

      expect(source).toContain(
        "files={['plot-lineage', 'plot-lineage.preview.tsx', 'plot-lineage.data.ts', 'plot-lineage-options.ts']}",
      );
      expect(source).toContain('defaultSourceFile="plot-lineage.preview.tsx"');
      expect(source).toContain('size="lg"');
      expect(source).not.toContain("import { useCallback, useState } from 'react';");
    }
  });
});
