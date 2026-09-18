# Source IR 字段语义

## Source IR 一级语义分组

Source IR 需要收敛同类字段时使用下列固定一级属性名；只有存在对应语义时才建立分组，不创建空对象或通用包装层。

| 属性名         | 固定语义                                                        | 边界                                                                                      |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `style`        | 当前实例的直接视觉覆盖，如 paint、stroke、字体、透明度与效果    | 不承载继承 Theme、数据通道映射、布局策略或已解析 appearance                               |
| `layout`       | 当前对象的尺寸、间距、排列与布局策略                            | `position`、`shape`、`coordinate`、显式路径等主要领域事实保持独立                         |
| `theme`        | 可继承的视觉环境选择，经 definition 生成默认值                  | Core 环境只含 style / mode；显式领域默认用 `xxxDefaults`，条件规则独立，不另设 flat token |
| `presentation` | title、subtitle、description、note、source 等外围内容与展示结构 | 不承载 drawing core、数据 encoding 或底层图元样式                                         |
| `encoding`     | 数据字段、常量或派生值到视觉通道的映射                          | 直接实例样式进入 `style`，数据处理进入 `transform`                                        |
| `defaults`     | 容器向后代提供的具名默认值通道                                  | 不与当前实例 `style` 混合，不使用 `default` / `defaultStyle` 等平行总分组名               |
| `routing`      | 自动或半自动关系路由的策略与覆盖                                | 已确定的显式线路使用准确的 `route` 或路径结构；不得借用 `layout` 表达 relation routing    |

`appearance` 只命名 resolve、manifest、inspection 等已确定的视觉结果；可持久化 Source 中的作者视觉覆盖统一使用 `style`。同一对象不得并存同义的 `style` / `appearance`、`layout` / `routing` 或其它别名分组。

领域显式默认使用复数 `xxxDefaults`，规则使用 owner 的独立规则入口（如 `graphRules`）；裸 `defaults` 保留既有 Core 通道。不得用 `xxxTheme`、`xxxDefault` 或 `xxxDefaultStyle` 命名同义默认入口；Theme definition 的生成值与作者 defaults 复用 Source 片段，但保留各自来源和优先级。
