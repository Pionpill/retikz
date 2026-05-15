# 文档站 AI 聊天面板 — 设计讨论

> 初稿 2026-05-11，2026-05-15 修订（确定范围：极简问答，不做会话持久化 / 跨端同步）。**草案 / 待续**——未进入实施。
>
> 给 retikz docs 加一个侧边栏 AI 问答面板，让用户能基于当前文档页内容提问。约束：GitHub Pages 静态部署，无服务器。

## 参照对象澄清

LangChain 那个「侧边栏聊天」其实是**两个东西**，先别混：

1. **`chat.langchain.com`** — 独立站点，**有服务器**。后端用 LangGraph + LangChain Agents（Python），通过 Mintlify API 检索 LangChain 自家文档、Pylon API 取支持文章，部署在 LangGraph Cloud。和我们要做的不是一回事。
2. **`docs.langchain.com` 侧边栏的 "Ask AI" 按钮** — 是 **Mintlify 平台内置 AI Assistant**。跑在 Mintlify 服务器，Claude 4 + agentic retrieval（模型自调 `doc_search` 迭代检索），含在 Pro / Enterprise 套餐（外部估算 $150–$300/月起）。

**结论**：架构完全靠服务器，静态站学不来。LangChain 自己没写「无服务器版本」——这个形态没有现成参考，得自己设计降级方案。

## 已决方向：BYOK 浏览器直连 + 极简问答

### 永久红线

retikz docs 站**永远不会**提供任何官方 API key、不代理任何模型调用、不收集用户问答内容。所有模型成本由用户自己的 key 承担。

### 形态

- 侧边栏一个 AI 问答面板
- 用户在设置面板填自己的 OpenAI / Anthropic / DeepSeek key，存浏览器本地
- 面板里直接 `fetch` 对应 API；上下文 = 当前页 mdx 全文 + 全局 `llms.txt` 摘要
- 流式输出、单次会话内多轮（内存维护 messages，关闭页面即丢）
- **明确不做**：会话持久化 / 会话列表 / 跨设备同步 / 跨页向量检索 / 上下文压缩 / 历史导入导出

### 为什么不走其他路径

- **第三方托管**（Inkeep / Kapa.ai / Algolia Ask AI）：$150~$500/月起，alpha 阶段不值得，且锁定供应商
- **自建服务器代理**：必须为每个用户的请求付钱，违反「alpha 不烧钱」原则；让用户自己掏 key 是唯一可持续路径
- **「在 ChatGPT / Claude 打开」深链跳转**：跳出站点不能内嵌，体验差；只考虑作为「用户没填 key」时的 UI 兜底

## 资源已就位

- `apps/docs/src/components/icons/{chatgpt,claude,deepseek}.tsx` 三家图标
- `apps/docs/scripts/gen-llms-txt.ts` 喂料源
- i18n key `reference.aiAssistedDevelopment` — 入口候选

三家 SDK 都支持浏览器直接调（OpenAI/DeepSeek 原生 CORS；Anthropic 需 `dangerouslyAllowBrowser: true`，详见下文 ToS 风险）。

## 能力矩阵（无服务器下我们能拿到什么）

| 能力 | 厂商免费给 | 自己写 |
|---|---|---|
| Prompt 缓存（system + 文档片段复用） | ✅ Anthropic `cache_control` / OpenAI 自动 / DeepSeek 自动 | — |
| 流式输出 | ✅ SSE | 三家 event schema 不同——必须抽 `ChatProvider` 接口统一 delta 事件（OpenAI/DeepSeek 是 `data: {json}`，Anthropic 是多事件类型 `event:/data:`） |
| 单次会话多轮 | ❌ API 无状态 | 内存维护 messages 数组，关闭页面即丢 |
| 取消生成 | ✅ `AbortController` | UI 绑定 Esc / 按钮，贯通到 fetch |
| Token 用量回报 | ✅ `usage.{input,output}_tokens` | UI 显示 token 数 + 按 provider 价目表估算 USD |

## 必须想清楚的几个点

按风险大小排：

1. **Anthropic ToS 灰色地带**：`dangerouslyAllowBrowser: true` 在 Anthropic ToS 中明确只允许「受信任的客户端环境」。docs 站是公网静态站，严格说不符合该定义。三个选项：
   - 接受风险并在 UI 写明「by configuring, you acknowledge this is your key on your client」
   - 不支持 Anthropic provider，Claude 退化到「在 Claude 打开」深链兜底
   - 等 Anthropic 出官方浏览器端 BYOK 方案
2. **国区网络可达性**：BYOK 直连等于把网络问题甩给用户。`api.openai.com` / `api.anthropic.com` 国区直连不稳，DeepSeek（`api.deepseek.com`）国区直连 OK。UI 必须显式说明「需要直连厂商 API 的网络条件」，且 DeepSeek 作为国区首选 provider
3. **XSS → key 外泄**：localStorage 存 key 任何 XSS 都能偷。docs 站第三方脚本（搜索、统计、嵌入式 demo）的引入策略需写明红线；进阶可考虑 Web Crypto API 加密 + 用户每次开会话输入解密口令（更安全但更重）
4. **Token / 费用透明度**：BYOK 用户最敏感的就是「这条问答花了我多少钱」。每轮回答尾巴必须显示 input/output token + 按各家最新价目表估算 USD，否则用户不敢放心用
5. **错误分类与 UI 提示**：至少分 401（key 无效，引导去设置面板）/ 429（限速，提示稍后重试）/ 400（超窗口，提示「该会话太长，关闭重开」）/ 网络断（提示检查网络）四类，错误信息要明确指向「是 key 问题还是服务问题」

## 仍待决定

- [ ] 侧边栏 UI 形态：固定右侧 drawer / 可拖拽 panel / 浮窗
- [ ] 上下文喂料颗粒度：当前页全文 vs 段落级 vs llms.txt 全量；token 预算多少
- [ ] 每家 provider 默认模型选什么（DeepSeek-V3 / claude-sonnet-4-6 / gpt-4o-mini？是否暴露切换）
- [ ] system prompt 是否随站点语言切换（已有 zh/en）
- [ ] AI 回答里文档片段引用怎么呈现（anchor 链接 + 让用户跳转）
- [ ] 「代码块加入上下文」交互（抄 Mintlify）：mdx 里每个 code block 旁加按钮，把代码块作为上下文卡片传给 AI
- [ ] 用户没填 key 时是否显示「在 ChatGPT / Claude / DeepSeek 打开」深链兜底；URL 怎么构造

## 生命周期

进入实施时拆出独立 plan。本文件**落地完毕或废弃即删**。
