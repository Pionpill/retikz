import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlsDefinition,
  PreviewPanelControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '../../src/modules/docs/components/component-preview/controls';
import {
  coordinateSwitchControls,
  previewControlContract,
} from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-switch.controls';
import {
  coordinateSwitchControls as englishCoordinateSwitchControls,
  previewControlContract as englishPreviewControlContract,
} from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-switch.en.controls';

const fieldContractOf = (definition: PreviewControlsDefinition) =>
  getPreviewControlFields(definition).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    visibleWhen: field.visibleWhen,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));

const visibleFieldIds = (definition: PreviewPanelControlsDefinition, coordinate: 'cartesian2D' | 'polar2D') =>
  resolveVisiblePreviewControlSections(definition.sections, { coordinate }).flatMap(section =>
    section.controls.map(control => control.id),
  );

describe('二维坐标系文档 playground', () => {
  it('提供双语一致的坐标、内半径与四边留白契约', () => {
    const expectedIds = ['coordinate', 'innerRadius', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'];
    const chineseFields = fieldContractOf(coordinateSwitchControls);
    const englishFields = fieldContractOf(englishCoordinateSwitchControls);

    expect(coordinateSwitchControls.sections[0].defaultCollapsed).toBe(true);
    expect(englishCoordinateSwitchControls.sections[0].defaultCollapsed).toBe(true);
    expect(chineseFields.map(field => field.id)).toEqual(expectedIds);
    expect(englishFields).toEqual(chineseFields);
    expect(chineseFields.find(field => field.id === 'innerRadius')).toMatchObject({
      kind: 'range',
      defaultValue: 0,
      min: 0,
      max: 0.75,
      step: 0.05,
      visibleWhen: { controlId: 'coordinate', oneOf: ['polar2D'] },
    });
    for (const id of ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']) {
      expect(chineseFields.find(field => field.id === id)).toMatchObject({
        kind: 'range',
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 4,
      });
    }
    expect(previewControlContract.canonicalValues).toEqual({
      coordinate: 'cartesian2D',
      innerRadius: 0,
      marginTop: 24,
      marginRight: 24,
      marginBottom: 24,
      marginLeft: 24,
    });
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
    expect(englishPreviewControlContract.relatedApis).toEqual(previewControlContract.relatedApis);
  });

  it('只在极坐标状态显示内半径', () => {
    expect(visibleFieldIds(coordinateSwitchControls, 'cartesian2D')).not.toContain('innerRadius');
    expect(visibleFieldIds(coordinateSwitchControls, 'polar2D')).toContain('innerRadius');
    expect(visibleFieldIds(englishCoordinateSwitchControls, 'cartesian2D')).not.toContain('innerRadius');
    expect(visibleFieldIds(englishCoordinateSwitchControls, 'polar2D')).toContain('innerRadius');
  });

  it('极坐标折线保持开放路径并按原始角度投影', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-polar-line.demo.tsx'),
      'utf8',
    );

    expect(source).toContain('closed={false}');
    expect(source).toContain('<Scale dimension="x" type="linear" domain={[0, 360]} />');
  });
});
