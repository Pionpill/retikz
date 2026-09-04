import type { ScenePrimitive } from '@retikz/core';
import type { ReactElement } from 'react';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { GraphSchema } from '@retikz/graph';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { PreviewPanelControlItem } from '../src/modules/docs/components/component-preview';

import {
  loadPreviewResources,
  resolvePreviewControlContract,
} from '../src/modules/docs/components/component-preview/registry';
import { buildPreviewIR } from '../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../src/modules/docs/components/component-preview/vanilla-preview';
import { previewControlContract as blockBuiltinContract } from '../src/modules/docs/contents/schematic/graph/block/basic/block-builtin.controls';
import {
  BlockBuiltinPreview as BlockBuiltinPreviewEn,
  previewControls as blockBuiltinControlsEn,
  previewSource as blockBuiltinPreviewSourceEn,
} from '../src/modules/docs/contents/schematic/graph/block/basic/block-builtin.en.demo';
import {
  BlockBuiltinPreview,
  previewControls as blockBuiltinControls,
  previewSource as blockBuiltinPreviewSource,
} from '../src/modules/docs/contents/schematic/graph/block/basic/block-builtin.zh.demo';
import { previewSource as blockConnectionPreviewSourceEn } from '../src/modules/docs/contents/schematic/graph/block/basic/block-connection.en.demo';
import { previewSource as blockConnectionPreviewSource } from '../src/modules/docs/contents/schematic/graph/block/basic/block-connection.zh.demo';
import * as blockCustomPreviewModuleEn from '../src/modules/docs/contents/schematic/graph/block/basic/block-custom.en.demo';
import * as blockCustomPreviewModule from '../src/modules/docs/contents/schematic/graph/block/basic/block-custom.zh.demo';
import { previewControlContract as blockStyleContract } from '../src/modules/docs/contents/schematic/graph/block/basic/block-style.controls';
import { previewControlContract as blockStyleContractEn } from '../src/modules/docs/contents/schematic/graph/block/basic/block-style.en.controls';
import {
  BlockStylePreview as BlockStylePreviewEn,
  previewSource as blockStylePreviewSourceEn,
} from '../src/modules/docs/contents/schematic/graph/block/basic/block-style.en.demo';
import {
  BlockStylePreview,
  previewSource as blockStylePreviewSource,
} from '../src/modules/docs/contents/schematic/graph/block/basic/block-style.zh.demo';
import { createGraphPreviewSource } from '../src/modules/docs/preview';

const readContent = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const { previewSource: blockCustomPreviewSourceEn } = blockCustomPreviewModuleEn;
const { previewSource: blockCustomPreviewSource } = blockCustomPreviewModule;

type ControlledBlockCustomPreviewModule = {
  BlockCustomPreview: (values: {
    content: string;
    shape: 'rectangle' | 'circle' | 'ellipse' | 'diamond';
    fontSize: 'xs' | 'sm' | 'base' | 'lg';
    padding: number;
    minimumWidth: number;
    minimumHeight: number;
    rotate: number;
    cornerRadius: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    dashed: boolean;
    opacity: number;
    shadow: 'none' | 'sm' | 'md' | 'lg';
    textColor: string;
  }) => ReactElement<{
    width: number;
    height: number | 'auto';
    viewBox?: unknown;
  }>;
};

const isControlledBlockCustomPreviewModule = (value: object): value is ControlledBlockCustomPreviewModule =>
  typeof Reflect.get(value, 'BlockCustomPreview') === 'function';

const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

/** 按 renderer 的 marker 坐标变换计算箭头尖端的世界坐标 */
const arrowTipOf = (path: Extract<ScenePrimitive, { type: 'path' }>): readonly [number, number] | undefined => {
  const arrow = path.arrowEnd;
  const points = path.commands.flatMap(command => ('to' in command ? [command.to] : []));
  const end = points.at(-1);
  const previous = points.at(-2);
  if (arrow === undefined || end === undefined || previous === undefined) return undefined;

  const markerTipX = Math.max(
    ...arrow.marker.flatMap(marker =>
      marker.type === 'path' ? marker.commands.flatMap(command => ('to' in command ? [command.to[0]] : [])) : [],
    ),
  );
  const dx = end[0] - previous[0];
  const dy = end[1] - previous[1];
  const length = Math.hypot(dx, dy);
  const advance = ((markerTipX - arrow.refX) * arrow.markerWidth * (path.strokeWidth ?? 1)) / arrow.baseSize;

  return [end[0] + (dx / length) * advance, end[1] + (dy / length) * advance];
};

