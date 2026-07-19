import type {
  PreviewControlCondition,
  PreviewControlField,
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewNumberControlField,
  PreviewRangeControlField,
  PreviewSelectControlField,
} from '../types';

const COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** 获取控件定义中的扁平字段列表 */
export const getPreviewControlFields = (definition: PreviewControlsDefinition): Array<PreviewControlField> =>
  definition.presentation === 'overlay'
    ? [...definition.controls]
    : definition.sections.flatMap(section => [...section.controls]);

/** 构建控件定义对应的默认值集合 */
export const buildPreviewControlDefaults = (definition: PreviewControlsDefinition | undefined): PreviewControlValues =>
  Object.fromEntries(
    (definition ? getPreviewControlFields(definition) : []).map(field => [field.id, field.defaultValue]),
  );

/** 校验数值字段中的有限数值属性 */
const validateFiniteProperties = (
  field: PreviewNumberControlField | PreviewRangeControlField,
  properties: ReadonlyArray<'defaultValue' | 'min' | 'max' | 'step'>,
): void => {
  for (const property of properties) {
    const value = field[property];
    if (value !== undefined && !Number.isFinite(value)) {
      throw new Error(`Preview ${field.kind} control "${field.id}" ${property} must be finite.`);
    }
  }
};

/** 校验数值字段的边界与默认值 */
const validateNumericControl = (field: PreviewNumberControlField | PreviewRangeControlField): void => {
  validateFiniteProperties(field, ['defaultValue', 'min', 'max', 'step']);

  if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
    throw new Error(`Preview ${field.kind} control "${field.id}" min must not exceed max.`);
  }

  const belowMinimum = field.min !== undefined && field.defaultValue < field.min;
  const aboveMaximum = field.max !== undefined && field.defaultValue > field.max;
  if (belowMinimum || aboveMaximum) {
    throw new Error(
      `Preview ${field.kind} control "${field.id}" defaultValue must be between ${field.min ?? '-Infinity'} and ${field.max ?? 'Infinity'}.`,
    );
  }
};

/** 校验下拉选项及其默认值 */
const validateSelectControl = (field: PreviewSelectControlField): void => {
  if (field.options.length === 0) {
    throw new Error(`Preview select control "${field.id}" must define at least one option.`);
  }

  const optionValues = new Set<string>();
  for (const option of field.options) {
    if (optionValues.has(option.value)) {
      throw new Error(`Duplicate preview select option value "${option.value}" in control "${field.id}".`);
    }
    optionValues.add(option.value);
  }

  if (!optionValues.has(field.defaultValue)) {
    throw new Error(
      `Preview select control "${field.id}" defaultValue "${field.defaultValue}" is not present in options.`,
    );
  }
};

/** 校验显示条件的引用与值集合 */
const validateControlCondition = (condition: PreviewControlCondition, knownIds: ReadonlySet<string>): void => {
  if (!knownIds.has(condition.controlId)) {
    throw new Error(`Preview control condition references unknown control id: "${condition.controlId}".`);
  }
  if (condition.oneOf.length === 0) {
    throw new Error(`Preview control condition for "${condition.controlId}" must define at least one value.`);
  }
};

/** 校验字段 id 与各 kind 的运行时约束 */
const validatePreviewControls = (definition: PreviewControlsDefinition): void => {
  const ids = new Set<string>();
  const fields = getPreviewControlFields(definition);

  for (const field of fields) {
    if (ids.has(field.id)) {
      throw new Error(`Duplicate preview control id: "${field.id}".`);
    }
    ids.add(field.id);

    if (field.kind === 'select') validateSelectControl(field);
    if (field.kind === 'number' || field.kind === 'range') validateNumericControl(field);
    if (field.kind === 'color' && !COLOR_HEX_PATTERN.test(field.defaultValue)) {
      throw new Error(`Preview color control "${field.id}" defaultValue must be a #RRGGBB hex color.`);
    }
  }

  for (const field of fields) {
    if (field.visibleWhen) validateControlCondition(field.visibleWhen, ids);
  }
  if (definition.presentation === 'panel') {
    for (const section of definition.sections) {
      if (section.visibleWhen) validateControlCondition(section.visibleWhen, ids);
    }
  }
};

/** 定义并校验声明式预览控件，同时保留字段字面量类型 */
export const definePreviewControls = <const TDefinition extends PreviewControlsDefinition>(
  definition: TDefinition,
): TDefinition => {
  validatePreviewControls(definition);
  return definition;
};
