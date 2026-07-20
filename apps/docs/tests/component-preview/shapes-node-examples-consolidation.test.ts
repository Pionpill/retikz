import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import {
  ArcSectorNodeConnectionVisibleWhen,
  nodeConnectionPlaygroundControls as arcSectorControls,
} from '../../src/modules/docs/contents/kernel/components/shapes/arc-sector/node-connection-playground.controls';
import { nodeConnectionPlaygroundControls as circleEllipseControls } from '../../src/modules/docs/contents/kernel/components/shapes/circle-ellipse/node-connection-playground.controls';
import { contourBoundaryPlaygroundControls } from '../../src/modules/docs/contents/kernel/components/shapes/contour/contour-boundary-playground.controls';
import { contourBoundaryPlaygroundControls as contourBoundaryPlaygroundEnControls } from '../../src/modules/docs/contents/kernel/components/shapes/contour/contour-boundary-playground.en.controls';
import { nodeConnectionPlaygroundControls as polygonControls } from '../../src/modules/docs/contents/kernel/components/shapes/polygon/node-connection-playground.controls';
import { nodeConnectionPlaygroundControls as rectangleControls } from '../../src/modules/docs/contents/kernel/components/shapes/rectangle/node-connection-playground.controls';
import { nodeConnectionPlaygroundControls as starControls } from '../../src/modules/docs/contents/kernel/components/shapes/star/node-connection-playground.controls';

const shapePages = new Map([
  ['circle-ellipse', { preview: 'node-connection-playground', size: 'sm' }],
  ['arc-sector', { preview: 'node-connection-playground', size: 'sm' }],
  ['rectangle', { preview: 'node-connection-playground', size: 'sm' }],
  ['polygon', { preview: 'node-connection-playground', size: 'sm' }],
  ['star', { preview: 'node-connection-playground', size: 'md' }],
  ['contour', { preview: 'contour-boundary-playground', size: 'md' }],
]);

const replacedStaticDemos = [
  'circle-ellipse/node-circle-ellipse.demo.tsx',
  'arc-sector/node-arc-sector.demo.tsx',
  'arc-sector/node-sector-corner-radius.demo.tsx',
  'rectangle/node-rectangle.demo.tsx',
  'polygon/node-polygon.demo.tsx',
  'polygon/node-polygon-corner-radius.demo.tsx',
  'star/node-star.demo.tsx',
  'star/node-star-corner-radius.demo.tsx',
  'contour/node-contour.demo.tsx',
  'contour/contour-connect.zh.demo.tsx',
  'contour/contour-connect.en.demo.tsx',
];

const contentRoot = resolve('src/modules/docs/contents/kernel/components/shapes');

const orbitPlaygrounds = new Map<string, PreviewControlsDefinition>([
  ['circle-ellipse/node-connection-playground', circleEllipseControls],
  ['arc-sector/node-connection-playground', arcSectorControls],
  ['rectangle/node-connection-playground', rectangleControls],
  ['polygon/node-connection-playground', polygonControls],
  ['star/node-connection-playground', starControls],
  ['contour/contour-boundary-playground', contourBoundaryPlaygroundControls],
]);

const getFields = (definition: PreviewControlsDefinition) => {
  expect(definition.presentation).toBe('panel');
  if (definition.presentation !== 'panel') throw new Error('Expected panel controls');
  return definition.sections.flatMap(section => section.controls);
};

const examplesSource = (pageSource: string, locale: 'zh' | 'en') => {
  const nodeHeading = locale === 'zh' ? '## 作为 Node 形状' : '## As a node shape';
  const heading = locale === 'zh' ? '### 例子' : '### Examples';
  const apiHeading = locale === 'zh' ? '### API 参考' : '### API Reference';
  const nodeSource = pageSource.slice(pageSource.indexOf(nodeHeading));
  return nodeSource.slice(nodeSource.indexOf(heading), nodeSource.indexOf(apiHeading));
};

