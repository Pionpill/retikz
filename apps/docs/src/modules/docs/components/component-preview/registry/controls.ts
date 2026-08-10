import type { PreviewControlContract, PreviewControlsDefinition, PreviewControlValues } from '../types';
import type { PreviewLoader } from './contents';

import { buildPreviewControlDefaults, definePreviewControls, getPreviewControlFields } from '../controls';

/** 收集 contents 下 canonical 与本地化 controls definition 模块 */
export const controlModuleLoaders: Record<string, PreviewLoader<Record<string, unknown>> | undefined> =
  import.meta.glob<Record<string, unknown>>(
    ['../../contents/**/*.controls.ts', '../../contents/**/*.zh.controls.ts', '../../contents/**/*.en.controls.ts'],
    { base: '../' },
  );

export const buildControlsKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.controls.ts`;

/** 构建带语言后缀的 controls registry key。 */
export const buildLangControlsKey = (segments: Array<string>, name: string, lang: string) =>
  `../../contents/${segments.join('/')}/${name}.${lang}.controls.ts`;

/** 优先解析语言化 controls，缺失时回退到语言无关文件。 */
export const resolveControlsKey = (segments: Array<string>, name: string, lang: string): string => {
  const langKey = buildLangControlsKey(segments, name, lang);
  return controlModuleLoaders[langKey] !== undefined ? langKey : buildControlsKey(segments, name);
};

/** 判断模块导出是否是声明式预览控件定义 */
const isPreviewControlsDefinition = (value: unknown): value is PreviewControlsDefinition => {
  if (typeof value !== 'object' || value === null) return false;

  const presentation = Reflect.get(value, 'presentation');
  if (presentation === 'overlay') return Array.isArray(Reflect.get(value, 'controls'));
  if (presentation === 'panel') return Array.isArray(Reflect.get(value, 'sections'));
  return false;
};

const isControlContract = (value: unknown): value is PreviewControlContract =>
  typeof value === 'object' &&
  value !== null &&
  isPreviewControlsDefinition(Reflect.get(value, 'controls')) &&
  typeof Reflect.get(value, 'canonicalValues') === 'object' &&
  Reflect.get(value, 'canonicalValues') !== null &&
  Array.isArray(Reflect.get(value, 'relatedApis'));

const assertKnownValues = (
  label: 'canonicalValues' | `preset "${string}"`,
  values: Readonly<PreviewControlValues>,
  knownIds: ReadonlySet<string>,
): void => {
  for (const id of Object.keys(values)) {
    if (!knownIds.has(id)) throw new Error(`Unknown preview control id in ${label}: "${id}".`);
  }
};

const validateControlContract = (contract: PreviewControlContract): PreviewControlContract => {
  definePreviewControls(contract.controls);
  const ids = new Set([
    ...getPreviewControlFields(contract.controls).map(field => field.id),
    ...(contract.stateOnlyIds ?? []),
  ]);
  assertKnownValues('canonicalValues', contract.canonicalValues, ids);
  for (const preset of contract.presets ?? []) {
    assertKnownValues(`preset "${preset.id}"`, preset.values, ids);
  }
  return contract;
};

const contractFromDefinition = (controls: PreviewControlsDefinition): PreviewControlContract => ({
  controls: definePreviewControls(controls),
  canonicalValues: buildPreviewControlDefaults(controls),
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
  if (isPreviewControlsDefinition(mod.previewControls)) {
    return contractFromDefinition(mod.previewControls);
  }
  const namedControls = Object.entries(mod).find(
    ([key, value]) => key.endsWith('Controls') && isPreviewControlsDefinition(value),
  );
  return namedControls === undefined
    ? undefined
    : contractFromDefinition(namedControls[1] as PreviewControlsDefinition);
};

/** 解析 demo controls 的声明式定义 */
export const resolvePreviewControls = (
  mod: Record<string, unknown> | undefined,
): PreviewControlsDefinition | undefined => resolvePreviewControlContract(mod)?.controls;
