import type { PathGeneratorDefinition } from './types';

/**
 * 注册一个 path generator（注册时 best-effort 元校验）
 * @description 直通返回 def，并在注册时做轻量早报错——确认 `paramsSchema` 是个可用的 zod schema、
 *   `generate` 是函数、`targetParams`（若给）是字符串数组。**不是唯一保证**：generator 输出是否真的
 *   JSON-safe，由 compile 运行时的双 parse 护栏（`paramsSchema.parse` 后再 `JsonObjectSchema.parse`）
 *   最终拍板。本工厂只在最常见的形态错误上提前报错，让第三方作者更早发现问题。
 *
 *   含函数（`paramsSchema` / `generate`）但**不进 IR**——它是 `CompileOptions.pathGenerators` 运行时注入的
 *   TS 对象，符合 IR 100% JSON 可序列化约束（函数只在运行时注入面，不在 IR 字段里）。
 * @param def generator 定义（paramsSchema / targetParams? / generate）
 * @returns 原样返回的 def（便于 `export const parabola = definePathGenerator({ ... })`）
 * @throws 当 paramsSchema 不是可 parse 的 zod schema、generate 不是函数、或 targetParams 形态非法时
 */
export const definePathGenerator = (
  def: PathGeneratorDefinition,
): PathGeneratorDefinition => {
  const schema = def.paramsSchema as { safeParse?: unknown } | null | undefined;
  if (
    schema === null ||
    typeof schema !== 'object' ||
    typeof schema.safeParse !== 'function'
  ) {
    throw new Error(
      'definePathGenerator: paramsSchema must be a zod schema (with a safeParse method).',
    );
  }
  if (typeof def.generate !== 'function') {
    throw new Error('definePathGenerator: generate must be a function.');
  }
  if (
    def.targetParams !== undefined &&
    (!Array.isArray(def.targetParams) ||
      def.targetParams.some(key => typeof key !== 'string'))
  ) {
    throw new Error(
      'definePathGenerator: targetParams must be an array of top-level param key strings.',
    );
  }
  return def;
};
