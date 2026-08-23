# @retikz/foundation 工作指南

本文件只写 `@retikz/foundation` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：为 Kernel、Standard、Viz 与其它跨领域包提供无领域的原子类型工具、基础 Zod 校验、typed non-empty string 不变量、JSON 数据快照、结构只读集合快照和可分类错误骨架
- **拥有的契约**：`ValueOf`、`AssertEqual`、`OpenString`、`WithRequiredProperties`、`NonEmptyReadonlyArray` 等无领域类型工具，既有断言与错误契约，六个无领域标量 schema、`createOpenStringSchema(values)`、`cloneAndFreezeJson` 深冻结快照与 `createReadonlyMap` 浅快照
- **不拥有的能力**：IR、对象或领域 schema、parser、geometry、Definition / registry、Diagnostic、renderer、host state、领域错误码或领域恢复语义
- **输入与输出**：基础 schema 把 unknown 校验为不变形的 string / number；JSON helper 输出脱离原输入的深冻结副本；集合契约把 entries 复制为不暴露写方法的浅快照；其余契约接收已收窄字符串或结构化错误基础字段，输出 `void` 或 Foundation 错误 class hierarchy；不创建图形数据
- **缺口流向**：对象结构、IR 与领域校验留在对应 owner；IR / compile 进入 Core；执行 identity / transaction / diagnostic 进入 Runtime；renderer 与领域 details 留在各自 owner

## 硬约束

- 唯一允许的生产依赖是 `zod`；不得依赖其它外部运行时库、peer dependency 或 Retikz 上层包
- 只提供根入口；`./types`、`./assert`、`./error` 与其它 subpath 不属于公开 API
- `src/` 固定为 `types.ts`、`schema.ts`、`assert.ts`、`collections.ts`、`error.ts`、`json.ts`、`index.ts`；不得新增 `shared`、`utils`、`helpers` 或领域目录
- `index.ts` 只用 `export *` 聚合六个 owner 文件，不写业务逻辑、包装或重命名
- `types.ts` 只承载无领域、无运行时代码的 TypeScript 类型投影；不得引入领域模型、运行时 helper 或重复上层 owner 语义
- `schema.ts` 只承载无领域 string / number 原子，以及唯一受限的 `createOpenStringSchema(values)`；禁止对象、数组、coercion、transform、default、catch、参数化 range factory、颜色、几何或领域 refinement
- `createOpenStringSchema(values)` 只接受 const object enum，并组合已知 enum branch 与非空白开放字符串 branch；不得查询 registry、注入领域默认或收窄为闭合集合
- `collections.ts` 只承载无领域的结构只读集合浅快照；不得深拷贝或冻结 entry value，也不得包含 registry、identity 或领域状态
- `z.number()` 已拒绝非有限数；不得增加无行为差异的 finite schema 或 `.finite()`
- `NonBlankStringSchema` 与 `assertNonEmptyString` 使用同一空白定义，均不 trim 或改写合法输入
- `assertNonEmptyString` 只接受 `string`，拒绝空串与全空白内容；未知值的收窄和 owner 错误语义由调用方负责
- `assertNonEmptyString` 的原子失败直接抛出 `RetikzFoundationError`，通过 code、message、details 与 cause 区分；调用方不得 catch 后改写为重复的 owner 错误
- `cloneAndFreezeJson` 只处理 JSON-safe plain data，返回脱离原输入的深冻结副本；JSON 结构无效时抛出 `RetikzFoundationError`，调用方可在自己的错误边界转换错误类型
- `RetikzError` 只保留 code、message、details 与 own cause；不自动生成 JSON、Diagnostic 或全仓错误码

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/foundation exec eslint . --fix
pnpm --filter @retikz/foundation exec tsc --noEmit
pnpm --filter @retikz/foundation test:run
```
