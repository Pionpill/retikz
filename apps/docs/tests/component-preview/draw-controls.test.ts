import { DrawWay } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlField,
  PreviewControlsDefinition,
} from '../../src/modules/docs/components/component-preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { WayCyclePresentationByState } from '../../src/modules/docs/contents/kernel/components/draw/way/way-cycle.data';
import {
  WayAccumulateStart,
  WayRelativeFirstOffset,
  WayRelativeSafetyPadding,
  WayRelativeStart,
  WayRelativeViewBox,
} from '../../src/modules/docs/contents/kernel/components/draw/way/way-relative.data';

// 动态收集 Draw 分组下 24 组中英文面板定义
const controlModules = import.meta.glob<Record<string, unknown>>(
  '../../src/modules/docs/contents/kernel/components/draw/**/*.controls.ts',
  { eager: true },
);

const curveDemoSources = import.meta.glob<string>(
  [
    '../../src/modules/docs/contents/kernel/components/draw/overview/draw-curve.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/step/step-curves.demo.tsx',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

const fillStackDemoSources = import.meta.glob<string>(
  '../../src/modules/docs/contents/kernel/components/draw/overview/draw-fill-stack.demo.tsx',
  { eager: true, query: '?raw', import: 'default' },
);

const wayDemoSources = import.meta.glob<string>(
  [
    '../../src/modules/docs/contents/kernel/components/draw/way/way-fold.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/way/way-cycle.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/way/way-relative.demo.tsx',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

const pathPanelDemoSources = import.meta.glob<string>(
  [
    '../../src/modules/docs/contents/kernel/components/draw/path/path-boundary.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/path/path-stroke-paint.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/path/path-z-index.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/path/path-outin-loop.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/path/path-transform.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/path/path-marks.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/ribbon/ribbon-label.zh.demo.tsx',
    '../../src/modules/docs/contents/kernel/components/draw/ribbon/ribbon-label.en.demo.tsx',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

const arrowAppearanceDemoSources = import.meta.glob<string>(
  '../../src/modules/docs/contents/kernel/components/draw/arrow/arrow-appearance.demo.tsx',
  { eager: true, query: '?raw', import: 'default' },
);

/** 从 controls 模块中取出声明式定义 */
const definitionOf = (module: Record<string, unknown>): PreviewControlsDefinition => {
  const definition = Object.values(module).find(value => {
    if (typeof value !== 'object' || value === null) return false;
    const presentation = Reflect.get(value, 'presentation');
    return presentation === 'panel' || presentation === 'overlay';
  });
  if (definition === undefined) throw new Error('Controls module has no preview definition.');
  return definition as PreviewControlsDefinition;
};

/** 去除翻译文案后保留字段的行为契约 */
const fieldContractOf = (field: PreviewControlField) => ({
  id: field.id,
  kind: field.kind,
  defaultValue: field.defaultValue,
  min: 'min' in field ? field.min : undefined,
  max: 'max' in field ? field.max : undefined,
  step: 'step' in field ? field.step : undefined,
  options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  visibleWhen: field.visibleWhen,
});

describe('Draw family controls', () => {
  it('所有中文真源都有行为一致的英文定义', () => {
    const canonicalEntries = Object.entries(controlModules).filter(
      ([path]) => !path.endsWith('.en.controls.ts') && !path.endsWith('.zh.controls.ts'),
    );
    expect(canonicalEntries).toHaveLength(24);

    for (const [path, module] of canonicalEntries) {
      const englishPath = path.replace(/\.controls\.ts$/, '.en.controls.ts');
      const englishModule = controlModules[englishPath];
      expect(englishModule, `Missing English controls for ${path}`).toBeDefined();

      const canonicalFields = getPreviewControlFields(definitionOf(module)).map(fieldContractOf);
      const englishFields = getPreviewControlFields(definitionOf(englishModule)).map(fieldContractOf);
      expect(englishFields, `Controls contract differs for ${path}`).toEqual(canonicalFields);
    }
  });

  it('Draw 与 Step 曲线锁定完整 kind 集合和 point 字段', () => {
    const cases = [
      {
        path: '../../src/modules/docs/contents/kernel/components/draw/overview/draw-curve.controls.ts',
        kindId: 'curveKind',
        kinds: ['curve', 'cubic', 'bend', 'arc', 'circle', 'ellipse'],
        points: ['control', 'control1', 'control2'],
      },
      {
        path: '../../src/modules/docs/contents/kernel/components/draw/step/step-curves.controls.ts',
        kindId: 'stepKind',
        kinds: ['curve', 'cubic', 'bend', 'smooth', 'arc', 'circlePath', 'ellipsePath'],
        points: ['control', 'control1', 'control2'],
      },
    ] as const;

    for (const testCase of cases) {
      const fields = getPreviewControlFields(definitionOf(controlModules[testCase.path]));
      const kindField = fields.find(field => field.id === testCase.kindId);
      expect(kindField?.kind).toBe('select');
      expect(kindField?.kind === 'select' ? kindField.options.map(option => option.value) : []).toEqual(testCase.kinds);

      for (const pointId of testCase.points) {
        const pointField = fields.find(field => field.id === pointId);
        expect(pointField?.kind, `${testCase.path}:${pointId}`).toBe('point');
        expect(pointField?.visibleWhen).toBeDefined();
      }
    }
  });

  it('Draw 与 Step 曲线用 dotted 辅助线区分 dashed Node 边框', () => {
    expect(Object.keys(curveDemoSources)).toHaveLength(2);

    const expectedDottedGuides = {
      '../../src/modules/docs/contents/kernel/components/draw/overview/draw-curve.demo.tsx': 10,
      '../../src/modules/docs/contents/kernel/components/draw/step/step-curves.demo.tsx': 11,
    } as const;

    for (const [path, source] of Object.entries(curveDemoSources)) {
      const dottedGuides = source.match(/dashPattern=\{\[1, 4\]\}\s+lineCap="round"/g) ?? [];
      expect(dottedGuides, path).toHaveLength(expectedDottedGuides[path as keyof typeof expectedDottedGuides]);
      expect(source, path).not.toContain('dashPattern={[5, 5]}');
    }
  });

  it('Arrow 用一个面板覆盖方向、内置形状与起末覆盖', () => {
    const controlsPath = '../../src/modules/docs/contents/kernel/components/draw/arrow/arrow-appearance.controls.ts';
    const fields = getPreviewControlFields(definitionOf(controlModules[controlsPath]));

    expect(fields.map(fieldContractOf)).toEqual([
      {
        id: 'direction',
        kind: 'select',
        defaultValue: '<->',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['none', '->', '<-', '<->'],
        visibleWhen: undefined,
      },
      {
        id: 'shape',
        kind: 'select',
        defaultValue: 'stealth',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['normal', 'open', 'stealth', 'openStealth', 'diamond', 'openDiamond', 'circle', 'openCircle'],
        visibleWhen: undefined,
      },
      {
        id: 'separateEnds',
        kind: 'switch',
        defaultValue: false,
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'startShape',
        kind: 'select',
        defaultValue: 'diamond',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['normal', 'open', 'stealth', 'openStealth', 'diamond', 'openDiamond', 'circle', 'openCircle'],
        visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
      },
      {
        id: 'endShape',
        kind: 'select',
        defaultValue: 'open',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['normal', 'open', 'stealth', 'openStealth', 'diamond', 'openDiamond', 'circle', 'openCircle'],
        visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
      },
      {
        id: 'color',
        kind: 'color',
        defaultValue: '#1e90ff',
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'startColor',
        kind: 'color',
        defaultValue: '#e63946',
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
      },
      {
        id: 'endColor',
        kind: 'color',
        defaultValue: '#1e90ff',
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
      },
      {
        id: 'opacity',
        kind: 'range',
        defaultValue: 1,
        min: 0.1,
        max: 1,
        step: 0.1,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'scale',
        kind: 'range',
        defaultValue: 1,
        min: 0.5,
        max: 2.5,
        step: 0.1,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'length',
        kind: 'range',
        defaultValue: 10,
        min: 2,
        max: 24,
        step: 1,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'width',
        kind: 'range',
        defaultValue: 8,
        min: 2,
        max: 20,
        step: 1,
        options: undefined,
        visibleWhen: undefined,
      },
    ]);

    expect(Object.keys(arrowAppearanceDemoSources)).toHaveLength(1);
    const source = Object.values(arrowAppearanceDemoSources)[0];
    for (const token of [
      'arrow={values.direction}',
      'shape: values.shape',
      'color: values.color',
      'values.separateEnds',
      'shape: values.startShape',
      'shape: values.endShape',
    ]) {
      expect(source).toContain(token);
    }
  });

  it('Path 基础结构只承担 Path 组合差异', () => {
    const controlsPath = '../../src/modules/docs/contents/kernel/components/draw/path/path-structure.controls.ts';
    const fields = getPreviewControlFields(definitionOf(controlModules[controlsPath]));

    expect(fields.map(fieldContractOf)).toEqual([
      {
        id: 'structure',
        kind: 'select',
        defaultValue: 'polyline',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['polyline', 'subpaths', 'fill'],
        visibleWhen: undefined,
      },
      {
        id: 'fill',
        kind: 'color',
        defaultValue: '#1e90ff',
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: { controlId: 'structure', oneOf: ['fill'] },
      },
    ]);
  });

  it('Draw 填充与栈序面板保持固定重叠场景', () => {
    const controlsPath = '../../src/modules/docs/contents/kernel/components/draw/overview/draw-fill-stack.controls.ts';
    if (!(controlsPath in controlModules)) throw new Error('Missing Draw fill and stacking controls.');
    const controlsModule = controlModules[controlsPath];

    expect(getPreviewControlFields(definitionOf(controlsModule)).map(fieldContractOf)).toEqual([
      {
        id: 'fillA',
        kind: 'color',
        defaultValue: '#1e90ff',
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'fillB',
        kind: 'color',
        defaultValue: '#ef4444',
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'fillOpacity',
        kind: 'range',
        defaultValue: 0.7,
        min: 0.2,
        max: 1,
        step: 0.05,
        options: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'zIndexA',
        kind: 'range',
        defaultValue: 0,
        min: -1,
        max: 2,
        step: 1,
        options: undefined,
        visibleWhen: undefined,
      },
    ]);

    expect(Object.keys(fillStackDemoSources)).toHaveLength(1);
    const source = Object.values(fillStackDemoSources)[0];
    expect(source).toContain('viewBox={{ x: 0, y: 0, width: 220, height: 190 }}');
    expect(source.match(/DrawWay\.Cycle/g)).toHaveLength(2);
    expect(source.match(/<Draw/g)).toHaveLength(2);
    expect(source).toContain('zIndex={values.zIndexA}');
  });

  it('Path 参数型示例统一使用双语 Control 面板', () => {
    const cases = [
      {
        name: 'path-boundary',
        fields: [{ id: 'boundary', kind: 'select', options: ['shape', 'circle'] }],
      },
      {
        name: 'path-stroke-paint',
        fields: [
          { id: 'angle', kind: 'range' },
          { id: 'startColor', kind: 'color' },
          { id: 'middleColor', kind: 'color' },
          { id: 'endColor', kind: 'color' },
        ],
      },
      {
        name: 'path-z-index',
        fields: [{ id: 'zIndex', kind: 'range' }],
      },
      {
        name: 'path-outin-loop',
        fields: [
          { id: 'mode', kind: 'select', options: ['loop', 'connect'] },
          { id: 'outAngle', kind: 'range' },
          { id: 'inAngle', kind: 'range' },
          { id: 'loopLooseness', kind: 'range' },
          { id: 'looseness', kind: 'range' },
        ],
      },
      {
        name: 'path-transform',
        fields: [
          { id: 'rotate', kind: 'range' },
          { id: 'scale', kind: 'point' },
        ],
      },
      {
        name: 'path-marks',
        fields: [
          { id: 'firstPosition', kind: 'range' },
          { id: 'secondPosition', kind: 'range' },
        ],
      },
      {
        name: 'ribbon-label',
        fields: [
          { id: 'position', kind: 'range' },
          { id: 'placement', kind: 'select', options: ['inside', 'side'] },
          { id: 'side', kind: 'select', options: ['top', 'bottom'] },
          { id: 'sloped', kind: 'switch' },
        ],
      },
    ] as const;

    for (const testCase of cases) {
      const owner = testCase.name.startsWith('ribbon-') ? 'ribbon' : 'path';
      const canonicalPath = `../../src/modules/docs/contents/kernel/components/draw/${owner}/${testCase.name}.controls.ts`;
      const englishPath = canonicalPath.replace(/\.controls\.ts$/, '.en.controls.ts');
      const canonicalModule = controlModules[canonicalPath];
      const englishModule = controlModules[englishPath];
      expect(canonicalModule, `Missing controls for ${testCase.name}`).toBeDefined();
      expect(englishModule, `Missing English controls for ${testCase.name}`).toBeDefined();

      const canonicalDefinition = definitionOf(canonicalModule);
      const englishDefinition = definitionOf(englishModule);
      expect(canonicalDefinition.presentation).toBe('panel');
      expect(englishDefinition.presentation).toBe('panel');
      const canonicalFields = getPreviewControlFields(canonicalDefinition);
      const englishFields = getPreviewControlFields(englishDefinition);
      expect(englishFields.map(fieldContractOf)).toEqual(canonicalFields.map(fieldContractOf));
      expect(
        canonicalFields.map(field => ({
          id: field.id,
          kind: field.kind,
          options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
        })),
      ).toEqual(testCase.fields.map(field => ({ ...field, options: 'options' in field ? field.options : undefined })));
    }

    expect(Object.keys(pathPanelDemoSources)).toHaveLength(8);
    const sourceContracts = {
      'path-boundary.demo.tsx': [
        'boundary: values.boundary',
        'Math.hypot(StarAabbHalfWidth, StarOuterRadius)',
        'radius={CircleBoundaryRadius}',
      ],
      'path-stroke-paint.demo.tsx': [
        'angle: values.angle',
        'color: values.startColor',
        'color: values.middleColor',
        'color: values.endColor',
      ],
      'path-z-index.demo.tsx': ['zIndex={values.zIndex}'],
      'path-outin-loop.demo.tsx': [
        "values.mode === 'loop'",
        'values.outAngle',
        'values.inAngle',
        'values.loopLooseness',
        'values.looseness',
        'looseness={looseness}',
      ],
      'path-transform.demo.tsx': ['rotate={values.rotate}', 'x: values.scale[0]', 'y: values.scale[1]'],
      'path-marks.demo.tsx': ['pos: values.firstPosition', 'pos: values.secondPosition'],
      'ribbon-label.zh.demo.tsx': [
        "values.placement === 'inside'",
        'side: values.side',
        'position: values.position',
        'sloped: values.sloped',
      ],
      'ribbon-label.en.demo.tsx': [
        "values.placement === 'inside'",
        'side: values.side',
        'position: values.position',
        'sloped: values.sloped',
      ],
    } as const;

    for (const [path, source] of Object.entries(pathPanelDemoSources)) {
      expect(source, path).toContain('usePreviewControls(');
      expect(source, path).toContain('deriveIR: false');
      const fileName = path.split('/').at(-1);
      expect(fileName, path).toBeDefined();
      const expectedTokens = sourceContracts[fileName as keyof typeof sourceContracts];
      expect(expectedTokens, `Missing source contract for ${path}`).toBeDefined();
      for (const token of expectedTokens) expect(source, `${path}: ${token}`).toContain(token);
    }
  });

  it('Way 折角、闭合与相对坐标按稳定任务拆分', () => {
    const foldPath = '../../src/modules/docs/contents/kernel/components/draw/way/way-fold.controls.ts';
    const cyclePath = '../../src/modules/docs/contents/kernel/components/draw/way/way-cycle.controls.ts';
    const relativePath = '../../src/modules/docs/contents/kernel/components/draw/way/way-relative.controls.ts';
    const relativeEnglishPath = relativePath.replace(/\.controls\.ts$/, '.en.controls.ts');
    const wayControlPaths = [foldPath, cyclePath, relativePath];
    const relativeFields = getPreviewControlFields(definitionOf(controlModules[relativePath]));
    const offsetField = relativeFields.find(field => field.id === 'offset');
    const englishOffsetField = getPreviewControlFields(definitionOf(controlModules[relativeEnglishPath])).find(
      field => field.id === 'offset',
    );

    expect(controlModules).not.toHaveProperty(
      '../../src/modules/docs/contents/kernel/components/draw/way/way-operators.controls.ts',
    );
    for (const path of wayControlPaths) {
      expect(definitionOf(controlModules[path]).presentation).toBe('panel');
      expect(definitionOf(controlModules[path.replace(/\.controls\.ts$/, '.en.controls.ts')]).presentation).toBe(
        'panel',
      );
    }
    expect(getPreviewControlFields(definitionOf(controlModules[foldPath])).map(fieldContractOf)).toEqual([
      {
        id: 'direction',
        kind: 'select',
        defaultValue: '-|',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['-|', '|-'],
        visibleWhen: undefined,
      },
    ]);
    expect(getPreviewControlFields(definitionOf(controlModules[cyclePath])).map(fieldContractOf)).toEqual([
      {
        id: 'state',
        kind: 'select',
        defaultValue: 'open',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['open', 'closed'],
        visibleWhen: undefined,
      },
    ]);
    expect(relativeFields.map(fieldContractOf)).toEqual([
      {
        id: 'offset',
        kind: 'point',
        defaultValue: [90, 30],
        min: [30, -40],
        max: [100, 40],
        step: 10,
        options: undefined,
        visibleWhen: undefined,
      },
    ]);
    expect(offsetField?.label).toBe('偏移');
    expect(englishOffsetField?.label).toBe('Offset');

    expect(Object.keys(wayDemoSources)).toHaveLength(3);
    const foldSource = wayDemoSources['../../src/modules/docs/contents/kernel/components/draw/way/way-fold.demo.tsx'];
    const cycleSource = wayDemoSources['../../src/modules/docs/contents/kernel/components/draw/way/way-cycle.demo.tsx'];
    const relativeSource =
      wayDemoSources['../../src/modules/docs/contents/kernel/components/draw/way/way-relative.demo.tsx'];

    expect(foldSource).toContain("way={['A.center', values.direction, 'B.center']}");
    expect(WayCyclePresentationByState).toEqual({
      open: {
        way: ['A.center', 'B.center', 'C.center'],
        showClosingGuide: true,
        fill: 'none',
      },
      closed: {
        way: ['A.center', 'B.center', 'C.center', DrawWay.Cycle],
        showClosingGuide: false,
        fill: 'dodgerblue',
      },
    });
    expect(cycleSource).toContain('WayCyclePresentationByState[values.state]');
    expect(cycleSource).toContain('presentation.showClosingGuide &&');
    expect(cycleSource).toContain('way={presentation.way}');
    expect(cycleSource).toContain('fill={presentation.fill}');
    expect(relativeSource.match(/type: DrawWay\.Relative/g)).toHaveLength(2);
    expect(relativeSource.match(/type: DrawWay\.Accumulate/g)).toHaveLength(2);
    for (const source of Object.values(wayDemoSources)) {
      expect(source).toContain('dashPattern={[1, 4]}');
      expect(source).toContain('lineCap="round"');
    }

    if (offsetField?.kind !== 'point') throw new Error('Way relative point control is missing.');
    const accumulateFirst = [
      WayAccumulateStart[0] + WayRelativeFirstOffset[0],
      WayAccumulateStart[1] + WayRelativeFirstOffset[1],
    ];
    const terminalXs = [
      WayRelativeStart[0] + offsetField.min[0],
      WayRelativeStart[0] + offsetField.max[0],
      accumulateFirst[0] + offsetField.min[0],
      accumulateFirst[0] + offsetField.max[0],
    ];
    const terminalYs = [
      WayRelativeStart[1] + offsetField.min[1],
      WayRelativeStart[1] + offsetField.max[1],
      accumulateFirst[1] + offsetField.min[1],
      accumulateFirst[1] + offsetField.max[1],
    ];

    expect(relativeSource).toContain('viewBox={WayRelativeViewBox}');
    expect(Math.min(...terminalXs)).toBeGreaterThanOrEqual(WayRelativeViewBox.x + WayRelativeSafetyPadding);
    expect(Math.max(...terminalXs)).toBeLessThanOrEqual(
      WayRelativeViewBox.x + WayRelativeViewBox.width - WayRelativeSafetyPadding,
    );
    expect(Math.min(...terminalYs)).toBeGreaterThanOrEqual(WayRelativeViewBox.y + WayRelativeSafetyPadding);
    expect(Math.max(...terminalYs)).toBeLessThanOrEqual(
      WayRelativeViewBox.y + WayRelativeViewBox.height - WayRelativeSafetyPadding,
    );
  });
});
