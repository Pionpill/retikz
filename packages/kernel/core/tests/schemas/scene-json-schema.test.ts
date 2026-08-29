import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { SceneSchema } from '../../src/schemas';

const toSceneJsonSchema = () => toJSONSchema(SceneSchema, { unrepresentable: 'any' });

describe('SceneSchema 可导出 JSON Schema（喂 LLM / 工具链的结构化 schema 出口）', () => {
  it('z.toJSONSchema 产出 object 型 JSON Schema 且可序列化往返', () => {
    const jsonSchema = toSceneJsonSchema();
    expect(jsonSchema).toMatchObject({ type: 'object' });
    expect(JSON.parse(JSON.stringify(jsonSchema))).toEqual(jsonSchema);
  });

  it('schema 字段的 .describe(...) 文案进入 description', () => {
    const jsonSchema = toSceneJsonSchema();
    expect(JSON.stringify(jsonSchema)).toContain('"description"');
  });

  it('Source JSON 接受 contextual number，但编译后的 Scene 颜色槽位只含字符串', () => {
    const source: IRScene = SceneSchema.parse({
      type: 'scene',
      version: 1,
      children: [{ type: 'node', position: [0, 0], color: '#336699', fill: 0.2, textColor: 0.8, text: 'A' }],
    });
    const compiled = compileToScene(source).scene;

    expect(source.children[0]).toMatchObject({ fill: 0.2, textColor: 0.8 });
    expect(JSON.stringify(compiled)).toContain('#d6e0eb');
    expect(JSON.stringify(compiled)).toContain('#5c85ad');
    expect(JSON.stringify(compiled)).not.toContain('"fill":0.2');
    expect(JSON.stringify(compiled)).not.toContain('"fill":0.8');
  });
});
