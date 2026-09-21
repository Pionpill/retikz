# 按对象选择评审维度

## ADR / 计划

- ADR 检查长期功能、核心决策、基础公开契约、默认/失败语义与兼容性。
- 同步简略 plan 检查能力归属、完备性、同类设计、否决方案、测试策略与非目标；不把这些反向塞入 ADR。
- 细化 plan 检查 ADR 追溯、文件/逻辑/依赖顺序、TEST_CONTRACT、docs/changelog、验证、提交边界与风险。
- ADR Gate rubric 使用 develop-completeness；实现尚未存在不能作为设计缺陷，实施细节不应反向冻结公开设计。

## 实现 / public surface

按范围加载根/就近 AGENTS、standard-structure 与 standard-name 的适用 references，不复制另一套 schema、类型或命名规则。

| 维度         | 具体证据                                                                                |
| ------------ | --------------------------------------------------------------------------------------- |
| 正确性       | 边界、顺序、重复调用、引用失败、组合行为的具体输入与结果                                |
| 类型与 IR    | Source/Canonical/Input 边界、JSON 往返、默认/继承、非法状态、真实上下文错误             |
| 可诊断性     | 错误能否定位字段/id/path；schema describe 是否准确表达契约                              |
| 所有权       | Kernel/Sugar/Tier 2、registry/resolve/compile、公共 barrel 与依赖方向，是否另造平行机制 |
| 命名         | 名称能否表达真实 owner、阶段、数据角色和副作用；问题给出位置与建议名                    |
| 对等性       | React/Vanilla 同能力语义是否一致；差异是否有正式契约                                    |
| 同步         | 实现、测试、公开注释、zh/en 文档及 demo 是否同一承诺                                    |
| 简洁性与性能 | 实际重复路径、死代码、无消费者抽象、热路径开销或缓存生命周期，不凭长度要求拆分          |
| 测试         | 最低层行为守卫、回归反例、是否弱化断言或依赖私有实现细节                                |

禁止仅因 schema parse 通过就假设所有上下文不变量成立；不得要求给所有内部类型增加 Zod。性能 finding 说明工作负载与成本，不把缺 memo 自动判为 bug。

普通用户文档审查读取 docs-doc-review；不要用 ADR 模板套正文。
