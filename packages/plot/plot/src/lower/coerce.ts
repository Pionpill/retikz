import { type DataModel, type ExternalRow, type FieldFormat, type FieldType, PlotFieldFormat, PlotFieldType } from '../ir';
import { resolveFieldPath } from './field';
import { toTimestamp } from './scale';

/** 严格数字串：trimmed 十进制 / 科学计数；拒空串、Infinity、NaN、hex、带单位串 */
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** 数值强制：number 原样（非有限 → NaN）；严格数字串 → number；其余 → NaN（下游按非有限跳过） */
const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return NUMERIC_RE.test(trimmed) ? Number(trimmed) : NaN;
  }
  return NaN;
};

/** 分类强制：string / 有限 number 原样；boolean → 串；其余（对象 / 数组 / null）→ undefined（下游跳过，绝不 String(obj)） */
const coerceCategory = (value: unknown): string | number | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return String(value);
  return undefined;
};

/**
 * 按 PlotFieldType 把原始 JS 值强制成规范值（同类型容多种 JS 表示）
 * @description continuous → number（越界原样、不 clamp）；temporal → epoch ms（Date/数值/严格 ISO）；
 *   categorical → string|number 分类键。非法 → NaN（数值）/ undefined（分类），下游按非有限 / undefined 跳过。
 */
export const coerceValue = (value: unknown, type: FieldType): string | number | undefined => {
  if (type === PlotFieldType.Temporal) {
    const stamp = toTimestamp(value);
    return stamp === null ? NaN : stamp;
  }
  if (type === PlotFieldType.Categorical) {
    return coerceCategory(value);
  }
  // continuous
  return coerceNumber(value);
};

/** 某规范值对其类型是否有效（数值类要有限、分类类非 undefined/null） */
const isCoercedValid = (value: unknown, type: FieldType): boolean => {
  if (type === PlotFieldType.Categorical) return value !== undefined && value !== null;
  return typeof value === 'number' && Number.isFinite(value);
};

/** 运行时 canonical 值（≠ IR 的 ScalarValue：不含 boolean / null）；coerceValue 与自定义 parse 的输出域 */
export type ParsedFieldValue = string | number | undefined;

/** 收窄自定义 parse 的返回：string / number 留，其余（boolean / null / 对象 / undefined）→ undefined（跳过） */
const asParsedValue = (value: ParsedFieldValue): ParsedFieldValue => (typeof value === 'string' || typeof value === 'number' ? value : undefined);

/** 每个声明式 format 唯一蕴含的字段测量类型（temporal / continuous）；用于省略 type 时的覆盖与冲突校验 */
const FORMAT_IMPLIED_TYPE: Record<FieldFormat, FieldType> = {
  [PlotFieldFormat.Iso]: PlotFieldType.Temporal,
  [PlotFieldFormat.EpochSeconds]: PlotFieldType.Temporal,
  [PlotFieldFormat.EpochMillis]: PlotFieldType.Temporal,
  [PlotFieldFormat.SlashDate]: PlotFieldType.Temporal,
  [PlotFieldFormat.NumberString]: PlotFieldType.Continuous,
  [PlotFieldFormat.Percent]: PlotFieldType.Continuous,
};

/** format → 它蕴含的字段测量类型（每个 format 唯一绑定一个 type） */
export const formatImpliedType = (format: FieldFormat): FieldType => FORMAT_IMPLIED_TYPE[format];

/** 严格 YYYY/MM/DD 斜杠日期（四位年 / 两位月 / 两位日，分隔符必须 `/`；不收 D/M/Y、M/D/Y 等地区歧义布局） */
const SLASH_DATE_RE = /^(\d{4})\/(\d{2})\/(\d{2})$/;

/** 严格 slashDate → UTC 零点 epoch ms；不匹配严格布局 → NaN（不猜地区布局） */
const parseSlashDate = (raw: unknown): number => {
  if (typeof raw !== 'string') return NaN;
  const match = SLASH_DATE_RE.exec(raw.trim());
  if (!match) return NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Date.UTC(year, month - 1, day);
};

/** 数值 / 数值串 → number（非有限 → NaN）；epoch 秒 / 毫秒缩放共用 */
const toEpochNumber = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return NaN;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

/** 宽松数字串：去前后空白 + 去千分位逗号后 Number；空串 / 非数字 → NaN */
const parseNumberString = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  const cleaned = raw.trim().replace(/,/g, '');
  if (cleaned === '') return NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/** 百分比串 '50%' → 0.5（去 `%`、Number/100）；非法 → NaN */
const parsePercent = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw / 100 : NaN;
  if (typeof raw !== 'string') return NaN;
  const trimmed = raw.trim();
  if (!trimmed.endsWith('%')) return NaN;
  const numeric = trimmed.slice(0, -1).trim();
  if (numeric === '') return NaN;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed / 100 : NaN;
};

