import type { FC } from 'react';

import { cloneAndFreezeJson } from '@retikz/foundation';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../src/modules/docs/components/component-preview/utils';
import PrimitiveRelationsDemo from '../src/modules/docs/contents/kernel/components/core/primitive-relations/anchors-auto-attach.demo';
import { previewSource as DrawStylePreviewSource } from '../src/modules/docs/contents/kernel/components/draw/overview/draw-style.demo';
import LearningPathTitleDemo from '../src/modules/docs/contents/kernel/galleries/learning-path/learning-path-01-title.demo';
import LearningPathSpineDemo from '../src/modules/docs/contents/kernel/galleries/learning-path/learning-path-02-spine.demo';
import LearningPathStacksDemo from '../src/modules/docs/contents/kernel/galleries/learning-path/learning-path-03-stacks.demo';
import LearningPathPathsDemo from '../src/modules/docs/contents/kernel/galleries/learning-path/learning-path-04-paths.demo';
import LearningPathDashedDemo from '../src/modules/docs/contents/kernel/galleries/learning-path/learning-path-05-dashed.demo';
import InspectCustomDemo from '../src/modules/docs/contents/kernel/packages/inspect/overview/inspect-custom.demo';
import { previewSource as RibbonGeometryPreviewSource } from '../src/modules/docs/contents/library/standard/extension/ribbon/ribbon-geometry.demo';
import { previewSource as LegendColorFormsEnPreviewSource } from '../src/modules/docs/contents/viz/plot/guide/legend/legend-color-forms.en.demo';
import { previewSource as LegendColorFormsPreviewSource } from '../src/modules/docs/contents/viz/plot/guide/legend/legend-color-forms.zh.demo';

/** 验证文档 demo 的 canonical IR 能通过 Runtime owner 的 JSON 快照边界 */
const expectCanonicalPreviewToBeJsonSafe = (Demo: FC) => {
  const preview = buildPreviewIR(Demo);
  expect(() => cloneAndFreezeJson(preview.ir, 'Docs canonical preview')).not.toThrow();
};

describe('Docs 质量巡检回归', () => {
  it.each([
    ['Primitive Relations 自动锚点', PrimitiveRelationsDemo],
    ['Draw 样式', () => DrawStylePreviewSource.canonicalRender?.() ?? null],
    ['Ribbon 几何', () => RibbonGeometryPreviewSource.canonicalRender?.() ?? null],
    ['Legend 颜色形态（中文）', () => LegendColorFormsPreviewSource.canonicalRender?.() ?? null],
    ['Legend 颜色形态（英文）', () => LegendColorFormsEnPreviewSource.canonicalRender?.() ?? null],
    ['Learning Path 步骤 1', LearningPathTitleDemo],
    ['Learning Path 步骤 2', LearningPathSpineDemo],
    ['Learning Path 步骤 3', LearningPathStacksDemo],
    ['Learning Path 步骤 4', LearningPathPathsDemo],
    ['Learning Path 步骤 5', LearningPathDashedDemo],
  ] satisfies Array<readonly [string, FC]>)('%s 的 canonical IR 是 JSON-safe', (_name, Demo) => {
    expectCanonicalPreviewToBeJsonSafe(Demo);
  });

  it('自定义端点 Inspector 输出合法的 Core Node', () => {
    expect(() => renderToStaticMarkup(<InspectCustomDemo />)).not.toThrow();
  });
});
