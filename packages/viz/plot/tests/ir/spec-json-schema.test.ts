import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import { PlotSchema } from '../../src/schemas/plot';

const toPlotIRJsonSchema = () => toJSONSchema(PlotSchema, { unrepresentable: 'any' });

describe('PlotSchema 可导出 JSON Schema（喂 LLM / 工具链的结构化 schema 出口）', () => {
  it('z.toJSONSchema 产出 object 型 JSON Schema 且可序列化往返', () => {
    const jsonSchema = toPlotIRJsonSchema();
    expect(jsonSchema).toMatchObject({ type: 'object' });
    expect(JSON.parse(JSON.stringify(jsonSchema))).toEqual(jsonSchema);
  });

  it('schema 字段的 .describe(...) 文案进入 description', () => {
    const jsonSchema = toPlotIRJsonSchema();
    expect(JSON.stringify(jsonSchema)).toContain('"description"');
  });
});
