import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { resolveVisiblePreviewControlSections } from '../../src/modules/docs/components/component-preview/controls';
import { nodeLabelControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-label.controls';
import * as NodeLabelEnControls from '../../src/modules/docs/contents/kernel/components/node/overview/node-label.en.controls';
import { nodeStyledControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-styled.controls';
import * as NodeStyledEnControls from '../../src/modules/docs/contents/kernel/components/node/overview/node-styled.en.controls';
import { nodeTextControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-text.controls';
import * as NodeTextEnControls from '../../src/modules/docs/contents/kernel/components/node/overview/node-text.en.controls';

const contentRoot = resolve('src/modules/docs/contents/kernel/components/node');
const readContent = (path: string): string => readFileSync(resolve(contentRoot, path), 'utf8');
const findControl = (definition: PreviewControlsDefinition, id: string) =>
  definition.presentation === 'panel'
    ? definition.sections.flatMap(section => section.controls).find(field => field.id === id)
    : definition.controls.find(field => field.id === id);

describe('Node controls documentation', () => {
  it('形状 playground 的源码面板包含 boundary helper', () => {
    for (const locale of ['zh', 'en']) {
      expect(readContent(`overview/index.${locale}.mdx`)).toContain(
        "<ComponentPreview files={['node-shape-connection', 'node-shape-connection-boundary.ts']} size=\"xl\" />",
      );
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

  it('中英文文本面板共享中性默认内容', () => {
    for (const definition of [nodeTextControls, NodeTextEnControls.nodeTextControls]) {
      const content = findControl(definition, 'content');
      expect(content?.defaultValue).toBe('A\nB\nC');
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
