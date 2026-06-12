import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PlotSpecSchema } from '../../src/ir/plot';

describe('PlotSpecSchema 可导出 JSON Schema（喂 LLM / 工具链的结构化 schema 出口）', () => {
  it('z.toJSONSchema 产出 object 型 JSON Schema 且可序列化往返', () => {
    const jsonSchema = z.toJSONSchema(PlotSpecSchema);
    expect(jsonSchema).toMatchObject({ type: 'object' });
    expect(JSON.parse(JSON.stringify(jsonSchema))).toEqual(jsonSchema);
  });

  it('schema 字段的 .describe(...) 文案进入 description', () => {
    const jsonSchema = z.toJSONSchema(PlotSpecSchema);
    expect(JSON.stringify(jsonSchema)).toContain('"description"');
  });
});
