# 变量与角色命名

## 变量命名规范

变量、参数和属性使用 camelCase；名称表达领域对象、语义角色和必要的数据结构，不添加无意义的标量类型后缀。函数内部的变量与参数同样遵守这些规则。

| 主题       | 推荐形式                                                                              | 边界                                                                                            |
| ---------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 语义类别   | `nodeSchema`、`resolveContext`、`compileOptions`、`compileResult`、`sourcePath`       | 避免脱离窄上下文的 `data`、`value`、`item`、`base`、`target`、`result`                          |
| 类型信息   | `scenePath`、`diagnostics`、`resourceMap`                                             | 不写 `nameString`、`optionsObject`；集合必须表达元素语义与容器角色，不能只叫 `data` 或 `active` |
| 生命周期   | `previousXxx`、`currentXxx`、`nextXxx`、`candidateXxx`、`pendingXxx`、`committedXxx`  | 多个版本同时存在时必须标明时间或事务角色                                                        |
| 来源与阶段 | `sourceXxx`、`authoredXxx`、`localXxx`、`effectiveXxx`、`resolvedXxx`                 | 限定词必须对应真实阶段，不单独使用 `local`、`effective` 代替类别                                |
| 布尔值     | `isXxx`、`hasXxx`、`canXxx`、`shouldXxx`                                              | 优先肯定语义，避免 `active`、`alive`、`matching`、`isNotDisabled`                               |
| callback   | `onDiagnostic`、`onCommit`、`onFrame`                                                 | `onXxx` 只表示外部注入的事件回调；主动执行使用 `emit`、`dispatch`、`notify`                     |
| 身份       | `xxxId`、`xxxKey`、`xxxToken`、`xxxHandle`                                            | 分别表达外部身份、索引键、不透明凭证和能力句柄，不混用也不省略后缀                              |
| 数值       | `durationMs`、`angleDeg`、`itemCount`、`itemIndex`、`itemOffset`                      | 单位可能混淆时加单位；区分数量、序列位置与相对位移                                              |
| 词对       | `source/target`、`parent/child`、`local/world`、`start/end`、`min/max`、`lower/upper` | 同一抽象固定使用一组，不混用近义词                                                              |
| 完整词     | `direction`、`distance`、`perimeter`、`discriminant`、`arguments`、`command`          | 不使用 `dir`、`dist`、`perim`、`disc`、`args`、`cmd` 等删减缩写                                 |

package-public / owner-visible 名称必须独立表达领域与角色；文件内 helper 可省略文件 owner 已唯一表达的领域词。极窄 callback、循环或公式中，类型与相邻表达式已唯一限定时可使用 `key`、`entry`、`x`、`t`、`i`、`p0` 等短名；一旦跨分支、跨阶段或同时出现多个同类值，必须补充领域与角色。SVG / CSS / TeX / IR 等标准术语及其标准字段按仓库既有 canonical spelling 保留，不自行创造缩写。

- 重要集合声明必须写 JSDoc，说明数据结构、元素或键值含义及用途；递归、去重或缓存集合还须说明有效范围或增删时机，区分当前递归链与全局已访问状态
- 路径名标明所属模型与表示，如 `irPath`、`scenePath`、`primitivePath`；不得把 IR 地址、Scene 内容地址、几何路径和文件路径混用同一含义
- 几何集合说明内容或坐标角色，如 `boundsPoints`、`localPoints`、`pathCommands`，不只用 `geometry` 或 `data`
- 布尔状态使用谓词名，如 `isResourceContent`；策略字段使用明确的策略名，如 `pointerEvents`，不使用容易被误认为操作函数的名称

## 数据结构与后缀

职责明确时优先职责后缀，如 `geometryCache`，不叠加成 `geometryCacheMap`；否则按容器结构命名。单个变量保持一套后缀规则，不能只用后缀替代元素语义。

| 结构或职责                | 命名规则                                                                 | 示例                                |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| `Map`                     | 使用 `Map`；需区分索引方向时补 `ById` / `ByName`                         | `resourceMap`、`resourceByIdMap`    |
| `WeakMap`                 | 默认使用 `Map`；弱引用语义影响理解时使用 `WeakMap`                       | `metadataMap`                       |
| `Array` / `ReadonlyArray` | 默认使用复数领域名；与同元素的其它容器并存时可加 `Array`                 | `primitives`、`boundsPoints`        |
| `Set` / `WeakSet`         | 默认使用复数元素名；需区分容器或强调去重时加 `Set`，必要时明确 `WeakSet` | `activeObjects`、`visitedNodeSet`   |
| `Record`                  | 用 `valueByKey` 表达映射方向，不加 `Record`                              | `resourceById`、`optionsByName`     |
| 队列 / 栈                 | 使用 `Queue` / `Stack`，分别表达 FIFO / LIFO                             | `pendingNodeQueue`、`ancestorStack` |
| 缓存 / 复合索引           | 使用 `Cache` / `Index`；普通 Map 不称为复合索引                          | `geometryCache`、`spatialIndex`     |
| 普通对象                  | 使用职责后缀，不加 `Object`                                              | `compileContext`、`renderOptions`   |
| 标量                      | 不加 `String` / `Number` / `Boolean`；必要时注明单位或使用布尔谓词       | `durationMs`、`isVisible`           |

复数名不承诺区分 Array 与 Set；具体结构由类型声明与重要集合的 JSDoc 补足。禁止为只读容器机械添加 `Readonly` 前缀。

## id、key 与 name

- 图形领域 `id` 标识可对外查询的图元或语义区域；用于引用、图元信息登记与 inspection。唯一性由所属命名空间或 owner 定义，不默认全局唯一；别名统一叫 `aliasIds`，多个 id 指向同一实例时不重复生成图元或空间记录
- `key` 用于 runtime 区分、集合匹配、索引、缓存或 diff；不因设置 key 自动登记图元，也不把公开图元查询字段命名为 key。React 保留的 key 与传给绘图 runtime 的 key 分属各自作用域，adapter 必须显式接线
- `name` 表达定义、具名配置或领域词汇的符号名称，如 provider、scale、anchor；展示文本按职责使用 label/title，图中实例身份使用 id
- 按消费行为判定，不机械替换 Map 的 key/value、数据字段/代码成员 name、非图形领域的实例 id 或内部映射键。同一文本可被显式用于 id 与 key，但两者的作用域、生命周期和查询职责分别定义

## 语义角色后缀

| 角色                  | 必须使用的名称                                       | 规则                                                                                     |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| callback / 阶段上下文 | `XxxContext`、`XxxVisitContext`、`XxxResolveContext` | 上下文及其具名片段均以 `Context` 结尾；访问上下文不使用含义不明确的 `Site`               |
| 运行时 schema 值      | `XxxSchema`、可复用 shape 的 `XxxBaseSchema`         | 只要符号承载运行时 parse / validation schema，就以 `Schema` 结尾                         |
| 单条诊断记录          | `XxxDiagnostic`                                      | diagnostics 集合元素的具名类型以 `Diagnostic` 结尾；集合字段或局部变量使用 `diagnostics` |
| 配置选项              | `XxxOptions`、`XxxOptionsInput`                      | 完整选项以 `Options` 结尾；作者侧、稀疏或待解析输入以 `OptionsInput` 结尾                |
