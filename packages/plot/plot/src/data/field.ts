import { format as d3Format } from 'd3-format';
import { utcFormat } from 'd3-time-format';
import { type ExternalRow, PlotFieldType, type PlotFieldTypeValue, type TextChannel } from '../ir';
import type { Channel } from '../ir';

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
