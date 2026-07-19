import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

const effectControlModules = import.meta.glob<Record<string, unknown>>(
  '../../src/modules/docs/contents/kernel/components/effects/**/*.controls.ts',
  { eager: true },
);

const effectsPlaygrounds = [
  {
    segments: ['kernel', 'components', 'effects', 'shadow'],
    name: 'shadow-playground',
    presentation: 'panel',
    ids: ['offsetX', 'offsetY', 'blur', 'color', 'opacity'],
  },
  {
    segments: ['kernel', 'components', 'effects', 'blend'],
    name: 'blend-playground',
    presentation: 'panel',
    ids: ['mode', 'background', 'sourceA', 'sourceB', 'opacity'],
  },
  {
    segments: ['kernel', 'components', 'effects', 'animation'],
    name: 'animation-playground',
    presentation: 'panel',
    ids: ['from', 'duration', 'delay', 'easing', 'origin'],
  },
  {
    segments: ['kernel', 'components', 'effects', 'pattern'],
    name: 'pattern-playground',
    presentation: 'panel',
    ids: ['shape', 'size', 'lineWidth', 'rotation', 'color', 'background'],
  },
  {
    segments: ['kernel', 'components', 'effects', 'custom-pattern'],
    name: 'custom-pattern-size',
    presentation: 'panel',
    ids: ['size', 'rotation', 'color', 'background'],
  },
  {
    segments: ['kernel', 'components', 'effects', 'custom-animation'],
    name: 'custom-property',
    presentation: 'panel',
    ids: ['blur', 'duration'],
  },
] as const;

const fieldContractOf = (definition: PreviewControlsDefinition) => {
  const fields =
    definition.presentation === 'panel'
      ? definition.sections.flatMap(section => section.controls)
      : definition.controls;

  return fields.map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));
};

const sectionContractOf = (definition: PreviewControlsDefinition) =>
  definition.presentation === 'panel'
    ? definition.sections.map(section => section.controls.map(field => field.id))
    : undefined;

const presetContractOf = (contract: PreviewControlContract) =>
  contract.presets?.map(preset => ({ id: preset.id, values: preset.values }));

const contractAt = (segments: ReadonlyArray<string>, name: string, lang?: 'en'): PreviewControlContract | undefined => {
  const suffix = lang === undefined ? '.controls.ts' : `.${lang}.controls.ts`;
  const pathSuffix = `/contents/${segments.join('/')}/${name}${suffix}`;
  const mod = Object.entries(effectControlModules).find(([key]) => key.replaceAll('\\', '/').endsWith(pathSuffix))?.[1];
  return mod?.previewControlContract as PreviewControlContract | undefined;
};

describe('effects playground controls', () => {
  it.each(effectsPlaygrounds)('$name 提供稳定、双语一致且覆盖 API 的 controls contract', playground => {
    const zhContract = contractAt(playground.segments, playground.name);
    const enContract = contractAt(playground.segments, playground.name, 'en');

    expect(zhContract?.controls.presentation).toBe(playground.presentation);
    expect(enContract?.controls.presentation).toBe(playground.presentation);
    expect(fieldContractOf(zhContract!.controls)).toEqual(fieldContractOf(enContract!.controls));
    expect(sectionContractOf(zhContract!.controls)).toEqual(sectionContractOf(enContract!.controls));
    expect(fieldContractOf(zhContract!.controls).map(field => field.id)).toEqual(playground.ids);
    expect(zhContract?.canonicalValues).toEqual(enContract?.canonicalValues);
    expect(zhContract?.presets?.length).toBeGreaterThanOrEqual(2);
    expect(presetContractOf(enContract!)).toEqual(presetContractOf(zhContract!));
    expect(zhContract?.relatedApis.length).toBeGreaterThan(0);
    expect(enContract?.relatedApis).toEqual(zhContract?.relatedApis);
  });
});
