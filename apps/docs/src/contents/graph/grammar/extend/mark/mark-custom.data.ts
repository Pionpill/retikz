export type GlyphRow = {
  month: number;
  sales: number;
};

/** demo 自造数据集：月份 → 销售额，喂自定义 diamond mark 投影成菱形 glyph（不进 IR）。 */
export const glyphRows: Array<GlyphRow> = [
  { month: 1, sales: 20 },
  { month: 2, sales: 70 },
  { month: 3, sales: 45 },
  { month: 4, sales: 62 },
];
