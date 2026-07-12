import type { ExternalRow } from '../shared';

/**
 * 行级源序标记。
 * @description 数据进入 pipeline 时给每行打 `row[SOURCE_INDEX]=i`；Symbol 键不进 JSON.stringify，也不会被字符串路径解析读取。
 */
export const SOURCE_INDEX = Symbol('retikz.data.sourceIndex');

/** 读一行的源序标记；未打标记时返回 undefined。 */
export const readSourceIndex = (row: ExternalRow): number | undefined => {
  const value: unknown = Reflect.get(row, SOURCE_INDEX);
  return typeof value === 'number' ? value : undefined;
};

/**
 * 组级源序标记：改行数 transform 给每个输出行打 `row[SOURCE_INDICES]=[...]`。
 * @description 聚合 / 分箱等输出行可代表一组源行，故 provenance 记录源行索引集合。
 */
export const SOURCE_INDICES = Symbol('retikz.data.sourceIndices');

/** 读一行的组级源序标记；bin / summarize 输出行可能携带。 */
export const readSourceIndices = (row: ExternalRow): Array<number> | undefined => {
  const value: unknown = Reflect.get(row, SOURCE_INDICES);
  return Array.isArray(value) && value.every((v): v is number => typeof v === 'number') ? value : undefined;
};

/** 取一组行的源行索引集合；仅源行已 tagSourceIndex 时非空。 */
export const readSourceIndicesOf = (rows: Array<ExternalRow>): Array<number> => {
  const out: Array<number> = [];
  for (const row of rows) {
    const group = readSourceIndices(row);
    if (group !== undefined) {
      out.push(...group);
      continue;
    }
    const index = readSourceIndex(row);
    if (index !== undefined) out.push(index);
  }
  return out;
};

/**
 * 给改行数 transform 的输出行打组级源序标记。
 * @description 成员行没有 sourceIndex 时原样返回；Symbol 键不会进入 JSON IR。
 */
export const withGroupProvenance = (row: ExternalRow, members: Array<ExternalRow>): ExternalRow => {
  const indices = readSourceIndicesOf(members);
  return indices.length > 0 ? { ...row, [SOURCE_INDICES]: indices } : row;
};

/**
 * 给每行打源序标记。
 * @description object spread 会保留可枚举 symbol 属性，transform 管线后标记仍可读取；resolveFieldPath / JSON 都忽略它。
 */
export const tagSourceIndex = (rows: Array<ExternalRow>): Array<ExternalRow> =>
  rows.map((row, index) => ({ ...row, [SOURCE_INDEX]: index }));
