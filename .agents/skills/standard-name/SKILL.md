---
name: standard-name
description: 新增、移动、拆分或审查 Retikz 源码目录、文件、导出类型、函数、枚举、registry 或框架组件命名时使用，确保符合仓库命名规范。
---

# 标准命名

`standard-name` 是 Retikz 源码命名的唯一真源。先确定 owner 与职责，再从下表选择目录、文件和符号名。领域 skill 只说明行为与归属，不重复定义命名。

## 通用形式

- 使用完整的语义词。不得缩写 `direction`、`reference`、`background`；已建立的 TikZ / SVG / CSS 术语如 `stroke`、`fill`、`cx` 例外
- 目录与非组件文件使用 kebab-case。源码名通常用一至两个语义词，只有确实区分独立概念时才用第三个；`.test` / `.demo` / `.data` / locale 后缀不计入词数
- React 组件和类才使用 PascalCase。hook、store、context 分别使用 `useXxx`、`useXxxStore`、`useXxxContext`；其余值和函数使用 camelCase
- `index.ts` 只用作目录 barrel：导出 owner 的稳定表面，不承载业务逻辑
- `types.ts` 放导出或 owner 内共享类型，`constants.ts` 放稳定常量与 const object enum，`utils.ts` 只放没有更窄职责的纯 helper。只有一个调用点的 helper 与其 consumer 相邻
- 概念在定义处命名。不得通过 import / export `as` 隐藏 owner 本应解决的命名冲突
- 具名结构必须由符号自身显式表达语义角色，不能依赖字段名、目录或调用位置补足含义；当职责已由类型或局部上下文明确时，字段与局部变量可使用简洁的 `context`、`schema`、`diagnostic(s)`、`options`

## 命名核心准则

- 名称必须语义自解释；只看变量、参数、属性或函数名，就应能推断其作用、数据类别和适用范围。避免无上下文的 `data`、`value`、`item`、`base`、`target`、`result`、`key` 等泛化名称；只有在类型或局部上下文已经明确职责时才可简化
- 函数通常采用动宾短语：前面的动词表达动作，后面的名词表达对象或细节，如 `resolvePath`、`formatName`、`isKeyEqual`；不要使用 `keyEqual` 这类缺少动作的名称。导出函数使用完整领域语义，如 `admitInspectionSelection`；仅内部使用且上下文已明确时可简化为 `admitSelection`
- 变量、参数和属性通常采用“形容词或分类限定词 + 类别名”结构，最后一个单词表示其类别，如 `nodeSchema`、`basePath`。布尔值使用可读的谓词形式，如 `isKeyEqual` 或 `hasSelection`
- namespace、registry、builder 等成员按完整调用表达式判断，如 `vector2.add()`、`registry.get()`；owner 已表达的领域词不在成员名中重复，脱离 owner 的顶层函数必须补足

