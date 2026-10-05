import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { BranchDiagramSchema, createBranchDiagramProviderContribution } from '@retikz/diagram/branch';
import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import BranchHistory from '../../src/modules/docs/contents/schematic/diagram/branch/branch-history';
import BranchReading from '../../src/modules/docs/contents/schematic/diagram/branch/branch-reading';
import BranchRoadmap from '../../src/modules/docs/contents/schematic/diagram/branch/branch-roadmap';
import { renderPreview as renderLayout } from '../../src/modules/docs/contents/schematic/diagram/branch/extended/branch-layout.preview';
import { renderPreview as renderPresentation } from '../../src/modules/docs/contents/schematic/diagram/branch/extended/branch-presentation.preview';
import { renderPreview as renderNodes } from '../../src/modules/docs/contents/schematic/diagram/branch/usage/branch-nodes.preview';

it.each(['zh', 'en'] as const)('renders three Branch scenarios through source IR and Vanilla in %s', lang => {
  for (const Demo of [BranchRoadmap, BranchHistory, BranchReading]) {
    const preview = buildPreviewIR(() => <Demo lang={lang} />);
    const source = BranchDiagramSchema.parse(preview.sourceIr.children[0]);
    expect(source.branches).toHaveLength(2);
    const vanilla = buildVanillaPreview(preview, {
      measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
    });
    expect(vanilla.code).toContain('branchDiagram(');
    expect(vanilla.svg).toContain('<svg');
  }
});

it.each(['right', 'left', 'down', 'up'])('renders layout controls at both gap limits in %s', direction => {
  for (const gap of [0, 80]) {
    const preview = buildPreviewIR(() => renderLayout({ direction, nodeGap: gap, laneGap: gap, color: '#c76b34' }));
    const result = buildVanillaPreview(preview);
    expect(result.svg).toContain('<svg');
    const source = BranchDiagramSchema.parse(preview.sourceIr.children[0]);
    expect(source.layout).toMatchObject({ direction, nodeGap: gap, laneGap: gap });
  }
});

it('applies marker, label, and main-branch controls to authoring input', () => {
  for (const size of [4, 24]) {
    const preview = buildPreviewIR(() => renderNodes({ size, labels: false, main: 'side' }));
    const source = BranchDiagramSchema.parse(preview.sourceIr.children[0]);
    expect(source.mainBranch).toBe('side');
    expect(source.nodes.every(node => node.layout?.minimumSize === size && node.labels?.length === 0)).toBe(true);
    expect(
      buildVanillaPreview(preview, {
        measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
      }).svg,
    ).toContain('<svg');
  }
});

it.each(['zh', 'en'] as const)('removes each presentation region independently in %s', lang => {
  for (const hidden of ['title', 'description', 'legend'] as const) {
    const values = { title: true, description: true, legend: true, [hidden]: false };
    const preview = buildPreviewIR(() => renderPresentation(values, lang));
    const source = BranchDiagramSchema.parse(preview.sourceIr.children[0]);
    expect(source.presentation?.[hidden]).toBeUndefined();
    compileToScene(
      { version: 1, type: 'scene', children: [source] },
      {
        ...resolveCoreProviderDependencies({ contributions: [createBranchDiagramProviderContribution()] }),
        measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
      },
    );
    for (const visible of ['title', 'description', 'legend'] as const) {
      if (visible !== hidden) expect(source.presentation?.[visible]).toBeDefined();
    }
    const result = buildVanillaPreview(preview, {
      measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
    });
    expect(result.svg, result.code).toContain('<svg');
  }
});
