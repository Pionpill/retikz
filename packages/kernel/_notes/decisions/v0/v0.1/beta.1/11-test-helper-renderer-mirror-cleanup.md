# ADR-11：core 测试 helper 去除 renderer mirror 漂移风险

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：

> **目标**：core 测试里 `helpers/path-d.ts` / `helpers/transform.ts` 镜像了 react adapter 的 `buildPathD` / `buildTransform`，把结构化 `PathCommand[]` / `Transform[]` 再序列化成 SVG 字符串作断言。把这些断言改为直接断言结构化命令数组，删掉镜像 helper，消除漂移风险。

## 背景 / 约束

两个 helper 主动镜像 react adapter 的实现（JSDoc 已显式登记"镜像 buildPathD/buildTransform"），带两个风险：

1. **测试断言重心错位**——alpha.5 把 PathPrim / GroupPrim 结构化的根本意图是"core 持结构化数据、adapter 各自翻译原生 API"；core 测试应守"结构化 commands 数组等价"契约，不该把断言重心拉回 SVG mini-language。
2. **漂移风险**——helper 与真实 renderer 各自维护，arc / transform / rounding / flag 逻辑改动时可能漂移：既可能误报（renderer 改了 helper 没改、测试挂）也可能漏报（helper 改了 renderer 没改、测试过但生产挂）。

## 决策：Core 以结构化命令作为唯一可观察契约

绝大多数 `pathCommandsToD(...)` 调用原意是检查命令序列正确性，改成断言 commands 数组深 equal；极少数 readable snapshot 风格的字符串断言迁到 （真实 `buildPathD` 产出 SVG 字符串、与字符串期望比较——SVG 输出契约的正确归口）。完工后删除两个镜像 helper。

理由：与 alpha.5 ADR-01 根本意图一致（core 守结构化契约、SVG 输出契约由 adapter 测试守）；不引入反向依赖。

### 决策细节

- **完工后删除 `helpers/path-d.ts` + `helpers/transform.ts`**，不留 readable formatter helper。
- **加 `PathCommand` factory helper 减少结构化断言样板**：`move([x,y])` / `line([x,y])` / `quad` / `cubic` / `arc` / `close` 等工厂，**只产结构化 PathCommand 对象、不产字符串**——避免重蹈 mirror renderer 覆辙。

## 长期边界

- 进一步审计其他 test helper——留下次发现时。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非 breaking（零生产代码改动）；其余默认行为、失败语义与公开契约以正文为准。
