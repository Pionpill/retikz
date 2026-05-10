# 文档站 AI 聊天面板 — 设计讨论

> 写于 2026-05-11。**草案 / 待续**——未进入实施，下次接着聊。
>
> 触发：用户看到 LangChain 文档侧边栏的 AI 对话面板，想给 retikz docs 做一个。约束：项目无服务器（纯静态部署）。

## 参照对象澄清

LangChain 那个"侧边栏聊天"其实是**两个东西**，先别混：

1. **`chat.langchain.com`** — 独立站点，**有服务器**。后端用 LangGraph + LangChain Agents（Python），通过 Mintlify API 检索 LangChain 自家文档、Pylon API 取支持文章，部署在 LangGraph Cloud。和我们要做的不是一回事。
2. **`docs.langchain.com` 侧边栏的 "Ask AI" 按钮** — 是 **Mintlify 平台自带 AI Assistant**，开箱即用的托管 widget，agentic retrieval。本质还是 Mintlify 那边有服务器，文档站只是嵌 widget。

**结论**：LangChain 自己没写"无服务器版的侧边栏聊天"。我们要做的形态在它那找不到现成参考，得自己设计。

## 已决方向：方案 A — BYOK 浏览器直连

用户填自己的 OpenAI / Anthropic / DeepSeek API key，存 localStorage；面板里直接 `fetch` 对应 API；上下文由当前页 mdx + `llms.txt` 拼接。

### 为什么选 A（对比另外两条路）

| 方案 | 否决原因 |
|---|---|
| B. 第三方托管（Inkeep / Kapa.ai / Algolia Ask AI） | $150~$500/月起，alpha 阶段不值得，且锁定供应商 |
| C. "Open in ChatGPT/Claude" 深链跳转 | 跳出站点，不能在侧边栏聊；可作 A 的兜底（用户没填 key 时） |

### A 的契合度证据

- `apps/docs/src/components/icons/` 已有 `chatgpt / claude / deepseek` 三个图标 → 早就在朝这个方向铺路
- `apps/docs/scripts/gen-llms-txt.ts` 已存在 → 上下文喂料现成
- 三个 LLM 商的 SDK 都支持浏览器直接调（CORS 通；Anthropic 用 `dangerouslyAllowBrowser: true`），不需要代理

### 安全红线

- key **必须是用户自己的**，绝不内置任何官方 key
- key 仅存 localStorage / IndexedDB，UI 写明"不上传"
- 输出到模型的内容仅限文档本身，不带任何用户隐私

## "无服务器能不能解决上下文压缩 / 历史会话"

诚实答案：**不能完全解决，但够用**。

| 能力 | 厂商免费给 | 必须自己写 |
|---|---|---|
| Prompt 缓存（同一段 system / 文档上下文重复发不重复计费） | ✅ Anthropic `cache_control` / OpenAI 自动 / DeepSeek 自动 | — |
| 流式输出 | ✅ SSE | — |
| 多轮历史 | ❌ API 无状态 | localStorage / IndexedDB 自己存 |
| 会话列表 / 切换 | ❌ | 自己写 UI + 存储 |
| 上下文压缩（接近窗口上限自动总结/裁剪） | ⚠️ 仅 Anthropic 有 beta（Memory tool / context editing），需按规范调 | 实操还是自己写：滑动窗口 / 总结旧轮 |
| 跨设备同步 | ❌ | **做不到，必须有服务器**（接受单浏览器限制） |

### 应对策略（草案）

1. **存储**：IndexedDB（`dexie` 或 `idb`）。会话表：id / title / createdAt / messages[] / model
2. **上下文拼装**：
   ```
   system: 固定 prompt + 当前页 mdx 摘要 + 全局 llms.txt 片段
            ↑ 这一段加 cache_control: ephemeral
   messages: 最近 N 轮（N=10 起步）
   ```
3. **触发压缩**：响应里 `usage.input_tokens` 超 80k 时
   - 简单版：丢最旧 1~2 轮
   - 进阶版：再调一次 API 让模型把丢掉的部分总结成一条 `system: <prior summary>` 塞回去
4. **硬截断**：API 报窗口溢出时，UI 提示"该会话太长，开新会话"，给"用 AI 总结后开启新会话"按钮
5. **跨设备同步**：暂不支持，未来接 Cloudflare D1 / Supabase 再说

## 下次开聊时要决定的事

- [ ] 侧边栏 UI 形态：固定右侧 drawer / 可拖拽 panel / 浮窗？
- [ ] 三厂商 adapter 抽象边界：是否抽 `ChatProvider` 接口？流式接口怎么统一？
- [ ] 上下文喂料颗粒度：当前页全文 vs 段落级 vs 整站 llms.txt？token 预算多少？
- [ ] 会话存储 schema 细化（多设备无同步的前提下，导入/导出 JSON 是否要支持？）
- [ ] 模型默认值：每家 provider 默认选什么型号？是否暴露给用户切换？
- [ ] 国际化：聊天 UI 文案 i18n（已有 zh/en）；system prompt 是否随站点语言切换？
- [ ] AI 回答里引用文档片段如何做（生成 anchor 链接给用户跳转）？
- [ ] 兜底方案 C 怎么集成：没填 key 时显示一排"在 ChatGPT/Claude/DeepSeek 打开"按钮，URL 怎么构造？

## 关联

- `apps/docs/scripts/gen-llms-txt.ts` — 喂料源
- `apps/docs/src/components/icons/{chatgpt,claude,deepseek}.tsx` — UI 图标已就位
- 现有 i18n key `reference.aiAssistedDevelopment` — 可能放置入口的位置之一

## 生命周期

进入实施时拆成正式 plan（或合并到对应 docs 站迭代 plan）。本文件**完工/废弃即删**。
