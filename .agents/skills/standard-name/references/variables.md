# 变量与角色命名

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

## id、key 与 name

- 图形领域 `id` 标识可对外查询的图元或语义区域；用于引用、图元信息登记与 inspection。唯一性由所属命名空间或 owner 定义，不默认全局唯一；别名统一叫 `aliasIds`，多个 id 指向同一实例时不重复生成图元或空间记录
- `key` 用于 runtime 区分、集合匹配、索引、缓存或 diff；不因设置 key 自动登记图元，也不把公开图元查询字段命名为 key。React 保留的 key 与传给绘图 runtime 的 key 分属各自作用域，adapter 必须显式接线
- `name` 表达定义、具名配置或领域词汇的符号名称，如 provider、scale、anchor；展示文本按职责使用 label/title，图中实例身份使用 id
- 按消费行为判定，不机械替换 Map 的 key/value、数据字段/代码成员 name、非图形领域的实例 id 或内部映射键。同一文本可被显式用于 id 与 key，但两者的作用域、生命周期和查询职责分别定义

## 语义角色后缀

| 角色                  | 必须使用的名称                               | 规则                                                                                            |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| callback / 阶段上下文 | `XxxContext`、`XxxResolveContext` 等         | 完整上下文及作为其具名字段类型的上下文片段都以 `Context` 结尾，如 `InspectionAppearanceContext` |
| 运行时 schema 值      | `XxxSchema`、可复用 shape 的 `XxxBaseSchema` | 只要符号承载运行时 parse / validation schema，就以 `Schema` 结尾                                |
| 单条诊断记录          | `XxxDiagnostic`                              | diagnostics 集合元素的具名类型以 `Diagnostic` 结尾；集合字段或局部变量使用 `diagnostics`        |
| 配置选项              | `XxxOptions`、`XxxOptionsInput`              | 完整选项以 `Options` 结尾；作者侧、稀疏或待解析输入以 `OptionsInput` 结尾                       |
