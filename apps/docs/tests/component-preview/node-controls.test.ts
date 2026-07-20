import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { resolveVisiblePreviewControlSections } from '../../src/modules/docs/components/component-preview/controls';
import { coordinateAsAnchorControls } from '../../src/modules/docs/contents/kernel/components/node/coordinate/coordinate-as-anchor.controls';
import { coordinateBetweenControls } from '../../src/modules/docs/contents/kernel/components/node/coordinate/coordinate-between.controls';
import { coordinateFoldJunctionControls } from '../../src/modules/docs/contents/kernel/components/node/coordinate/coordinate-fold-junction.controls';
import { previewControlContract as coordinateFoldJunctionContract } from '../../src/modules/docs/contents/kernel/components/node/coordinate/coordinate-fold-junction.controls';
import { previewControlContract as coordinateFoldJunctionEnContract } from '../../src/modules/docs/contents/kernel/components/node/coordinate/coordinate-fold-junction.en.controls';
import {
  coordinateOffsetChainControls,
  coordinateOffsetChainFrame,
} from '../../src/modules/docs/contents/kernel/components/node/coordinate/coordinate-offset-chain.controls';
import { previewControlContract as nodeGeometryContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-geometry.controls';
import { previewControlContract as nodeGeometryEnContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-geometry.en.controls';
import { nodeLabelControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-label.controls';
import * as NodeLabelEnControls from '../../src/modules/docs/contents/kernel/components/node/overview/node-label.en.controls';
import { previewControlContract as nodeShapeConnectionContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-shape-connection.controls';
import { previewControlContract as nodeShapeConnectionEnContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-shape-connection.en.controls';
import { nodeStyledControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-styled.controls';
import { previewControlContract as nodeStyledContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-styled.controls';
import * as NodeStyledEnControls from '../../src/modules/docs/contents/kernel/components/node/overview/node-styled.en.controls';
import { previewControlContract as nodeStyledEnContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-styled.en.controls';
import { nodeTextControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-text.controls';
import { previewControlContract as nodeTextContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-text.controls';
import * as NodeTextEnControls from '../../src/modules/docs/contents/kernel/components/node/overview/node-text.en.controls';
import { previewControlContract as nodeTextEnContract } from '../../src/modules/docs/contents/kernel/components/node/overview/node-text.en.controls';

const contentRoot = resolve('src/modules/docs/contents/kernel/components/node');
const readContent = (path: string): string => readFileSync(resolve(contentRoot, path), 'utf8');
const findControl = (definition: PreviewControlsDefinition, id: string) =>
  definition.presentation === 'panel'
    ? definition.sections.flatMap(section => section.controls).find(field => field.id === id)
    : definition.controls.find(field => field.id === id);

describe('Node controls documentation', () => {
  it('Coordinate 中文 controls 使用本地化短标签', () => {
    expect(coordinateAsAnchorControls.sections.map(section => section.label)).toEqual(['中心位置', '节点间距']);
    expect(
      coordinateAsAnchorControls.sections.flatMap(section => section.controls.map(control => control.label)),
    ).toEqual(['x 坐标', 'y 坐标', '水平距离', '垂直距离']);
    expect(coordinateFoldJunctionControls.sections.map(section => section.label)).toEqual(['汇聚点位置']);
    expect(coordinateFoldJunctionControls.sections[0].controls.map(control => control.label)).toEqual([
      'x 坐标',
      'y 坐标',
    ]);
    expect(coordinateOffsetChainControls.sections.map(section => section.label)).toEqual(['根节点位置', '链式偏移']);
    expect(
      coordinateOffsetChainControls.sections.flatMap(section => section.controls.map(control => control.label)),
    ).toEqual(['x 坐标', 'y 坐标', '水平偏移']);
    expect(coordinateBetweenControls.sections.map(section => section.label)).toEqual(['两点之间']);
    expect(coordinateBetweenControls.sections[0].controls.map(control => control.label)).toEqual(['比例']);
  });

  it('相关 API 只列出各 playground 实际消费的 owner 与属性', () => {
    for (const contract of [nodeGeometryContract, nodeGeometryEnContract]) {
      expect(contract.relatedApis).toEqual([
        'Node.padding',
        'Node.margin',
        'Node.minimumSize',
        'Node.cornerRadius',
        'Node.scale',
        'Node.rotate',
      ]);
    }
    for (const contract of [nodeStyledContract, nodeStyledEnContract]) {
      expect(contract.relatedApis).toEqual([
        'Node.font',
        'Node.fill',
        'Node.stroke',
        'Node.strokeWidth',
        'Node.dashed',
        'Node.opacity',
      ]);
    }
    for (const contract of [nodeTextContract, nodeTextEnContract]) {
      expect(contract.relatedApis).toEqual([
        'Node.text',
        'Node.shape',
        'Node.align',
        'Node.maxTextWidth',
        'Node.lineHeight',
        'IRLineSpec',
      ]);
    }
    for (const contract of [nodeShapeConnectionContract, nodeShapeConnectionEnContract]) {
      expect(contract.relatedApis).toEqual(['Node.shape', 'Node.boundary', 'Draw.way']);
    }
    for (const contract of [coordinateFoldJunctionContract, coordinateFoldJunctionEnContract]) {
      expect(contract.relatedApis).toEqual(['Coordinate.position']);
    }
  });

  it('Coordinate 汇聚 demo 以两条路径表达汇聚与后续连线', () => {
    for (const locale of ['zh', 'en']) {
      const source = readContent(`coordinate/coordinate-fold-junction.${locale}.demo.tsx`);

      expect(source).toContain("<Draw way={['A', 'junction', 'out']} arrow=\"->\" stroke=\"gray\" />");
      expect(source.match(/^\s*<Draw way=/gm)).toHaveLength(2);
    }
  });

  it('形状 playground 的源码面板包含 boundary helper', () => {
    for (const locale of ['zh', 'en']) {
      expect(readContent(`overview/index.${locale}.mdx`)).toContain(
        "<ComponentPreview files={['node-shape-connection', 'node-shape-connection-boundary.ts']} size=\"md\" />",
      );
    }
  });

  it('节点标签使用 md 预览尺寸与 400px 输出宽度', () => {
    for (const locale of ['zh', 'en']) {
      expect(readContent(`overview/index.${locale}.mdx`)).toContain(
        '<ComponentPreview files="node-label" size="md" />',
      );
    }

    expect(readContent('overview/node-label.demo.tsx')).toContain('<Layout width={400} height={320}');
  });

  it('节点几何使用 sm 预览尺寸与 400px 输出宽度', () => {
    for (const locale of ['zh', 'en']) {
      expect(readContent(`overview/index.${locale}.mdx`)).toContain(
        '<ComponentPreview files="node-geometry" size="sm" />',
      );
    }

    expect(readContent('overview/node-geometry.demo.tsx')).toContain('<Layout width={400} height={240}');
  });

  it('所有可调节点预览均保持在 400px 输出宽度内', () => {
    expect(coordinateOffsetChainFrame).toMatchObject({ width: 400, height: 191 });
    expect(readContent('overview/node-position.demo.tsx')).toContain('<Layout width={400} height={229}');
    expect(readContent('overview/node-shape-connection.demo.tsx')).toContain('width={400}');
    expect(readContent('overview/node-shape-connection.demo.tsx')).toContain('height={185}');
    expect(readContent('overview/node-text.demo.tsx')).toContain('<Layout width={400} height={300}');
    for (const locale of ['zh', 'en']) {
      expect(readContent(`text/text-attrs.${locale}.demo.tsx`)).toContain('<Layout width={400} height={181}');
    }
  });

  it('Coordinate 比例定位由真实 Coordinate 承载', () => {
    const source = readContent('coordinate/coordinate-between.demo.tsx');

    expect(source).toMatch(/<Coordinate\s+id="Q"/);
    expect(source).toContain("position={{ of: 'Q', offset: [0, 0] }}");
  });

  it('会改变包围盒的 playground 使用固定 viewBox', () => {
    for (const path of [
      'overview/node-shape-connection.demo.tsx',
      'overview/node-styled.demo.tsx',
      'text/text-attrs.zh.demo.tsx',
      'text/text-attrs.en.demo.tsx',
    ]) {
      expect(readContent(path), path).toMatch(/viewBox=\{\{ x: -?\d+/);
    }
  });

  it('公共样式面板只暴露字体与外观字段', () => {
    const expectedIds = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'fill',
      'stroke',
      'strokeWidth',
      'dashed',
      'opacity',
    ];

    for (const definition of [nodeStyledControls, NodeStyledEnControls.nodeStyledControls]) {
      expect(definition.sections.flatMap(section => section.controls.map(field => field.id))).toEqual(expectedIds);
    }
  });

  it('标签仅在启用旋转时显示 keepUpright', () => {
    const visibleIds = (rotateMode: string, language: 'zh' | 'en') => {
      const definition = language === 'zh' ? nodeLabelControls : NodeLabelEnControls.nodeLabelControls;
      return resolveVisiblePreviewControlSections(definition.sections, {
        placement: 'outside',
        pinStyle: 'none',
        positionMode: 'direction',
        rotateMode,
      }).flatMap(section => section.controls.map(field => field.id));
    };

    for (const language of ['zh', 'en'] as const) {
      expect(visibleIds('none', language)).not.toContain('keepUpright');
      for (const rotateMode of ['radial', 'tangent', 'angle']) {
        expect(visibleIds(rotateMode, language)).toContain('keepUpright');
      }
    }
  });

  it('标签文本使用有界选项，固定 viewBox 可以覆盖所有面板极值', () => {
    for (const definition of [nodeLabelControls, NodeLabelEnControls.nodeLabelControls]) {
      const content = findControl(definition, 'labelText');

      expect(content).toMatchObject({ kind: 'select', defaultValue: 'label' });
      if (!content || content.kind !== 'select') throw new Error('Missing bounded Node label select');
      expect(content.options.map(option => option.value)).toEqual(['label', 'outside label', 'angled label']);
    }
  });

  it('中英文文本面板用有界多行选项共享中性默认内容', () => {
    for (const definition of [nodeTextControls, NodeTextEnControls.nodeTextControls]) {
      const content = findControl(definition, 'content');
      expect(content).toMatchObject({ kind: 'select', defaultValue: 'A\nB\nC' });
      if (!content || content.kind !== 'select') throw new Error('Missing bounded Node text select');
      expect(content.options.map(option => option.value)).toEqual([
        'A\nB\nC',
        'First\nSecond\nThird',
        'Short\nline\nset',
      ]);
    }
  });

  it('标签数组写法与子页相关链接仍可查阅', () => {
    expect(readContent('overview/index.zh.mdx')).toContain('label={[');
    expect(readContent('overview/index.en.mdx')).toContain('label={[');
    expect(readContent('text/index.zh.mdx')).toContain('/overview#文本');
    expect(readContent('text/index.en.mdx')).toContain('/overview#text');
    expect(readContent('custom-boundary/index.zh.mdx')).toContain('/overview#形状');
    expect(readContent('custom-boundary/index.en.mdx')).toContain('/overview#shapes');
  });
});