describe('Graph Block documentation', () => {
  it.each(['zh', 'en'] as const)('%s documents open Block content and independent structure composites', lang => {
    const landing = readContent(`src/modules/docs/contents/schematic/graph/block/index.${lang}.mdx`);
    const page = readContent(`src/modules/docs/contents/schematic/graph/block/basic/index.${lang}.mdx`);
    const api = readContent(`src/modules/docs/contents/schematic/graph/api-reference/index.${lang}.mdx`);

    expect(landing).toContain('/schematic/graph/block/basic');
    expect(landing).toContain('/schematic/graph/block/builtin');
    expect(landing).toContain('/schematic/graph/block/extension');
    expect(landing).toContain(lang === 'zh' ? '内置实现' : 'Built-in Implementation');

    const sections = [
      '## ' + (lang === 'zh' ? '用法' : 'Usage'),
      '## ' + (lang === 'zh' ? '例子' : 'Examples'),
      '## ' + (lang === 'zh' ? '技术原理' : 'How it works'),
      '## ' + (lang === 'zh' ? 'API 参考' : 'API Reference'),
    ];
    const positions = sections.map(section => page.indexOf(section));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(page).toContain('BlockHeader');
    expect(page).toContain('BlockSection');
    expect(page).toContain('BlockRow');
    expect(page).toContain('NodeTarget + anchor / boundary');
    expect(page).toContain('files="block-builtin"');
    expect(page).toMatch(/files="block-builtin"\s+size="md"/);
    expect(page).toContain('files="block-custom"');
    expect(page).toMatch(/files="block-custom"\s+size="lg"/);
    expect(page).toContain('files="block-connection"');
    expect(page).toContain('files="block-style"');
    expect(page).toContain(lang === 'zh' ? '支持完整的 Core Scope' : 'supports the complete Core Scope');
    expect(page).toContain('localNamespace');
    expect(page).toContain(
      lang === 'zh' ? '命名 Graph Theme 会为 Block 根外框提供' : 'A named Graph Theme supplies the Block root shell',
    );
    expect(page).toContain(lang === 'zh' ? '完整顶层字段替换' : 'complete top-level field replacement');
    expect(page).toContain(lang === 'zh' ? '不会自动添加 Block 前缀' : 'do not automatically receive a Block prefix');
    expect(lang === 'zh' ? page : page.toLowerCase()).toContain(
      lang === 'zh' ? '任意有序 children' : 'arbitrary ordered children',
    );
    expect(page).toContain('width?');
    expect(page).toContain('minWidth?');
    expect(page).toContain('direction?');
    expect(page).toContain('itemGap?');
    expect(page).toContain('justifyContent?');
    expect(page).toContain('content?');
    expect(page).toContain('IRBlockText \\| IRBlockText[]');
    expect(page).toContain(lang === 'zh' ? '与 `children` 互斥' : 'mutually exclusive with `children`');
    expect(page).toContain(lang === 'zh' ? '支持字符串或文本对象' : 'String or text object');
    expect(page).toContain(lang === 'zh' ? '默认 `base`、粗体' : 'defaults to `base` and bold');
    expect(page).toContain(lang === 'zh' ? '默认 `xs`' : 'defaults to `xs`');
    expect(page).not.toContain('| `header`');
    expect(page).not.toContain('| `sections?`');
    expect(readContent(`src/modules/docs/contents/schematic/graph/block/basic/block-style.${lang}.demo.tsx`)).toContain(
      'previewControls',
    );
    expect(
      readContent(`src/modules/docs/contents/schematic/graph/block/basic/block-builtin.${lang}.demo.tsx`),
    ).toContain('previewControls');
    expect(page).toContain('trail?');
    expect(page).not.toContain('trailing?');
    expect(page).not.toContain('BlockHeader.trailing');
    expect(api).toContain('BlockSchema');
    expect(api).toContain('BlockProviderKey');
    expect(api).toContain('BlockInputEmbedAdapter');
    expect(api).toContain('GraphSurfaceThemeStyleTokens');
    expect(api).toContain('trail');
  });

  it('keeps the built-in example minimal in executable IR and Vanilla code views', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const preview = buildPreviewIR(() => blockBuiltinPreviewSource.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview);

      expect(vanilla.code).toContain("block('preview-block-1'");
      expect(vanilla.code).toContain('BlockInputEmbedAdapter');
      expect(vanilla.code).toContain("blockHeader('preview-blockHeader-1'");
      expect(vanilla.code).toContain('BlockHeaderInputEmbedAdapter');
      expect(vanilla.code).toContain("blockSection('preview-blockSection-1'");
      expect(vanilla.code).toContain("blockRow('preview-blockRow-1'");
      expect(vanilla.code).toContain("title: 'User'");
      expect(vanilla.code).toContain("description: '领域实体'");
      expect(vanilla.code).not.toContain("direction: 'vertical'");
      expect(vanilla.code).not.toContain('itemGap: 4');
      expect(vanilla.code).not.toContain("justifyContent: 'start'");
      expect(vanilla.code).not.toContain('icon:');
      expect(vanilla.code).not.toContain('trail:');
      expect(vanilla.code).not.toContain('basis: 0');
      expect(vanilla.code).not.toContain('grow: 1');
      expect(vanilla.code).not.toContain('child: node({');
      expect(vanilla.code).toContain("content: ['name', 'string']");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps custom Header slots and an arbitrary body child in Source IR and Vanilla code', () => {
    const preview = buildPreviewIR(() => blockCustomPreviewSource.canonicalRender?.() ?? null);
    const source = JSON.stringify(preview.sourceIr);
    const vanilla = buildVanillaPreview(preview);

    expect(source).toContain('"icon"');
    expect(source).toContain('"trail"');
    expect(source).not.toContain('"trailing"');
    expect(source).toContain('"text":"Cache hit rate 98.7%"');
    expect(vanilla.code).toContain('icon: node({');
    expect(vanilla.code).toContain('trail: node({');
    expect(vanilla.code).toContain("text: 'Cache hit rate 98.7%'");
  });

  it.each(['zh', 'en'] as const)('%s exposes a text control for custom Node content', async lang => {
    const result = await loadPreviewResources({
      segments: ['schematic', 'graph', 'block', 'basic'],
      name: 'block-custom',
      lang,
      controlName: null,
      controlsDisabled: false,
      sourceFiles: [],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const contract = resolvePreviewControlContract(result.resources.controlModule);
    expect(contract).toBeDefined();
    if (contract === undefined) return;
    expect(contract.controls.presentation).toBe('panel');
    if (contract.controls.presentation !== 'panel') return;

    expect(
      contract.controls.sections.flatMap(section =>
        section.controls.map(control => ({
          id: control.id,
          kind: control.kind,
          defaultValue: control.kind === 'table' ? undefined : control.defaultValue,
          visibleWhen: control.visibleWhen,
        })),
      ),
    ).toEqual([
      { id: 'content', kind: 'text', defaultValue: 'Cache hit rate 98.7%', visibleWhen: undefined },
      { id: 'fontSize', kind: 'select', defaultValue: 'sm', visibleWhen: undefined },
      { id: 'shape', kind: 'select', defaultValue: 'diamond', visibleWhen: undefined },
      { id: 'padding', kind: 'range', defaultValue: 10, visibleWhen: undefined },
      { id: 'minimumWidth', kind: 'range', defaultValue: 160, visibleWhen: undefined },
      { id: 'minimumHeight', kind: 'range', defaultValue: 40, visibleWhen: undefined },
      { id: 'rotate', kind: 'range', defaultValue: 0, visibleWhen: undefined },
      {
        id: 'cornerRadius',
        kind: 'range',
        defaultValue: 6,
        visibleWhen: { controlId: 'shape', oneOf: ['rectangle'] },
      },
      { id: 'fill', kind: 'color', defaultValue: '#e2e8f0', visibleWhen: undefined },
      { id: 'stroke', kind: 'color', defaultValue: '#64748b', visibleWhen: undefined },
      { id: 'strokeWidth', kind: 'range', defaultValue: 1, visibleWhen: undefined },
      { id: 'dashed', kind: 'switch', defaultValue: false, visibleWhen: undefined },
      { id: 'opacity', kind: 'range', defaultValue: 1, visibleWhen: undefined },
      { id: 'shadow', kind: 'select', defaultValue: 'none', visibleWhen: undefined },
      { id: 'textColor', kind: 'color', defaultValue: '#0f172a', visibleWhen: undefined },
    ]);
    expect(contract.canonicalValues).toEqual({
      content: 'Cache hit rate 98.7%',
      fontSize: 'sm',
      shape: 'diamond',
      padding: 10,
      minimumWidth: 160,
      minimumHeight: 40,
      rotate: 0,
      cornerRadius: 6,
      fill: '#e2e8f0',
      stroke: '#64748b',
      strokeWidth: 1,
      dashed: false,
      opacity: 1,
      shadow: 'none',
      textColor: '#0f172a',
    });
    expect(contract.relatedApis).toEqual([
      'Block.children',
      'Node.children',
      'Node.font',
      'Node.shape',
      'Node.padding',
      'Node.minimumSize',
      'Node.rotate',
      'Node.cornerRadius',
      'Node.fill',
      'Node.stroke',
      'Node.strokeWidth',
      'Node.dashed',
      'Node.opacity',
      'Node.shadow',
      'Node.textColor',
    ]);
  });

  it.each([
    ['zh', blockCustomPreviewModule, '队列深度 42'],
    ['en', blockCustomPreviewModuleEn, 'Queue depth 42'],
  ] as const)('%s compiles edited custom Node content into Source IR and Vanilla', (_lang, module, content) => {
    expect(isControlledBlockCustomPreviewModule(module)).toBe(true);
    if (!isControlledBlockCustomPreviewModule(module)) return;

    const source = createGraphPreviewSource(() =>
      module.BlockCustomPreview({
        content,
        fontSize: 'base',
        shape: 'diamond',
        padding: 16,
        minimumWidth: 192,
        minimumHeight: 64,
        rotate: 25,
        cornerRadius: 12,
        fill: '#fef3c7',
        stroke: '#d97706',
        strokeWidth: 3,
        dashed: true,
        opacity: 0.75,
        shadow: 'md',
        textColor: '#78350f',
      }),
    );
    const preview = buildPreviewIR(() => source.canonicalRender?.() ?? null);
    const sourceIr = JSON.stringify(preview.sourceIr);
    const vanilla = buildVanillaPreview(preview);

    expect(sourceIr).toContain(`"text":"${content}"`);
    expect(sourceIr).toContain('"shape":"diamond"');
    expect(sourceIr).toContain('"font":{"size":"base"}');
    expect(sourceIr).toContain('"padding":16');
    expect(sourceIr).toContain('"minimumSize":{"width":192,"height":64}');
    expect(sourceIr).toContain('"rotate":25');
    expect(sourceIr).toContain('"cornerRadius":12');
    expect(sourceIr).toContain('"fill":"#fef3c7"');
    expect(sourceIr).toContain('"stroke":"#d97706"');
    expect(sourceIr).toContain('"strokeWidth":3');
    expect(sourceIr).toContain('"dashed":true');
    expect(sourceIr).toContain('"opacity":0.75');
    expect(sourceIr).toContain('"shadow":"md"');
    expect(sourceIr).toContain('"textColor":"#78350f"');
    expect(vanilla.code).toContain(`text: '${content}'`);
    expect(vanilla.code).toContain("shape: 'diamond'");
    expect(vanilla.code).toContain("font: { size: 'base' }");
    expect(vanilla.code).toContain('padding: 16');
    expect(vanilla.code).toContain('minimumSize: { width: 192, height: 64 }');
    expect(vanilla.code).toContain('rotate: 25');
    expect(vanilla.code).toContain('cornerRadius: 12');
    expect(vanilla.code).toContain("fill: '#fef3c7'");
    expect(vanilla.code).toContain("stroke: '#d97706'");
    expect(vanilla.code).toContain('strokeWidth: 3');
    expect(vanilla.code).toContain('dashed: true');
    expect(vanilla.code).toContain('opacity: 0.75');
    expect(vanilla.code).toContain("shadow: 'md'");
    expect(vanilla.code).toContain("textColor: '#78350f'");
  });

  it.each([
    ['zh', blockCustomPreviewModule],
    ['en', blockCustomPreviewModuleEn],
  ] as const)('%s keeps the custom viewport at a natural 1:1 scale', (_lang, module) => {
    expect(isControlledBlockCustomPreviewModule(module)).toBe(true);
    if (!isControlledBlockCustomPreviewModule(module)) return;

    const element = module.BlockCustomPreview({
      content: 'Cache hit rate 98.7%',
      fontSize: 'lg',
      shape: 'diamond',
      padding: 24,
      minimumWidth: 224,
      minimumHeight: 96,
      rotate: 45,
      cornerRadius: 6,
      fill: '#e2e8f0',
      stroke: '#64748b',
      strokeWidth: 1,
      dashed: true,
      opacity: 1,
      shadow: 'lg',
      textColor: '#0f172a',
    });

    expect(element.props.width).toBe(420);
    expect(element.props.height).toBe(340);
    expect(element.props.viewBox).toEqual({ x: -90, y: -64, width: 420, height: 340 });
  });

  it('keeps the built-in controls structurally aligned across languages', () => {
    const shapeOf = (controls: {
      readonly sections: ReadonlyArray<{
        readonly controls: ReadonlyArray<{
          readonly id: string;
          readonly kind: string;
          readonly defaultValue: unknown;
        }>;
      }>;
    }) =>
      controls.sections.flatMap(section =>
        section.controls.map(control => `${control.id}:${control.kind}:${JSON.stringify(control.defaultValue)}`),
      );

    const expectedShape = [
      'showSecondSection:switch:true',
      'showExtraRow:switch:true',
      'blockGap:range:8',
      'headerDirection:select:"vertical"',
      'sectionGap:range:4',
      'rowItemCount:select:"2"',
      'rowGap:range:8',
    ];

    expect(shapeOf(blockBuiltinControls)).toEqual(expectedShape);
    expect(shapeOf(blockBuiltinControlsEn)).toEqual(expectedShape);
    expect(JSON.stringify(blockBuiltinControls)).toContain('添加第二个 Section');
    expect(JSON.stringify(blockBuiltinControlsEn)).toContain('Add second Section');
    expect(JSON.stringify(blockBuiltinControls)).toContain('排列方向');
    expect(JSON.stringify(blockBuiltinControlsEn)).toContain('Direction');
    expect(JSON.stringify(blockBuiltinControls)).not.toContain('showSection');
    expect(JSON.stringify(blockBuiltinControlsEn)).not.toContain('showSection');
  });

  it('applies the Header direction control to Source IR', () => {
    const horizontalSource = createGraphPreviewSource(() =>
      BlockBuiltinPreview({
        ...blockBuiltinContract.canonicalValues,
        headerDirection: 'horizontal',
      }),
    );
    const preview = buildPreviewIR(() => horizontalSource.canonicalRender?.() ?? null);

    expect(JSON.stringify(preview.sourceIr)).toContain('"direction":"horizontal"');
  });

  it('在可见 Source IR 中只保留 BlockRow content 输入', () => {
    const preview = buildPreviewIR(() => blockBuiltinPreviewSource.canonicalRender?.() ?? null);
    const source = JSON.stringify(preview.sourceIr);

    expect(source).not.toContain('"margin":0');
    expect(source).not.toContain('"textColor":"currentColor"');
    expect(source).not.toContain('"padding":8');
    expect(source).not.toContain('"gap":8');
    expect(source).not.toContain('"gap":4');
    expect(source).not.toContain('"background"');
    expect(source).not.toContain('"border"');
    expect(source).not.toContain('"width":240');
    expect(source).not.toContain('"minWidth":240');
    expect(source).not.toContain('"key":');
    expect(source).not.toContain('"child":');
    expect(source).not.toContain('"padding":0');
    expect(source).not.toContain('"fill":"none"');
    expect(source).not.toContain('"position":[0,0],"text":"name"');
    expect(source).toContain('"content":["name","string"]');
    expect(source).toContain('"content":["email","string"]');
    expect(source.match(/"type":"blockSection"/g)).toHaveLength(2);
  });

  it('derives the built-in viewport from the actual Block layout', () => {
    const canonical = buildPreviewIR(() => blockBuiltinPreviewSource.canonicalRender?.() ?? null);
    const canonicalEn = buildPreviewIR(() => blockBuiltinPreviewSourceEn.canonicalRender?.() ?? null);
    const defaultValues = { ...blockBuiltinContract.canonicalValues, rowItemCount: '2' as const };
    const defaultElement = BlockBuiltinPreview(defaultValues);
    const defaultElementEn = BlockBuiltinPreviewEn(defaultValues);
    const values = {
      ...blockBuiltinContract.canonicalValues,
      showSecondSection: true,
      showExtraRow: true,
      blockGap: 24,
      sectionGap: 24,
      rowItemCount: '2' as const,
      rowGap: 24,
    };
    const maximalSource = createGraphPreviewSource(() => BlockBuiltinPreview(values));
    const maximal = buildPreviewIR(() => maximalSource.canonicalRender?.() ?? null);
    const maximalElement = BlockBuiltinPreview(values);

    expect(canonical.ir.viewBox).toBeUndefined();
    expect(canonicalEn.ir.viewBox).toBeUndefined();
    expect(maximal.ir.viewBox).toBeUndefined();
    expect(defaultElement.props.width).toBe(260);
    expect(defaultElement.props.height).toBe('auto');
    expect(defaultElement.props.viewBox).toBeUndefined();
    expect(defaultElementEn.props.width).toBe(260);
    expect(defaultElementEn.props.height).toBe('auto');
    expect(defaultElementEn.props.viewBox).toBeUndefined();
    expect(maximalElement.props.width).toBe(260);
    expect(maximalElement.props.height).toBe('auto');
    expect(maximalElement.props.viewBox).toBeUndefined();
  });

  it('为 Block 外框、Header 文字与 Row content 暴露双语一致的完整样式 controls', () => {
    const fieldContractOf = (contract: typeof blockStyleContract | typeof blockStyleContractEn) =>
      contract.controls.sections.flatMap(section =>
        section.controls.map(control => ({
          kind: control.kind,
          id: control.id,
          defaultValue: control.defaultValue,
        })),
      );
    const expected = [
      { kind: 'range', id: 'backgroundOpacity', defaultValue: 0.04 },
      { kind: 'range', id: 'borderWidth', defaultValue: 1 },
      { kind: 'range', id: 'cornerRadius', defaultValue: 8 },
      { kind: 'range', id: 'padding', defaultValue: 8 },
      { kind: 'color', id: 'headerTitleTextColor', defaultValue: 'currentColor' },
      { kind: 'select', id: 'headerTitleFontSize', defaultValue: 'base' },
      { kind: 'select', id: 'headerTitleFontWeight', defaultValue: 'bold' },
      { kind: 'select', id: 'headerTitleFontStyle', defaultValue: 'normal' },
      { kind: 'range', id: 'headerTitleOpacity', defaultValue: 1 },
      { kind: 'color', id: 'headerDescriptionTextColor', defaultValue: 'currentColor' },
      { kind: 'select', id: 'headerDescriptionFontSize', defaultValue: 'xs' },
      { kind: 'select', id: 'headerDescriptionFontWeight', defaultValue: 'normal' },
      { kind: 'select', id: 'headerDescriptionFontStyle', defaultValue: 'normal' },
      { kind: 'range', id: 'headerDescriptionOpacity', defaultValue: 0.7 },
      { kind: 'color', id: 'rowContentTextColor', defaultValue: '#64748b' },
      { kind: 'select', id: 'rowContentFontSize', defaultValue: 'sm' },
      { kind: 'select', id: 'rowContentFontWeight', defaultValue: 'normal' },
      { kind: 'select', id: 'rowContentFontStyle', defaultValue: 'italic' },
      { kind: 'range', id: 'rowContentOpacity', defaultValue: 0.8 },
    ];

    expect(fieldContractOf(blockStyleContract)).toEqual(expected);
    expect(fieldContractOf(blockStyleContractEn)).toEqual(expected);
    expect(blockStyleContractEn.canonicalValues).toEqual(blockStyleContract.canonicalValues);
    expect(blockStyleContract.controls.title).toBe('结构块样式');
    expect(blockStyleContract.controls.sections.map(section => section.label)).toEqual([
      '整体外框',
      '标题区文字',
      '行内容',
    ]);
    const styleControls: Array<PreviewPanelControlItem> = [];
    blockStyleContract.controls.sections.forEach(section => {
      section.controls.forEach(control => styleControls.push(control));
    });
    expect(
      styleControls
        .filter(control => control.id.endsWith('FontSize'))
        .flatMap(control => (control.kind === 'select' ? control.options.map(option => option.label) : [])),
    ).toEqual([
      '极小（xs）',
      '小（sm）',
      '常规（base）',
      '大（lg）',
      '极小（xs）',
      '小（sm）',
      '常规（base）',
      '大（lg）',
      '极小（xs）',
      '小（sm）',
      '常规（base）',
      '大（lg）',
    ]);
  });

  it.each([
    ['zh', BlockStylePreview],
    ['en', BlockStylePreviewEn],
  ] as const)('%s writes Header and Row text style controls into Source IR and Vanilla', (_lang, Preview) => {
    const values = {
      ...blockStyleContract.canonicalValues,
      headerTitleTextColor: '#dc2626',
      headerTitleFontSize: 'lg' as const,
      headerTitleFontWeight: 'normal' as const,
      headerTitleFontStyle: 'italic' as const,
      headerTitleOpacity: 0.65,
      headerDescriptionTextColor: '#2563eb',
      headerDescriptionFontSize: 'base' as const,
      headerDescriptionFontWeight: 'bold' as const,
      headerDescriptionFontStyle: 'italic' as const,
      headerDescriptionOpacity: 0.55,
      rowContentTextColor: '#16a34a',
      rowContentFontSize: 'lg' as const,
      rowContentFontWeight: 'bold' as const,
      rowContentFontStyle: 'normal' as const,
      rowContentOpacity: 0.45,
    };
    const previewSource = createGraphPreviewSource(() => Preview(values));
    const preview = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null);
    const source = JSON.stringify(preview.sourceIr);
    const vanilla = buildVanillaPreview(preview).code;

    expect(source).toContain(
      '"title":{"text":"UserRepository","textColor":"#dc2626","font":{"size":"lg","weight":"normal","style":"italic"},"opacity":0.65}',
    );
    expect(source).toContain('"textColor":"#2563eb","font":{"size":"base","weight":"bold","style":"italic"}');
    expect(source).toContain('"content":{"text":"findById(id)","textColor":"#16a34a"');
    expect(source).toContain('"font":{"size":"lg","weight":"bold","style":"normal"},"opacity":0.45');
    expect(vanilla).toContain("textColor: '#dc2626'");
    expect(vanilla).toContain("font: { size: 'base', weight: 'bold', style: 'italic' }");
    expect(vanilla).toContain("textColor: '#16a34a'");
    expect(vanilla).toContain("font: { size: 'lg', weight: 'bold', style: 'normal' }");
  });

  it('在 Source IR 与 Vanilla 中保留 Row 文本对象而不生成 Node 外壳', () => {
    const preview = buildPreviewIR(() => blockStylePreviewSource.canonicalRender?.() ?? null);
    const source = JSON.stringify(preview.sourceIr);
    const vanilla = buildVanillaPreview(preview);

    expect(source).toContain('"content":{"text":"findById(id)"');
    expect(source).toContain('"textColor":"#64748b"');
    expect(source).toContain('"font":{"size":"sm","weight":"normal","style":"italic"}');
    expect(source).toContain('"opacity":0.8');
    expect(source).not.toContain('"child":{"type":"node"');
    expect(vanilla.code).toContain("text: 'findById(id)'");
    expect(vanilla.code).toContain("textColor: '#64748b'");
    expect(vanilla.code).toContain("font: { size: 'sm', weight: 'normal', style: 'italic' }");
    expect(vanilla.code).toContain('opacity: 0.8');
    expect(vanilla.code).not.toContain('child: node({');
  });

  it.each([
    ['zh', blockConnectionPreviewSource],
    ['en', blockConnectionPreviewSourceEn],
  ] as const)(
    '%s connects two Entities to the whole Block and one Section with folded routes',
    (_lang, previewSource) => {
      const preview = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null);
      const source = JSON.stringify(preview.sourceIr);
      const graph = GraphSchema.parse(preview.sourceIr.children[0]);
      const children = graph.children ?? [];
      const caller = children.find(child => child.type === 'entity' && child.id === 'caller');
      const validator = children.find(child => child.type === 'entity' && child.id === 'validator');

      expect(source.match(/"type":"entity"/g)).toHaveLength(2);
      expect(source.match(/"type":"relation"/g)).toHaveLength(2);
      expect(source).toContain('"width":240');
      expect(caller).toMatchObject({
        position: [-150, 57.6],
      });
      expect(validator).toMatchObject({
        position: [430, 57.6],
      });
      expect(source).toContain('"source":{"id":"caller","anchor":"right"}');
      expect(source).toContain(
        '"target":{"id":"user","anchor":"left","boundary":{"type":"rectangle","params":{"fit":"tight","gap":8.5}}}',
      );
      expect(source).toContain('"source":{"id":"validator","anchor":"left"}');
      expect(source).toContain(
        '"target":{"id":"user.fields","anchor":"right","boundary":{"type":"rectangle","params":{"fit":"tight","gap":8.5}}}',
      );
      expect(source).toContain('"kind":"fold","to":[232.5,80.4],"via":"-|-"');
      expect(source.match(/"type":"rectangle","params":\{"fit":"tight","gap":8.5\}/g)).toHaveLength(3);
      expect(source.match(/"kind":"fold"/g)).toHaveLength(2);
      expect(source.match(/"via":"-\|-"/g)).toHaveLength(2);
    },
  );

  it.each([
    ['zh', blockConnectionPreviewSource],
    ['en', blockConnectionPreviewSourceEn],
  ] as const)('%s lands relation arrow tips on the visible Block and Section boundaries', (_lang, previewSource) => {
    const preview = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null);
    const definitions = resolveCoreProviderDependencies({ contributions: preview.contributions });
    const { viewBox: _viewBox, ...ir } = preview.ir;
    void _viewBox;
    const result = compileToScene(ir, { ...definitions, padding: 0 });
    const arrowPaths = primitivesOf(result.scene.primitives).filter(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> =>
        primitive.type === 'path' && primitive.arrowEnd !== undefined,
    );
    const surfaceBounds = (instanceId: string) =>
      result.spatialHandles.entries.find(
        entry =>
          entry.role === 'surface' &&
          entry.ownerPath.at(-1)?.namespace === 'standard' &&
          entry.ownerPath.at(-1)?.type === 'surface' &&
          entry.ownerPath.at(-1)?.instanceId === instanceId,
      )?.geometry.bounds;
    const blockBounds = surfaceBounds('user');
    const sectionBounds = surfaceBounds('user.fields');

    expect(arrowPaths).toHaveLength(2);
    expect(blockBounds).toBeDefined();
    expect(sectionBounds).toBeDefined();
    if (blockBounds === undefined || sectionBounds === undefined) return;

    const blockTip = arrowTipOf(arrowPaths[0]);
    const sectionTip = arrowTipOf(arrowPaths[1]);
    expect(blockTip).toBeDefined();
    expect(sectionTip).toBeDefined();
    if (blockTip === undefined || sectionTip === undefined) return;

    expect(blockTip[0]).toBeCloseTo(blockBounds.x, 5);
    expect(sectionTip[0]).toBeCloseTo(sectionBounds.x + sectionBounds.width, 5);
  });

  it.each([
    ['built-in', blockBuiltinPreviewSource],
    ['custom zh', blockCustomPreviewSource],
    ['custom en', blockCustomPreviewSourceEn],
    ['connection', blockConnectionPreviewSource],
    ['style', blockStylePreviewSource],
  ] as const)('renders the %s preview canonical state', (_name, previewSource) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(buildPreviewIR(() => previewSource.canonicalRender?.() ?? null)).not.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it.each([
    ['connection zh', blockConnectionPreviewSource],
    ['connection en', blockConnectionPreviewSourceEn],
    ['style zh', blockStylePreviewSource],
    ['style en', blockStylePreviewSourceEn],
  ] as const)('centers the %s viewBox on its compiled visual layout', (_name, previewSource) => {
    const preview = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null);
    const viewBox = preview.ir.viewBox;
    expect(viewBox).toBeDefined();
    if (viewBox === undefined) return;

    const { viewBox: _viewBox, ...ir } = preview.ir;
    void _viewBox;
    const definitions = resolveCoreProviderDependencies({ contributions: preview.contributions });
    const layout = compileToScene(ir, { ...definitions, padding: 0 }).scene.layout;

    const viewCenter = {
      x: viewBox.x + viewBox.width / 2,
      y: viewBox.y + viewBox.height / 2,
    };
    const layoutCenter = {
      x: layout.x + layout.width / 2,
      y: layout.y + layout.height / 2,
    };
    // Node 与浏览器字体度量存在小幅差异；容差仍远小于未居中时 25–142 px 的偏移
    expect(Math.abs(viewCenter.x - layoutCenter.x)).toBeLessThanOrEqual(16);
    expect(Math.abs(viewCenter.y - layoutCenter.y)).toBeLessThanOrEqual(16);
  });
});
