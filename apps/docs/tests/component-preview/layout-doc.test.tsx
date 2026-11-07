import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import { Legend, LegendItem, LegendTitle } from '@retikz/standard-react/presentation';
import { createGrid, LegendContentKind } from '@retikz/standard/presentation';
import type { FC } from 'react';
import { describe, expect, it } from 'vitest';

import { resolvePreviewControlContract } from '../../src/modules/docs/components/component-preview/registry';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import OverflowEnDemo from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-layout-overflow.en.demo';
import OverflowZhDemo from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-layout-overflow.zh.demo';
import { previewControlContract as flexZhContract } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-layout-playground.controls';
import { previewSource as flexPlaygroundSource } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-layout-playground.demo';
import { previewControlContract as flexEnContract } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-layout-playground.en.controls';
import { previewSource as flexBasicEnSource } from '../../src/modules/docs/contents/library/layout/flex-layout/usage/flex-layout-basic.en.demo';
import { previewSource as flexBasicZhSource } from '../../src/modules/docs/contents/library/layout/flex-layout/usage/flex-layout-basic.zh.demo';
import { previewSource as nestedEnSource } from '../../src/modules/docs/contents/library/layout/introduction/layout-nested.en.demo';
import { previewSource as nestedZhSource } from '../../src/modules/docs/contents/library/layout/introduction/layout-nested.zh.demo';

const FlexEnDemo: FC = () => flexBasicEnSource.canonicalRender!();

const FlexZhDemo: FC = () => flexBasicZhSource.canonicalRender!();

const FlexPlaygroundCanonical: FC = () => flexPlaygroundSource.canonicalRender!();

const NestedEnCanonical: FC = () => nestedEnSource.canonicalRender();

const NestedZhCanonical: FC = () => nestedZhSource.canonicalRender();

const LegendWithNestedStandardDemo: FC = () => (
  <Layout width={220} height={140}>
    <Legend kind={LegendContentKind.Items}>
      <LegendTitle>
        <Node position={[0, 0]} text="Legend" />
      </LegendTitle>
      <LegendItem
        itemKey="nested-grid"
        sample={
          <FlexLayout>
            <FlexLayoutItem
              itemKey="grid"
              ir={createGrid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })}
            />
          </FlexLayout>
        }
      >
        <Node position={[0, 0]} text="Nested" />
      </LegendItem>
    </Legend>
  </Layout>
);

const demos: ReadonlyArray<Readonly<{ name: string; Component: FC }>> = [
  { name: 'flex zh', Component: FlexZhDemo },
  { name: 'flex en', Component: FlexEnDemo },
  { name: 'flex overflow zh', Component: OverflowZhDemo },
  { name: 'flex overflow en', Component: OverflowEnDemo },
  { name: 'flex controls', Component: FlexPlaygroundCanonical },

  { name: 'nested zh', Component: NestedZhCanonical },
  { name: 'nested en', Component: NestedEnCanonical },
];

describe('Layout 文档演示', () => {
  it('加载 Legend Vanilla 预览的传递嵌套 Standard 定义', () => {
    const preview = buildPreviewIR(LegendWithNestedStandardDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain('legend({');
    expect(vanilla.code).toContain('const compile = { composites: [gridDefinition, flexLayoutDefinition] };');
    expect(vanilla.code).not.toContain('legendDefinition');
    expect(vanilla.code).not.toContain('Unsupported Layout composite');
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('Nested');
  });

  it.each([['flex', flexZhContract, flexEnContract]])(
    '保持 %s 控件在跨语言结构上保持一致',
    (_name, chinese, english) => {
      expect(english.canonicalValues).toEqual(chinese.canonicalValues);
      expect(english.relatedApis).toEqual(chinese.relatedApis);
      expect(english.controls.sections.map(section => section.controls.map(control => control.id))).toEqual(
        chinese.controls.sections.map(section => section.controls.map(control => control.id)),
      );
    },
  );

  it.each([
    ['flex zh', flexZhContract],
    ['flex en', flexEnContract],
  ])('解析 %s 仅由预设指定的检查状态', (_name, contract) => {
    expect(resolvePreviewControlContract({ previewControlContract: contract })).toBe(contract);
  });

  it.each(demos)('为 $name 派生规范的 IR 和真实的 Vanilla SVG', ({ Component }) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview.ir.children).toHaveLength(1);
    expect(preview.ir.children[0]).toMatchObject({ namespace: 'layout' });
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.code).not.toContain('Unsupported Layout composite');
    expect(vanilla.svg).toContain('<svg');
  });

  it.each([
    ['flex zh', FlexZhDemo],
    ['flex en', FlexEnDemo],
  ] as const)('%s 基础 Source IR 不包含可选条目键', (_name, Component) => {
    const source = JSON.stringify(buildPreviewIR(Component).sourceIr);

    expect(source).not.toContain('"key":');
  });

  it.each([['flexLayout', FlexPlaygroundCanonical]])(
    '将仅运行时的 %s 检查保留在规范的 IR 和 Vanilla 输出之外',
    (kind, Component) => {
      const preview = buildPreviewIR(Component);
      const vanilla = buildVanillaPreview(preview);

      expect(preview).not.toHaveProperty('inspectionRoots');
      expect(preview).not.toHaveProperty('inspect');
      expect(vanilla.code).toContain(`${kind}(`);
      expect(vanilla.code).not.toMatch(/\binspect\b/);
      expect(vanilla.svg).not.toContain('data-retikz-readonly-layer');
    },
  );

  it.each([
    ['zh', NestedZhCanonical],
    ['en', NestedEnCanonical],
  ])('将嵌套的 %s 演示选择保留在生成的 Vanilla 输出之外', (_language, Component) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview).not.toHaveProperty('inspect');
    expect(vanilla.code).not.toMatch(/\binspect\b/);
    expect(vanilla.svg).not.toContain('data-retikz-readonly-layer');
  });
});
