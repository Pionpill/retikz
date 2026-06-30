import { SceneSchema } from '@retikz/core';
import { z } from 'zod';

/** 把 core 的 SceneSchema 转成喂给 LLM / 工具链的 JSON Schema 契约。 */
export const sceneContract = (): Record<string, unknown> =>
  z.toJSONSchema(SceneSchema, { io: 'input', unrepresentable: 'any' });

/** 契约的缩进 JSON 字符串形式，直接拼进 prompt 上下文。 */
export const sceneContractString = (): string => JSON.stringify(sceneContract(), null, 2);