/**
 * 按声明式 format 选内置 parser：原始值 → canonical 值
 * @description 进 normalizeRows 的 per-field parser 槽（与 ADR-04 resolveField.parse 同槽，优先级 resolveField > format）。
 *   iso 等价内置 temporal 默认（走 toTimestamp）；返回 NaN → 下游按非有限跳过。type 仅 iso 路径需要（沿用内置 coerce）。
 */
export const formatParser = (type: FieldType, format: FieldFormat): ((raw: unknown) => ParsedFieldValue) => {
  switch (format) {
    case PlotFieldFormat.Iso:
      return raw => coerceValue(raw, type);
    case PlotFieldFormat.EpochSeconds:
      return raw => toEpochNumber(raw) * 1000;
    case PlotFieldFormat.EpochMillis:
      return raw => toEpochNumber(raw);
    case PlotFieldFormat.SlashDate:
      return parseSlashDate;
    case PlotFieldFormat.NumberString:
      return parseNumberString;
    case PlotFieldFormat.Percent:
      return parsePercent;
  }
};

/**
 * 收集 model 里各 FieldDef 的 `format`：① 校验显式 type 与 format 蕴含 type 冲突 fail-loud
 *   ② 省略 type 的字段按 format 蕴含 type 覆盖基础类型 ③ 收集 format 选出的内置 parser（按逻辑名键）
 * @description 仅处理出现在 userSourceFields 的声明字段；类型覆盖优先级 = format 蕴含 > 推断（< 显式 type / resolveField.type）。
 *   产出的 parser 进 normalizeRows 的 per-field parser 槽，resolveField.parse 命中同字段时由调用方覆盖（优先级 resolveField > format）。
 */
export const collectFormatFields = (
  model: DataModel | undefined,
  baseTypes: Map<string, FieldType>,
  userSourceFields: Set<string>,
): { fieldTypes: Map<string, FieldType>; parsers: Map<string, (raw: unknown) => ParsedFieldValue> } => {
  const fieldTypes = new Map(baseTypes);
  const parsers = new Map<string, (raw: unknown) => ParsedFieldValue>();
  if (model === undefined) return { fieldTypes, parsers };
  for (const field of model) {
    if (field.format === undefined) continue;
    if (!userSourceFields.has(field.name)) continue;
    const impliedType = formatImpliedType(field.format);
    if (field.type !== undefined && field.type !== impliedType) {
      throw new Error(
        `lowerPlots: field "${field.name}" declares type "${field.type}" but format "${field.format}" implies "${impliedType}" (incompatible)`,
      );
    }
    // type 省略 → format 蕴含 type 覆盖推断（永不被推断成 categorical）
    fieldTypes.set(field.name, impliedType);
    parsers.set(field.name, formatParser(impliedType, field.format));
  }
  return { fieldTypes, parsers };
};

/**
 * ingest 归一化：把每行的用户源字段「(fieldMap) 解析物理路径 → 按 FieldType coerce（或自定义 parse 覆盖）」写成 canonical 行
 * @description 逻辑名为扁平键、值已强制；保留原始字段（供 datumIdField 等）与 `SOURCE_INDEX`（spread 转移）。
 *   全下游（transform / scale / mark / locator）统一读 canonical（按逻辑名），无第二处 coerce。
 *   model 或 resolveField 命中时调用；某字段有 parser（ADR-04）则用 parser，否则按类型内置 coerce。
 */
export const normalizeRows = (
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, FieldType>,
  fieldMap?: Record<string, string>,
  parsers?: Map<string, (raw: unknown) => ParsedFieldValue>,
): Array<ExternalRow> =>
  rows.map(row => {
    const canonical: ExternalRow = { ...row };
    for (const [logical, type] of fieldTypes) {
      const physical = fieldMap?.[logical] ?? logical;
      const raw = resolveFieldPath(row, physical);
      const parse = parsers?.get(logical);
      canonical[logical] = parse ? asParsedValue(parse(raw)) : coerceValue(raw, type);
    }
    return canonical;
  });

/**
 * 抽样校验绑定数据：每个用户源字段在样本里至少有一个可强制值，否则 fail-loud
 * @description validateData 开启时调用——把「字段缺失 / fieldMap 错 → 静默空图」变成「明确报错」。默认关、不 warn。
 */
export const validateBoundData = (rows: Array<ExternalRow>, fieldTypes: Map<string, FieldType>, sampleRows: number): void => {
  const limit = Math.min(rows.length, sampleRows);
  if (limit === 0) return;
  for (const [logical, type] of fieldTypes) {
    let valid = false;
    for (let index = 0; index < limit; index++) {
      if (isCoercedValid(coerceValue(resolveFieldPath(rows[index], logical), type), type)) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      throw new Error(`lowerPlots: field "${logical}" has no valid values in the sampled data (check fieldMaps / dataset)`);
    }
  }
};
