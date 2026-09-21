# 攻击面与测试方法

先从实际 package exports、owner schema/resolve/compile 与已有测试建立调用链，不硬编码过时的 src/ir 或 tests/parsers 路径。只选择授权范围适用的攻击面。

### 2. 构造攻击面

优先从以下维度找边缘场景：

| 攻击面            | 例子                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| JSON/IR 契约      | `JSON.stringify` / `JSON.parse` 后 schema parse 是否等价；额外字段 / 缺字段 / 错类型报错是否可诊断 |
| 数值边界          | `0`、负数、`NaN`、`Infinity`、极小/极大值、角度跨 360、空数组                                      |
| 引用解析          | 未定义 id、自引用、引用顺序、coordinate 与 node 同名、anchor 拼写错误                              |
| 顺序敏感          | path 首段不是 move、cycle 后继续画、多个 sub-path + arrow、多个 `<Layout>` 同页                    |
| 组合行为          | label + sloped + arrow + bend；at/offset/polar 嵌套；scale/rotate/sep 叠加                         |
| Sugar 等价        | `<Draw way={...}>` 是否等价于手写 `<Path><Step /></Path>`                                          |
| Builder/Unbuilder | `convertIRToReactNode` → `convertReactNodeToIR` round-trip 是否保真                                |
| Renderer 适配     | Scene primitive 到 SVG 的 id、marker、transform、path d、text line stacking                        |
| 错误信息          | throw / zod error 是否包含足够定位信息，而不是 silent no-op 或模糊错误                             |
| 重复调用          | 模块级缓存、`useId`、marker dedup、browser measurer canvas 复用                                    |

## 测试策略

- 确认 bug：新增或加强最小正式回归，记录修复前失败；不弱化原断言。
- 疑似 bug：在 tests/_scratch 构造最小探索，通过 pnpm temp:test 验证，证实稳定契约或高风险边界后再正式化。
- UX 改进：记录可诊断性、默认值或文档问题，不强行写失败测试。
- 只测 scope 涉及的适配入口；同能力存在 React/Vanilla 两端时检查 canonical IR 或有明确宿主差异映射的语义等价结果，不忽略 provenance/sidecar 的合法差别。
- case 名写行为与预期，不加本轮工作流前缀。位置沿用真实 owner 测试布局。
- 测试优先定向运行或 test:changed；仅大范围行为改动才跑模块全量，不擅自扩大为全仓。
