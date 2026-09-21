---
name: standard-name
description: 新增、移动、拆分或审查 Retikz 源码目录、文件、导出类型、函数、枚举、registry 或框架组件命名时使用，确保符合仓库命名规范。
---

# 标准命名

`standard-name` 是 Retikz 源码命名的唯一真源。先确定 owner 与职责，再从下表选择目录、文件和符号名。领域 skill 只说明行为与归属，不重复定义命名。

## 通用形式

- 泛型参数使用 `T` 或 `T` 开头的 PascalCase 语义名，匹配 `^(T|T[A-Z][A-Za-z]+)$`，禁止首尾下划线；由 LLM 自审
- 同组 re-export 按来源路径排序，具名导出成员按名称排序；存在初始化副作用依赖时保留执行次序，不为排序改变语义；由 LLM 自审

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

## 按需读取

| 修改对象                                                       | 必读 reference                          |
| -------------------------------------------------------------- | --------------------------------------- |
| Source IR 一级属性或 defaults 通道                             | [字段语义](references/source-fields.md) |
| 函数、谓词、阶段动词                                           | [函数](references/functions.md)         |
| 变量、属性、参数、具名结构角色                                 | [变量与角色](references/variables.md)   |
| schema / Input / Canonical / Definition / registry、目录或文件 | [分层命名](references/layers.md)        |

按真实输入、输出、副作用和 owner 判断名称；检查 get 是否隐藏创建、parse/normalize/resolve 是否混用、局部简称是否泄漏到公共面。通用短名只在相邻类型与表达式已唯一限定时使用，不为缩短名字牺牲语义。
