# @retikz/math 工作指南

本文件只写 `@retikz/math` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：为 core 与领域包提供零依赖、确定性、可复用的二维数值和计算几何底座，避免各包重复实现并产生数值语义分叉
- **拥有的契约**：数值常量、点 / 向量 / bounds 等纯数据类型、仿射与坐标换算、arc / curve、求交、包围、凸包和其它宿主无关几何算法
- **不拥有的能力**：任何 IR / Zod schema、Drawing / Plot 领域语义、布局策略、Scene 编译、renderer、DOM / React runtime 或诊断文案策略
- **输入与输出**：接收 number、tuple 与 plain geometry data，输出 number、tuple、plain object、`null` 或空集合；不接收框架实例、IR 节点或 renderer context
- **缺口流向**：能脱离绘图语义成立的纯几何下沉本包；涉及 Core IR、anchor、shape 或 layout 契约时进入 `@retikz/core`；涉及视觉映射进入领域包；涉及后端 API 进入 `@retikz/render`

## 硬约束

- 运行时零依赖，不引入 `zod`、框架、DOM 或渲染后端。
- 函数保持纯且确定；使用 plain data，不写 class，不维护 module-level mutable state。
- 不为单个 shape、mark、renderer 或 demo 添加带领域策略的 helper；先抽出可独立命名和测试的通用数学问题。
- 退化输入、epsilon、排序和空结果语义必须可测试且文档化；不要把调用方策略隐藏进数值 helper。

## 公开 API

- `src/index.ts` 只聚合稳定 owner barrel；新增导出前确认命名能脱离单个消费方语境。
- 多个包需要同一纯几何算法时优先在这里建立单一真源；只有一个调用点且抽象不稳定时保留在主责包内部。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/math exec eslint . --fix
pnpm --filter @retikz/math exec tsc --noEmit
pnpm --filter @retikz/math test:changed
```
