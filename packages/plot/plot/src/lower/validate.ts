import { type Channel, type DataModel, type ExternalRow, type FieldType, PlotMark, type PlotSpec, PlotTransform } from '../ir';
import { inferFieldType } from './infer';

/** 把一个通道的 field 路径（若有）加入集合（常量 value 通道无 field，跳过） */
const addChannelField = (fields: Set<string>, channel: Channel | undefined): void => {
  if (channel?.field !== undefined) fields.add(channel.field);
};

/**
 * 收集 plot spec 里所有「用户源字段」（引用外部数据集的逻辑字段）
 * @description 含 encoding `x`/`y`/`a`/`b`/`c`/`color` 的 field + mark `order`/`series` + transform 输入（`Sort.field` / `Stack.x`/`y`/`groupBy`）；
 *   **排除**常量 `value` 通道与派生/输出字段（`Stack.startField`/`endField`、mark `y0Field`/`y1Field`、sector `startField`/`endField`）。
 *   仅这些字段参与 model strict 校验与类型解析。位置角色按坐标系不同取 x/y（1D-2D）或 a/b/c（ternary）。
 */
export const collectUserSourceFields = (spec: PlotSpec): Set<string> => {
  const fields = new Set<string>();
  for (const mark of spec.marks) {
    if (mark.type !== PlotMark.Sector) {
      addChannelField(fields, mark.encoding.x);
      addChannelField(fields, mark.encoding.y);
      // ternary a/b/c 位置角色通道同样是用户源字段：须进 model strict 校验 + 归一化 coerce（不漏过数据契约）
      addChannelField(fields, mark.encoding.a);
      addChannelField(fields, mark.encoding.b);
      addChannelField(fields, mark.encoding.c);
    }
    addChannelField(fields, mark.encoding.color);
    // PointMark 专属非位置通道（size / opacity）的字段也是用户源字段（参与 strict 校验 + 类型推断）
    if (mark.type === PlotMark.Point) {
      addChannelField(fields, mark.encoding.size);
      addChannelField(fields, mark.encoding.opacity);
      addChannelField(fields, mark.encoding.shape);
    }
    if (mark.type === PlotMark.Line || mark.type === PlotMark.Area) {
      if (mark.order !== undefined) fields.add(mark.order);
    }
    if (mark.type === PlotMark.Line || mark.type === PlotMark.Interval || mark.type === PlotMark.Area) {
      if (mark.series !== undefined) fields.add(mark.series);
    }
  }
  for (const transform of spec.transform ?? []) {
    if (transform.kind === PlotTransform.Sort) {
      fields.add(transform.field);
      continue;
    }
    // stack（当前判别联合仅 sort / stack；新增 transform 时在此补分支）
    fields.add(transform.y);
    if (transform.x !== undefined) fields.add(transform.x);
    if (transform.groupBy !== undefined) fields.add(transform.groupBy);
  }
  return fields;
};

/**
 * 把用户源字段解析成「逻辑字段名 → FieldType」的单一映射（供 type-driven scale / coercion 消费）
 * @description 有 model = strict：每个用户源字段必须在 model 声明（否则 fail-loud），model 无重复字段名；
 *   无 model = 全推断（`inferFieldType` 抽样）。二选一，无混合。
 */
export const resolveFieldTypes = (
  model: DataModel | undefined,
  rows: Array<ExternalRow>,
  userSourceFields: Set<string>,
): Map<string, FieldType> => {
  const map = new Map<string, FieldType>();
  if (model !== undefined) {
    // strict 按 name；type 可省（ADR-05）：声明 name 即进契约，type 缺省的字段按数据推断
    const declaredNames = new Set<string>();
    const declaredTypes = new Map<string, FieldType>();
    for (const field of model) {
      if (declaredNames.has(field.name)) {
        throw new Error(`lowerPlots: duplicate field "${field.name}" in data.model`);
      }
      declaredNames.add(field.name);
      if (field.type !== undefined) declaredTypes.set(field.name, field.type);
    }
    for (const field of userSourceFields) {
      if (!declaredNames.has(field)) {
        throw new Error(`lowerPlots: unknown field "${field}" (data.model is declared; all referenced source fields must be listed)`);
      }
      map.set(field, declaredTypes.get(field) ?? inferFieldType(rows, field));
    }
  } else {
    for (const field of userSourceFields) {
      map.set(field, inferFieldType(rows, field));
    }
  }
  return map;
};
