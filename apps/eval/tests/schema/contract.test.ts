import { describe, expect, it } from 'vitest';
import { sceneContract, sceneContractString } from '../../src/schema/contract';

describe('sceneContract: SceneSchema → JSON Schema（喂 LLM 的结构化契约）', () => {
  it('产出 object 型 JSON Schema 且可序列化往返', () => {
    const schema = sceneContract();
    expect(schema).toMatchObject({ type: 'object' });
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });

  it('字段 .describe 文案进入 description（契约携带语义）', () => {
    expect(JSON.stringify(sceneContract())).toContain('"description"');
  });

  it('sceneContractString 返回缩进的 JSON 字符串', () => {
    const text = sceneContractString();
    expect(text).toContain('\n');
    expect(JSON.parse(text)).toEqual(sceneContract());
  });
});
