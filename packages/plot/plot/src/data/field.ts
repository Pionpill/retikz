import { format as d3Format } from 'd3-format';
import { utcFormat } from 'd3-time-format';
import { type Channel, type DataModel, type ExternalRow, PlotFieldType, type PlotFieldTypeValue, type TextChannel } from '../ir';

/**
 * 解析字段路径 a.b.c，返回叶子值（任一段缺失返回 undefined）
 * @description 先查 exact own key（归一化后的 canonical 行把逻辑名 `user.age` 写成扁平 key，须命中它而非下钻原始嵌套值），
 *   未命中再按点路径下钻（原始嵌套数据 / MongoDB 文档）。两者兼容：原始行无字面点键时退化为纯下钻。
 */
export const resolveFieldPath = (row: ExternalRow, path: string): unknown => {
  if (Object.prototype.hasOwnProperty.call(row, path)) return row[path];
  let current: unknown = row;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

/** 取通道值：value 常量优先，否则 field 路径解析 */
export const channelValue = (channel: Channel | undefined, row: ExternalRow): unknown => {
  if (!channel) return undefined;
  if (channel.value !== undefined) return channel.value;
  if (channel.field !== undefined) return resolveFieldPath(row, channel.field);
  return undefined;
};

/** 有限数守卫：scale 映射 / 投影只接受有限数值 */
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** 按字段路径比较两行（数值升序，否则字符串序）——line 的连接顺序 */
export const compareByPath = (a: ExternalRow, b: ExternalRow, path: string): number => {
  const va = resolveFieldPath(a, path);
  const vb = resolveFieldPath(b, path);
  if (isFiniteNumber(va) && isFiniteNumber(vb)) return va - vb;
  return String(va).localeCompare(String(vb));
};

/** 运行时 label 解析逃生舱（不进 IR，options 注入）：按 mark 顺序的某 datum 行 → 完全自定义标签串 */
export type ResolveLabel = (row: ExternalRow) => string;

/**
 * 把字段值按 format 串格式化（temporal 走 d3-time-format、数值走 d3-format）
 * @description fieldType 为 temporal（值是 epoch ms canonical）→ utcFormat；其余按数值走 d3-format。
 *   非有限数值无法格式化 → 回退 String(value)；format 串非法 → 同样回退（不 fail-loud，标签是展示层）。
 */
const applyFormat = (value: unknown, format: string, fieldType: PlotFieldTypeValue | undefined): string => {
  try {
    if (fieldType === PlotFieldType.Temporal) {
      if (!isFiniteNumber(value)) return String(value);
      return utcFormat(format)(new Date(value));
    }
    if (!isFiniteNumber(value)) return String(value);
    return d3Format(format)(value);
  } catch {
    return String(value);
  }
};

/**
 * text 内容通道某行 → 标签串（优先级 resolveLabel > field+format > value）；无内容 → undefined（跳过该行）
 * @description resolveLabel（运行时注入、不进 IR）最高优先；其次 field 解析值（有 format 时格式化、否则 String）；
 *   再次 value 常量。field 解析出 null / undefined 且无 value / resolveLabel → undefined（与 point null 跳过同语义）。
 *   fieldType 供 format 分派（temporal 走时间格式、数值走 d3-format）；由调用方按 content.field 查 fieldTypes 传入。
 */
export const labelOf = (
  content: TextChannel,
  row: ExternalRow,
  fieldType: PlotFieldTypeValue | undefined,
  resolveLabel: ResolveLabel | undefined,
): string | undefined => {
  if (resolveLabel !== undefined) return String(resolveLabel(row));
  if (content.field !== undefined) {
    const value = resolveFieldPath(row, content.field);
    if (value === null || value === undefined) return undefined;
    return content.format !== undefined ? applyFormat(value, content.format, fieldType) : String(value);
  }
  if (content.value !== undefined) return content.value;
  return undefined;
};

type FieldChannel = Channel | { kind: 'field' | 'constant'; value: unknown };

/** 字段收集器：把 mark / transform 声明中引用外部数据源的字段加入集合。 */
export type FieldCollector = {
  /** 加入一个字段名；undefined 表示该位置没有字段引用。 */
  addField: (field?: string) => void;
  /** 一次加入多个字段名；undefined 会被跳过。 */
  addFields: (...fields: Array<string | undefined>) => void;
  /** 加入普通 channel 或 MarkValueType 的字段引用；常量值不引用数据源。 */
  addChannel: (channel?: FieldChannel) => void;
};

/** 创建字段收集器，所有写入直接落到传入 Set。 */
export const createFieldCollector = (fields: Set<string>): FieldCollector => ({
  addField: field => {
    if (field !== undefined) fields.add(field);
  },
  addFields: (...sourceFields) => {
    for (const field of sourceFields) {
      if (field !== undefined) fields.add(field);
    }
  },
  addChannel: channel => {
    if (channel === undefined) return;
    if ('kind' in channel) {
      if (channel.kind === 'field') fields.add(String(channel.value));
      return;
    }
    if (channel.field !== undefined) fields.add(channel.field);
  },
});

const MAX_SCAN_ROWS = 1000;
const MAX_SAMPLE_VALUES = 100;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const isIsoDateString = (value: string): boolean => ISO_DATE_RE.test(value) || ISO_DATETIME_RE.test(value);

const classifyFieldValue = (value: unknown): PlotFieldTypeValue | undefined => {
  if (value instanceof Date) return PlotFieldType.Temporal;
  if (typeof value === 'bigint') return PlotFieldType.Continuous;
  if (typeof value === 'number') return Number.isFinite(value) ? PlotFieldType.Continuous : undefined;
  if (typeof value === 'string') return isIsoDateString(value) ? PlotFieldType.Temporal : PlotFieldType.Categorical;
  if (typeof value === 'boolean') return PlotFieldType.Categorical;
  return undefined;
};

/** 从绑定数据推断某字段的测量类型；仅在没有 data.model 或 model 缺省 type 时使用。 */
export const inferFieldType = (rows: Array<ExternalRow>, path: string): PlotFieldTypeValue => {
  const sample: Array<PlotFieldTypeValue> = [];
  const scanLimit = Math.min(rows.length, MAX_SCAN_ROWS);
  for (let index = 0; index < scanLimit && sample.length < MAX_SAMPLE_VALUES; index++) {
    const value = resolveFieldPath(rows[index], path);
    if (value === null || value === undefined) continue;
    const type = classifyFieldValue(value);
    if (type === undefined) continue;
    sample.push(type);
  }
  if (sample.length === 0) return PlotFieldType.Categorical;
  if (sample.every(type => type === PlotFieldType.Temporal)) return PlotFieldType.Temporal;
  if (sample.every(type => type === PlotFieldType.Continuous)) return PlotFieldType.Continuous;
  return PlotFieldType.Categorical;
};

/** 把源字段解析成字段名到类型的映射，供 type-driven scale / coercion 消费。 */
export const resolveFieldTypes = (
  model: DataModel | undefined,
  rows: Array<ExternalRow>,
  sourceFields: Set<string>,
): Map<string, PlotFieldTypeValue> => {
  const map = new Map<string, PlotFieldTypeValue>();
  if (model !== undefined) {
    const declaredNames = new Set<string>();
    const declaredTypes = new Map<string, PlotFieldTypeValue>();
    for (const field of model) {
      if (declaredNames.has(field.name)) {
        throw new Error(`lowerPlots: duplicate field "${field.name}" in data.model`);
      }
      declaredNames.add(field.name);
      if (field.type !== undefined) declaredTypes.set(field.name, field.type);
    }
    for (const field of sourceFields) {
      if (!declaredNames.has(field)) {
        throw new Error(`lowerPlots: unknown field "${field}" (data.model is declared; all referenced source fields must be listed)`);
      }
      map.set(field, declaredTypes.get(field) ?? inferFieldType(rows, field));
    }
  } else {
    for (const field of sourceFields) {
      map.set(field, inferFieldType(rows, field));
    }
  }
  return map;
};
