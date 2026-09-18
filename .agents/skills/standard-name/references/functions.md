# 函数与谓词命名

## 函数命名规范

函数名使用 camelCase 和完整语义词。语义准确优先于套模板；普通函数使用动宾结构，纯投影、表示转换和完整调用表达式可以使用下表中的稳定形式。

| 形式                                 | 作用                                                                    | 边界                                                           |
| ------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `parseXxx`                           | 把 unknown、JSON、字符串或序列化 DSL 解析为 IR                          | 不接收编译 context，不承担 Vanilla authoring 组装              |
| `normalizeXxx`                       | 在 Vanilla API 中把 `InputXxx` 组装为 IR                                | 不承担外部 unknown 校验或内部领域确定化                        |
| `resolveXxx`                         | 结合 context 把内部数据确定为 Canonical / Resolution                    | 不 parse unknown，不 emit Scene / primitive                    |
| `createXxx`                          | 创建新实例、context、registry、session、controller 或带独立生命周期的值 | 不用于字符串格式化、直接索引或既有字段投影                     |
| `buildXxx`                           | 从多段输入组装完整结构或描述符                                          | 不暗示独立生命周期，不用于 lookup 或 cache accessor            |
| `formatXxx`                          | 产生稳定字符串表示，用于展示、诊断或机器 key                            | 不查 registry、不写 cache；稳定序列化使用 `serializeXxx`       |
| `readXxx`                            | 从已有结构、宿主、流或 adapter 输入读取内容                             | 不创建缺失项、不写 cache；解释 unknown 或字符串使用 `parseXxx` |
| `getXxx`                             | 获取调用时已经可得的值，可包含轻量派生                                  | 不隐藏创建、cache 写入、资源分配、解析或阶段推进               |
| `findXxx`                            | 搜索集合、树或候选空间                                                  | 未找到是正常结果，返回 `undefined`、`null` 或空结果，不抛错    |
| `requireXxx`                         | 获取契约上必须存在的值                                                  | 缺失时抛出 owner error，不用于一般校验                         |
| `getOrCreateXxx`                     | 读取已有项，缺失时创建并登记                                            | 必须显式暴露写入与生命周期变化，不简写为 `getXxx`              |
| `xxxOfYyy` / `xxxDefinitionOf`       | 从单一主体纯投影稳定属性或直接索引                                      | 不承担 fallback、合并、资源分配或 context 解析                 |
| `xxxFromYyy` / `xxxToYyy`            | 明确来源或表示转换                                                      | 输入与输出表示均须清楚；原地施加变换使用 `applyXxx`            |
| `snapshotXxx` / `sealXxx`            | 分别表达脱离复制，或移除不允许语义并最终冻结                            | 内部包含校验时仍按主要产物动作命名，并在 JSDoc 说明校验        |
| `tryXxx`                             | 尝试可能失败的动作，将预期失败编码进返回值                              | 成功必然发生或失败仍抛错时不得添加 `try`                       |
| `lowerXxx` / `layoutXxx` / `emitXxx` | 分别表达语义下沉、布局计算和 Scene / primitive 输出                     | 不使用 `processXxx`、`handleXxx`、`completeXxx` 等泛化阶段词   |
| `collectXxx`                         | 遍历并收集明确领域对象或 diagnostics                                    | 名称必须说明收集对象；不是所有返回数组的函数都叫 `collect`     |
| `defineXxx`                          | 声明并返回具体 `XxxDefinition`                                          | 不使用泛化 `createDefinition`                                  |
| `resolveXxxRegistry`                 | 合并并解析 registry                                                     | 可表达优先级或诊断，不与直接 lookup 混用                       |

`makeXxx` 仅保留给已有 factory callback、Definition contract 或 owner 已明确的工厂成员；新增顶层函数在 `createXxx` 与 `buildXxx` 中择一。`ensureXxx` 容易混淆“断言存在”“缺失时创建”和“推进状态”，默认不用；确需保留时必须由 JSDoc 明确副作用。`loadXxx` 只用于 I/O、动态模块或延迟资源边界。

### 校验与关系谓词

| 形式                                        | 返回值与含义                                                      | 边界                                                          |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `validateXxx`                               | 只返回 boolean，表示校验是否通过                                  | 预期失败返回 `false`，不抛错，不返回值、diagnostics 或 `void` |
| `assertXxx`                                 | 成功返回 `void` 或仅作 TypeScript narrowing，失败抛出 owner error | 校验已类型化数据或业务不变量，不重复 parse / schema 校验      |
| `isXxx`                                     | 判断类型、状态、相等关系或性质                                    | 不表达持有、能力或策略                                        |
| `hasXxx`                                    | 判断主体是否持有成员、内容或既有状态                              | 不表达许可或执行能力                                          |
| `canXxx`                                    | 判断当前能力、许可或前置条件是否允许动作                          | 不用于单纯字段存在性                                          |
| `shouldXxx`                                 | 表达策略或当前阶段建议                                            | 不用于不可变事实                                              |
| `isXxxEqual`                                | 判断领域定义下的严格 equality                                     | 不用 `match` 表达严格相等                                     |
| `doesXxxMatchYyy`                           | 判断值是否满足 pattern、selector、rule 或部分条件                 | 不写 `xxxMatches` 或 `isXxxMatches`                           |
| `doesXxxContainYyy` / `hasXxx`              | 分别表达对象间包含关系与主体持有状态                              | 不用 `match` 表达简单成员存在                                 |
| `doesXxxOverlapYyy` / `doesXxxIntersectYyy` | 判断范围或集合是否交叠                                            | 执行求交并返回结果使用 `intersectXxx`                         |
| `compareXxx`                                | 返回负数、零、正数或明确 ordering enum                            | 只返回 boolean 时改用相应谓词                                 |

返回 diagnostics、恢复值、决策枚举或确定值的函数按真实主行为使用 `parse`、`snapshot`、`classify`、`resolve`、`find` 等名称，不能继续叫 `validateXxx`。`applyXxx` 是否原地修改、`withXxx` 是否返回副本、`prepareXxx` / `commitXxx` 的事务边界以及 `disposeXxx` 的重复调用语义，由返回类型和 JSDoc 明确。

> 备注：`CanonicalXxx` 是领域确定化返回类型的一般形式，不是所有场景都必须套用的固定模板。特殊条件下应按真实返回语义使用其他准确类型，避免机械命名
