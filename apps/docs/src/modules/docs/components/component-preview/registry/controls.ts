import type { PreviewControlConfig, PreviewControlContract, PreviewControlSlot } from '../types';

export const controlModules: Record<string, Record<string, unknown> | undefined> = import.meta.glob<
  Record<string, unknown>
>(['../../contents/**/*.controls.ts', '../../contents/**/*.zh.controls.ts', '../../contents/**/*.en.controls.ts'], {
  base: '../',
  eager: true,
});

export const buildControlsKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.controls.ts`;

/** 构建带语言后缀的 controls registry key。 */
export const buildLangControlsKey = (segments: Array<string>, name: string, lang: string) =>
  `../../contents/${segments.join('/')}/${name}.${lang}.controls.ts`;

/** 优先解析语言化 controls，缺失时回退到语言无关文件。 */
export const resolveControlsKey = (segments: Array<string>, name: string, lang: string): string => {
  const langKey = buildLangControlsKey(segments, name, lang);
  return controlModules[langKey] !== undefined ? langKey : buildControlsKey(segments, name);
};

const isControlContract = (value: unknown): value is PreviewControlContract =>
  typeof value === 'object' && value !== null && Array.isArray((value as PreviewControlContract).controls);

const assertKnownValues = (
  label: 'canonicalValues' | `preset "${string}"`,
  values: Readonly<Record<string, string>>,
  controls: Array<PreviewControlConfig | PreviewControlSlot>,
): void => {
  const ids = new Set(controls.map(control => control.id));
  for (const id of Object.keys(values)) {
    if (!ids.has(id)) throw new Error(`Unknown preview control id in ${label}: "${id}".`);
  }
};

const validateControlContract = (contract: PreviewControlContract): PreviewControlContract => {
  const ids = new Set<string>();
  for (const control of contract.controls) {
    if (ids.has(control.id)) throw new Error(`Duplicate preview control id: "${control.id}".`);
    ids.add(control.id);
  }
  assertKnownValues('canonicalValues', contract.canonicalValues, contract.controls);
  for (const preset of contract.presets ?? []) {
    assertKnownValues(`preset "${preset.id}"`, preset.values, contract.controls);
  }
  return contract;
};

const contractFromLegacyControls = (
  controls: Array<PreviewControlConfig | PreviewControlSlot>,
): PreviewControlContract => ({
  controls,
  canonicalValues: Object.fromEntries(
    controls
      .filter((control): control is PreviewControlConfig => 'kind' in control)
      .map(control => [control.id, control.defaultValue]),
  ),
  relatedApis: [],
});

/** 解析并校验 demo controls 的稳定文档契约。 */
export const resolvePreviewControlContract = (
  mod: Record<string, unknown> | undefined,
): PreviewControlContract | undefined => {
  if (mod === undefined) return undefined;
  if (isControlContract(mod.previewControlContract)) {
    return validateControlContract(mod.previewControlContract);
  }
  if (Array.isArray(mod.previewControls)) {
    return contractFromLegacyControls(mod.previewControls as Array<PreviewControlConfig | PreviewControlSlot>);
  }
  const namedControls = Object.entries(mod).find(([key, value]) => key.endsWith('Controls') && Array.isArray(value));
  return namedControls === undefined
    ? undefined
    : contractFromLegacyControls(namedControls[1] as Array<PreviewControlConfig | PreviewControlSlot>);
};

/** 兼容只消费 controls 数组的现有预览宿主。 */
export const resolvePreviewControls = (
  mod: Record<string, unknown> | undefined,
): Array<PreviewControlConfig | PreviewControlSlot> | undefined => resolvePreviewControlContract(mod)?.controls;