通用可读性参考 [Google TypeScript](https://google.github.io/styleguide/tsguide.html#identifiers)、[Microsoft TypeScript](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines#names)、[Airbnb JavaScript](https://github.com/airbnb/javascript#naming-conventions)、[Angular](https://angular.dev/style-guide) 与 [typescript-eslint](https://typescript-eslint.io/rules/naming-convention/)；具体动词、阶段和角色以本规范为准

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

## 变量命名规范

变量、参数和属性使用 camelCase；最后一个词表达语义类别，前面的词表达领域、来源、阶段、状态或限定条件。名称不重复 TypeScript 已明确的 primitive / collection 实现类型。

| 主题       | 推荐形式                                                                              | 边界                                                                                       |
| ---------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 语义类别   | `nodeSchema`、`resolveContext`、`compileOptions`、`compileResult`、`sourcePath`       | 避免脱离窄上下文的 `data`、`value`、`item`、`base`、`target`、`result`                     |
| 类型信息   | `sourcePath`、`diagnostics`、`ownerByKey`                                             | 不写 `nameString`、`itemsArray`、`optionsObject`；只有实现行为属于契约时才加 `Set` / `Map` |
| keyed 容器 | `scaleByName`、`scopeById`、`topologyByPath`、`idByKey`                               | 使用 `valueByKey` 明确值与索引方向；复合 lookup 才使用 `XxxIndex`                          |
| 集合       | `diagnostics`、`definitions`、`sourceFields`                                          | Array / Set 使用复数领域名；单个元素使用对应单数名                                         |
| 生命周期   | `previousXxx`、`currentXxx`、`nextXxx`、`candidateXxx`、`pendingXxx`、`committedXxx`  | 多个版本同时存在时必须标明时间或事务角色                                                   |
| 来源与阶段 | `sourceXxx`、`authoredXxx`、`localXxx`、`effectiveXxx`、`resolvedXxx`                 | 限定词必须对应真实阶段，不单独使用 `local`、`effective` 代替类别                           |
| 布尔值     | `isXxx`、`hasXxx`、`canXxx`、`shouldXxx`                                              | 优先肯定语义，避免 `active`、`alive`、`matching`、`isNotDisabled`                          |
| callback   | `onDiagnostic`、`onCommit`、`onFrame`                                                 | `onXxx` 只表示外部注入的事件回调；主动执行使用 `emit`、`dispatch`、`notify`                |
| 身份       | `xxxId`、`xxxKey`、`xxxToken`、`xxxHandle`                                            | 分别表达外部身份、索引键、不透明凭证和能力句柄，不混用也不省略后缀                         |
| 数值       | `durationMs`、`angleDeg`、`itemCount`、`itemIndex`、`itemOffset`                      | 单位可能混淆时加单位；区分数量、序列位置与相对位移                                         |
| 词对       | `source/target`、`parent/child`、`local/world`、`start/end`、`min/max`、`lower/upper` | 同一抽象固定使用一组，不混用近义词                                                         |
| 完整词     | `direction`、`distance`、`perimeter`、`discriminant`、`arguments`、`command`          | 不使用 `dir`、`dist`、`perim`、`disc`、`args`、`cmd` 等删减缩写                            |

package-public / owner-visible 名称必须独立表达领域与角色；文件内 helper 可省略文件 owner 已唯一表达的领域词。极窄 callback、循环或公式中，类型与相邻表达式已唯一限定时可使用 `key`、`entry`、`x`、`t`、`i`、`p0` 等短名；一旦跨分支、跨阶段或同时出现多个同类值，必须补充领域与角色。SVG / CSS / TeX / IR 等标准术语及其标准字段按仓库既有 canonical spelling 保留，不自行创造缩写。

## 语义角色后缀

| 角色                  | 必须使用的名称                               | 规则                                                                                            |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| callback / 阶段上下文 | `XxxContext`、`XxxResolveContext` 等         | 完整上下文及作为其具名字段类型的上下文片段都以 `Context` 结尾，如 `InspectionAppearanceContext` |
| 运行时 schema 值      | `XxxSchema`、可复用 shape 的 `XxxBaseSchema` | 只要符号承载运行时 parse / validation schema，就以 `Schema` 结尾                                |
| 单条诊断记录          | `XxxDiagnostic`                              | diagnostics 集合元素的具名类型以 `Diagnostic` 结尾；集合字段或局部变量使用 `diagnostics`        |
| 配置选项              | `XxxOptions`、`XxxOptionsInput`              | 完整选项以 `Options` 结尾；作者侧、稀疏或待解析输入以 `OptionsInput` 结尾                       |

## 分层目录与文件

| Owner / 职责                   | 目录与文件名                                                           | 说明                                                                       |
| ------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Source IR 契约                 | `schemas/<domain>/schema.ts`、`types.ts`、`constants.ts`               | 只放 schema 与其 `IRXxx` 类型                                              |
| 外部 unknown 输入              | `parse/<domain>/parse.ts` 或小型 `parse/<domain>.ts`                   | `parseXxx()` 将 unknown、JSON、字符串或序列化 DSL 校验为 IR                |
| Vanilla API authoring          | `normalize/<domain>/normalize.ts`、owner-local `types.ts`              | `normalizeXxx()` 无 compile context 地把 `InputXxx` 转为 IR                |
| 纵向领域内部解析               | `resolve/<domain>/resolve.ts`、`types.ts`                              | `resolveXxx()` 消费 Source IR 与 context，产出 Canonical 或领域 Resolution |
| 扩展 contract                  | `contract/<capability>/types.ts`、`define.ts`、`index.ts`              | 只放 contract 类型与 `defineXxx()`                                         |
| 内置 provider 与 registry      | `providers/<capability>/definitions.ts`、`registry.ts`、`<builtin>.ts` | `registry.ts` 合并并诊断；`definitions.ts` 组装内置项                      |
| Compile / pipeline domain 阶段 | `compile/<domain>/lower.ts`、`layout.ts`、`emit.ts`                    | context 生命周期与调度留在 orchestration；领域解析回 `resolve/`            |
| Shared vocabulary              | `shared/<topic>/{constants,types,utils,index}.ts`                      | 小型 topic 使用单文件                                                      |
| React DSL                      | `kernel/{components,protocol,adapter,runtime}`、`sugar/`、`render/`    | 公共组件文件使用 PascalCase，其余文件遵循通用形式                          |

不得为了套用本表而新建占位目录、泛化 `helpers.ts` 或纯转发 shim。

## 按语义阶段命名符号

| 概念                            | 必须使用的名称                                                         | Owner                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 持久化 IR schema 与类型         | `XxxSchema`、`IRXxx`                                                   | `schemas/`；`IRXxx = z.infer<typeof XxxSchema>`                                                            |
| 可复用 IR shape                 | `XxxBaseSchema`                                                        | `schemas/`；仅在实际复用或分阶段 refinement 时使用                                                         |
| Vanilla authoring input         | `InputXxx`                                                             | 仅 Vanilla / Plot Vanilla；只写 TypeScript                                                                 |
| 完整的内部确定形态              | 通常使用 `CanonicalXxx`                                                | 纵向领域 `resolve/<domain>/types.ts`；没有 Zod schema，不持久化                                            |
| resolver 窄上下文               | `XxxResolveContext`                                                    | 纵向领域 `resolve/<domain>/types.ts`；由 pipeline / compile 按当前阶段提供                                 |
| cascade / 继承后的有效值        | `EffectiveXxx`                                                         | 使用准确领域名，不得使用泛化的 `ResolvedXxx`                                                               |
| 携带附加解析信息的结果          | `XxxResolution`                                                        | 仅在同时需要 value、provider、provenance 或 diagnostics 时使用                                             |
| 扩展 contract 与作者输入        | `XxxDefinition`、`XxxDefinitionInput`、`AnyXxxDefinition`、`defineXxx` | `contract/`；Definition input 不是 Vanilla Input                                                           |
| Const object enum 与取值 union  | `Xxx`、`XxxValue`                                                      | object 用单数 PascalCase、成员用 PascalCase，并以 `ValueOf` 派生；不得使用 TypeScript `enum` 或 `XxxEnum`  |
| 内置集合 / lookup               | `BUILTIN_XXXS`、`BUILTIN_XXX_DEFINITIONS_BY_<KEY>`                     | `providers/`；`<KEY>` 是实际 discriminator                                                                 |
| Registry 合并 / 直接索引 helper | `resolveXxxRegistry`、`xxxDefinitionOf`                                | `providers/`；直接索引 helper 不处理领域 fallback 或上下文优先级                                           |
| 外部 parse                      | `parseXxx`                                                             | 只从 `unknown` 转为 `IRXxx`                                                                                |
| Vanilla authoring 组装          | `normalizeXxx`                                                         | 只在 Vanilla API 包中从 `InputXxx` 转为 `IRXxx`                                                            |
| Domain 数据结构确定化           | `resolveXxx`                                                           | 纵向领域中从 `IRXxx + XxxResolveContext` 产出 Canonical / Resolution；不得 parse unknown 或 emit primitive |
| 语义 lowering / 输出            | `lowerXxx`、`layoutXxx`、`emitXxx`、`collectXxx`                       | 遵循对应 compile 或 pipeline 阶段                                                                          |

顶层实体 discriminator 使用 `type`，内部 variant 使用 `kind`，命名 provider 使用 `name`。同一 discriminator 必须在 schema、contract、provider index、lookup、diagnostics 与 docs 中保持一致。

## Review 清单

1. 选定的 owner 是否匹配数据或行为，而不是当前 caller？
2. 具名结构是否显式带有 `Context` / `Schema` / `Diagnostic` / `Options` 等真实角色后缀？
3. 每个新增目录 / 文件名是否在分层表内，或存在更明确的领域名？
4. Input / IR / Canonical / Definition 的命名是否匹配实际阶段与持久化边界？
5. `parse`、Vanilla API `normalize` 与纵向领域 `resolve` 是否明确区分，且只有 resolver 产出 Canonical / Resolution？
6. enum、provider collection、barrel、组件和 helper 是否符合规定形式？
7. 函数名是否与创建、读取、查找、抛错、写 cache 和返回值行为一致，`validate` / `assert` 是否严格分离？
8. 关系谓词是否区分 equal、match、contain、overlap，布尔变量是否使用 `is` / `has` / `can` / `should`？
9. 变量、参数和属性是否以语义类别结尾，并补足来源、阶段、生命周期、身份或单位？
10. 局部别名、泛化 helper、旧名或平行类型是否掩盖了 owner 问题？

## 常见错误

- 不得将 `CanonicalXxx` 放在 `schemas/`、`contract/`、`providers/` 或 compile-private `types.ts`；它属于纵向领域 `resolve/<domain>/types.ts`
- 不得将 `XxxDefinitionInput` 命名为 `InputXxxDefinition`；两者 owner 不同
- 不得将 unknown 外部校验命名为 `normalize`，或将 context 解析命名为 `parse`
- 不得让 `validateXxx` 返回值、diagnostics 或 `void`，也不得用它表示失败时抛错；分别使用真实主行为或 `assertXxx`
- 不得用 `getXxx` 隐藏缺失时创建、cache 写入、资源分配或阶段推进；使用 `getOrCreateXxx` 或真实动作
- Core、Plot 等纵向领域包不得建立阶段级 `normalizeXxx` 或 `NormalizeContext`；纯 helper 使用准确动作名，数学值域 normalization 不受此分层限制
- 已有明确阶段或领域名时，不得使用 `processXxx`、`handleXxx`、`doXxx`、`completeXxx` 或泛化 `ResolvedXxx`
- 不得在长函数、状态机、导出参数或公开属性中使用 `dir`、`args`、`cmd`、`out`、`active` 等依赖反推的缩写或状态词
- 不得用 `Appearance`、`Issue`、`Settings` 等模糊名称省略结构实际承担的 `Context`、`Diagnostic`、`Options` 角色
