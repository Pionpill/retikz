# @retikz/foundation 工作指南

本文件只写 `@retikz/foundation` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：为 Kernel、Standard、Viz 与其它跨领域包提供无领域的原子类型工具、typed non-empty string 不变量和可分类错误骨架
- **拥有的契约**：`ValueOf`、`AssertEqual`、`OpenString`、`assertNonEmptyString`、`RetikzErrorOptions`、`RetikzError` 与 `isRetikzError`
- **不拥有的能力**：IR、schema、parser、geometry、Definition / registry、Diagnostic、renderer、host state、领域错误码或领域恢复语义
- **输入与输出**：接收已由调用方收窄的字符串和结构化错误基础字段，输出 `void`、普通 `Error` 或 Foundation 错误 class hierarchy；不解析 `unknown`，不创建图形数据
- **缺口流向**：unknown 输入校验与错误包装留在消费方；IR / schema / compile 进入 Core；执行 identity / transaction / diagnostic 进入 Runtime；renderer 与领域 details 留在各自 owner

## 硬约束

- 生产包无 dependencies、peerDependencies、外部运行时库或上层 Retikz 包
- 只提供根入口；`./types`、`./assert`、`./error` 与其它 subpath 不属于公开 API
- `src/` 固定为 `types.ts`、`assert.ts`、`error.ts`、`index.ts`；不得新增 `shared`、`utils`、`helpers` 或领域目录
- `index.ts` 只用 `export *` 聚合三个 owner 文件，不写业务逻辑、包装或重命名
- `assertNonEmptyString` 只接受 `string`，拒绝空串与全空白内容；未知值的收窄和 owner 错误语义由调用方负责
- `RetikzError` 只保留 code、message、details 与 own cause；不自动生成 JSON、Diagnostic 或全仓错误码

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/foundation exec eslint . --fix
pnpm --filter @retikz/foundation exec tsc --noEmit
pnpm --filter @retikz/foundation test:run
```