describe('Shapes Node examples consolidation', () => {
  it('keeps one controls preview in every built-in Node Examples section', () => {
    for (const [folder, { preview, size }] of shapePages) {
      for (const locale of ['zh', 'en'] as const) {
        const pageSource = readFileSync(resolve(contentRoot, folder, `index.${locale}.mdx`), 'utf8');
        const examples = examplesSource(pageSource, locale);
        expect(examples.match(/<ComponentPreview\b/g)).toHaveLength(1);
        expect(examples).toContain(`<ComponentPreview files="${preview}" size="${size}" />`);
      }
    }
  });

  it('moves the remaining unique static capabilities into controls', () => {
    const arcSectorFields = getFields(arcSectorControls);
    expect(arcSectorFields.find(field => field.id === 'cornerRadius')).toMatchObject({
      kind: 'range',
      visibleWhen: ArcSectorNodeConnectionVisibleWhen.CornerRadius,
    });
    const arcSectorAnchor = arcSectorFields.find(field => field.id === 'anchor');
    if (!arcSectorAnchor || arcSectorAnchor.kind !== 'select') throw new Error('Missing Arc / Sector anchor select');
    expect(arcSectorAnchor.options.map(option => option.value)).toContain('inner-midpoint');

    const contourFields = getFields(contourBoundaryPlaygroundControls);
    const pointSet = contourFields.find(field => field.id === 'pointSet');
    expect(pointSet).toMatchObject({ kind: 'select', defaultValue: 'centered' });
    if (!pointSet || pointSet.kind !== 'select') throw new Error('Missing contour point-set select');
    expect(pointSet.options.map(option => option.value)).toEqual(['centered', 'shifted']);

    const arcSectorDemo = readFileSync(resolve(contentRoot, 'arc-sector/node-connection-playground.demo.tsx'), 'utf8');
    expect(arcSectorDemo).toContain('cornerRadius: values.cornerRadius');
    expect(arcSectorDemo).toContain("'inner-arc-mid'");

    const polygonDemo = readFileSync(resolve(contentRoot, 'polygon/node-connection-playground.demo.tsx'), 'utf8');
    expect(polygonDemo).toMatch(/values\.shape === 'diamond'\s*\?\s*\('diamond' as const\)/);

    const polygonFields = getFields(polygonControls);
    expect(polygonFields.find(field => field.id === 'cornerRadius')).toMatchObject({
      kind: 'range',
      visibleWhen: { controlId: 'shape', oneOf: ['hexagon'] },
    });

    const contourDemo = readFileSync(resolve(contentRoot, 'contour/contour-boundary-playground.demo.tsx'), 'utf8');
    expect(contourDemo).toContain("values.pointSet === 'shifted'");
    expect(contourDemo).toContain("shape={{ type: 'contour', params: { points, cornerRadius: values.cornerRadius } }}");
  });

  it('removes static demos replaced by the controls previews', () => {
    for (const demo of replacedStaticDemos) {
      expect(existsSync(resolve(contentRoot, demo)), demo).toBe(false);
    }
  });

  it('lets every orbit playground control the source distance', () => {
    for (const [preview, controls] of orbitPlaygrounds) {
      expect(
        getFields(controls).find(field => field.id === 'sourceDistance'),
        preview,
      ).toMatchObject({ kind: 'range', max: 200 });

      const demoSource = readFileSync(resolve(contentRoot, `${preview}.demo.tsx`), 'utf8');
      expect(demoSource, preview).toContain('values.sourceDistance');
    }
  });

  it('groups contour controls by target, source, and appearance', () => {
    expect(contourBoundaryPlaygroundControls).toMatchObject({
      presentation: 'panel',
      sections: [{ label: '目标节点' }, { label: '来源节点' }, { label: '外观' }],
    });
    expect(contourBoundaryPlaygroundEnControls).toMatchObject({
      presentation: 'panel',
      sections: [{ label: 'Target node' }, { label: 'Source node' }, { label: 'Appearance' }],
    });

    const zhFields = getFields(contourBoundaryPlaygroundControls);
    expect(zhFields.find(field => field.id === 'sourceAngle')).toMatchObject({ label: '轨道角度' });
    expect(zhFields.find(field => field.id === 'sourceDistance')).toMatchObject({ label: '轨道距离' });
  });

  it('keeps orbit playground drawings language-neutral', () => {
    for (const preview of orbitPlaygrounds.keys()) {
      const demoSource = readFileSync(resolve(contentRoot, `${preview}.demo.tsx`), 'utf8');
      expect(demoSource, preview).toContain(
        '<Node id="source" position={sourcePosition} shape="circle" minimumSize={18} fill="gray" stroke="none" />',
      );
      expect(demoSource, preview).not.toMatch(/>\s*(?:target|source)\s*</);
      expect(demoSource, preview).not.toContain('points: near');
      expect(demoSource, preview).not.toContain('points: +200');
    }
  });

  it('keeps the source visible at the maximum orbit distance', () => {
    const requiredBounds = new Map(Array.from(orbitPlaygrounds.keys(), preview => [preview, { x: 209, y: 209 }]));

    for (const [preview, required] of requiredBounds) {
      const demoSource = readFileSync(resolve(contentRoot, `${preview}.demo.tsx`), 'utf8');
      const viewBox = demoSource.match(/viewBox=\{\{ x: (-?\d+), y: (-?\d+), width: (\d+), height: (\d+) \}\}/);
      expect(viewBox, preview).not.toBeNull();
      if (!viewBox) throw new Error(`Missing fixed viewBox for ${preview}`);

      const [, xText, yText, widthText, heightText] = viewBox;
      const x = Number(xText);
      const y = Number(yText);
      expect({ x, y, width: Number(widthText), height: Number(heightText) }, preview).toEqual({
        x: -215,
        y: -215,
        width: 430,
        height: 430,
      });
      expect(x, preview).toBeLessThanOrEqual(-required.x);
      expect(x + Number(widthText), preview).toBeGreaterThanOrEqual(required.x);
      expect(y, preview).toBeLessThanOrEqual(-required.y);
      expect(y + Number(heightText), preview).toBeGreaterThanOrEqual(required.y);
    }
  });

  it('uses a normal gray stroke for every orbit connection', () => {
    for (const preview of orbitPlaygrounds.keys()) {
      const demoSource = readFileSync(resolve(contentRoot, `${preview}.demo.tsx`), 'utf8');
      const connection = demoSource.match(/<Draw\s+way=\{\[sourceTarget,[\s\S]*?\/>/)?.[0];
      expect(connection, preview).toBeDefined();
      expect(connection, preview).toContain('stroke="gray"');
      expect(connection, preview).not.toContain('strokeWidth=');
    }
  });

  it('keeps every Shapes controls output at or below the compact preview width', () => {
    const controlsDemos = [
      'arc-sector/arc-sector-playground.demo.tsx',
      'arc-sector/node-connection-playground.demo.tsx',
      'circle-ellipse/ellipse-playground.demo.tsx',
      'circle-ellipse/node-connection-playground.demo.tsx',
      'contour/contour-boundary-playground.demo.tsx',
      'custom-shape/ngon.demo.tsx',
      'polygon/node-connection-playground.demo.tsx',
      'polygon/polygon-playground.demo.tsx',
      'rectangle/node-connection-playground.demo.tsx',
      'rectangle/rectangle-playground.demo.tsx',
      'star/node-connection-playground.demo.tsx',
      'star/star-playground.demo.tsx',
    ];

    for (const demo of controlsDemos) {
      const source = readFileSync(resolve(contentRoot, demo), 'utf8');
      const width = source.match(/<Layout\s+width=\{(\d+)\}/)?.[1];

      expect(width, demo).toBeDefined();
      expect(Number(width), demo).toBeLessThanOrEqual(400);
    }
  });
});
