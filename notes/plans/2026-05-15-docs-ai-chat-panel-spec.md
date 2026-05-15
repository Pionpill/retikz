# 文档站 AI 聊天面板 · 设计 Spec

> 2026-05-15 · 由 `notes/plans/docs-ai-chat-panel.md` 经过 brainstorming 确认后产生
>
> 实现位置：`apps/docs/src/layout/ai-chat/`

## 目标

给 retikz docs 站加一个侧边栏 AI 问答面板，让用户能基于当前文档页内容提问。GitHub Pages 静态部署、无服务器、BYOK（用户自己的 key）。

## 永久红线

retikz docs 站**永远不会**：
- 提供任何官方 API key
- 代理任何模型调用
- 收集用户问答内容

所有模型成本由用户的 key 承担。UI 在 settings 必须显式告知。

## 已决方案

### 1. 入口与形态

- **触发器**：Header 右上「✦ Ask AI」按钮（在 `<DocsSearch />` 旁），与 `Cmd+K` 形成对称。复用 `lucide-react` 的 `Sparkles` 或自定义 ✦。
- **快捷键**：`Cmd/Ctrl+I` 切换开关；生成中 `Esc` 取消生成，否则 `Esc` 关闭。
- **面板形态**：shadcn `Sheet`（`side="right"`），覆盖在内容上方。默认宽度 `sm:max-w-md`。

### 2. 跨页面行为

Panel 打开时用户 SPA 内导航：**保持开启，context 跟随当前页更新**。每次请求时按当前 route 重读 mdx 拼 system。UI 顶部 chip 显示「📄 <当前页标题>」让用户知道 AI 此刻基于哪页回答。

### 3. Sheet 内三种视图

视图由 store `view` 字段控制：

| view | 何时进入 |
|---|---|
| `empty` | 任一激活 provider 未配置 key |
| `settings` | 用户主动点齿轮 / 从 empty 点「填 key」CTA |
| `conversation` | 已配置 key 的默认对话视图 |

#### 3.1 Empty 视图（深链兜底 + 填 key CTA）

```
✦ Ask AI                                    [⚙] [✕]
─────────────────────────────────────────────────────
              ✦
       基于当前页问 AI
   retikz 不提供 API，需要自己的 key 或外部账号

A. 站内对话（推荐 · 流式 · 引用链接）
       [ 填入 API Key → ]              ← 切到 settings
   支持 DeepSeek · OpenAI · Anthropic（key 仅本地）

           ──── 或 ────

B. 跳到外部聊天（无需 key · 预填当前页）
   [ G ChatGPT ]  [ C Claude ]  [ D DeepSeek ]
                                        ↑ 复用 buildAiUrl
   国区直连 OpenAI / Anthropic 不稳，DeepSeek 直连稳定
```

#### 3.2 Settings 视图（分段平铺）

```
‹ Back        ⚙ 设置                          [✕]
─────────────────────────────────────────────────
PROVIDER
[ DeepSeek* ] [ OpenAI ] [ Anthropic ]    ← segmented active=*

API KEY
[ sk-•••••••••••••••                       ]
仅保存本地浏览器，永不上传。如何获取？

MODEL
[ deepseek-chat                          ▾ ]   ← dropdown + 自定义

CONTEXT MODE                    （影响 system 拼装）
[ Lean ] [ Balanced* ] [ Heavy ]
当前页 mdx + 全站 llms.txt 索引

ⓘ 国区直连 OpenAI/Anthropic 不稳，建议优先 DeepSeek

⚠ 若启用 Anthropic：dangerouslyAllowBrowser 启用即表示你
  确认在受信任的个人设备上使用自己的 key
```

切换 provider 立即切换显示的 key / model 输入（每家 provider 独立保存 key & model）。

#### 3.3 Conversation 视图

```
✦ Ask AI  [📄 coordinate]                 [⚙] [✕]
─────────────────────────────────────────────────
                       coordinate 怎么用作锚点？

  用 `at` 属性把 coordinate 作为 Node 的位置锚点：
  ```tsx
  <Coordinate id="A" x={2} y={1} />
  <Node at="A">...
  ```
  更多用法看 [coordinate-as-anchor 示例](/...) 或
  [anchors 概念](/...) ▍                      ← 流式光标
─────────────────────────────────────────────────
  问问当前页…
  ─────────────────────────────────────────
  DeepSeek · ↑2.1K · ↓312 · ≈$0.001  [↑ Send]
─────────────────────────────────────────────────
              Esc 取消生成 · ⌘I 关闭
```

- **User message**：右对齐 bubble、灰底
- **Assistant message**：左对齐裸文 markdown，行内 citation 链接（站内 `/path` 自动走 react-router）
- **流式光标**：assistant 生成中尾部 `▍` 闪烁
- **Meta 行**：`<provider> · ↑<input> · ↓<output> · ≈$<USD>` 累计（整个会话）
- **Send → Stop**：生成中按钮变停止图标，触发 `AbortController`

### 4. 默认与可配置

| 项 | 默认 | 可改 |
|---|---|---|
| 默认 provider | DeepSeek | settings 切换 |
| DeepSeek 模型 | `deepseek-chat` | dropdown + 自定义 |
| OpenAI 模型 | `gpt-4o-mini` | dropdown + 自定义 |
| Anthropic 模型 | `claude-haiku-4-5` | dropdown + 自定义 |
| Context mode | `balanced` | toggle group |
| 站点语言 → system 语言 | 跟随 | 不暴露切换 |

## 架构

### 文件结构

```
apps/docs/src/
├── layout/ai-chat/
│   ├── index.ts                       (export AiChatTrigger, AiChatSheet)
│   ├── AiChatTrigger.tsx              Header 按钮 + Cmd+I 快捷键监听
│   ├── AiChatSheet.tsx                Sheet 容器 + view router
│   ├── parts/
│   │   ├── AiChatEmpty.tsx
│   │   ├── AiChatSettings.tsx
│   │   ├── AiChatConversation.tsx
│   │   ├── AiChatMessage.tsx          markdown 渲染（极简自写解析器）
│   │   └── AiChatInput.tsx
│   ├── providers/
│   │   ├── types.ts                   ChatProvider 接口
│   │   ├── deepseek.ts
│   │   ├── openai.ts
│   │   └── anthropic.ts
│   ├── context.ts                     按 contextMode 拼 system message
│   ├── llms-txt.ts                    runtime fetch /retikz/llms.txt + 5min 内存缓存
│   ├── pricing.ts                     各家价目表 → USD 估算
│   └── models.ts                      各家推荐模型列表
├── store/useAiChatStore.ts
├── i18n/locales/{zh,en}.json          + ai.* 命名空间
├── layout/header/AppHeader.tsx        改：插入 <AiChatTrigger />
└── App.tsx                            改：挂 <AiChatSheet /> + Cmd+I 全局快捷键
```

### ChatProvider 接口

```ts
export type ProviderId = 'deepseek' | 'openai' | 'anthropic';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type ChatChunk =
  | { type: 'delta'; text: string }
  | { type: 'done'; usage: { input: number; output: number; cacheRead?: number } }
  | { type: 'error'; kind: 'auth' | 'rate' | 'window' | 'network' | 'unknown'; message: string };

export interface ChatProvider {
  id: ProviderId;
  chat(opts: {
    apiKey: string;
    model: string;
    system: string;
    messages: ChatMessage[];
    signal: AbortSignal;
  }): AsyncGenerator<ChatChunk, void, void>;
}
```

每家 impl 把自家 SSE schema（OpenAI/DeepSeek 的 `data: {json}`、Anthropic 的多事件 `event:/data:`）转成上面统一的 AsyncGenerator。

### Store 形态（Zustand）

```ts
type AiChatState = {
  // persisted（localStorage key: retikz-ai-chat-config）
  providerId: ProviderId;
  models: Record<ProviderId, string>;
  apiKeys: Record<ProviderId, string>;
  contextMode: 'lean' | 'balanced' | 'heavy';
  // ephemeral
  open: boolean;
  view: 'empty' | 'settings' | 'conversation';
  messages: ChatMessage[];
  isGenerating: boolean;
  abortRef: { current: AbortController | null };
  usage: { input: number; output: number; cacheRead: number };
  // actions
  toggleOpen: () => void;
  setView: (v: View) => void;
  setProvider: (id: ProviderId) => void;
  setApiKey: (id: ProviderId, key: string) => void;
  setModel: (id: ProviderId, model: string) => void;
  setContextMode: (m: ContextMode) => void;
  send: (input: string, system: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
};
```

### Context 拼装（context.ts）

```ts
export const composeSystem = async (opts: {
  mode: ContextMode;
  currentPage: { title: string; mdx: string; lang: 'zh' | 'en' };
}): Promise<string> => {
  const base = `You are an assistant for retikz (TikZ React adapter) documentation.
Answer the user's question based on the current page content. Respond in ${opts.currentPage.lang === 'zh' ? '中文' : 'English'}.`;
  const page = `\n\n# Current page: ${opts.currentPage.title}\n\n${opts.currentPage.mdx}`;
  if (opts.mode === 'lean') return base + page;
  const llms = await fetchLlmsTxt();
  return base + page + `\n\n# Site index (other pages)\n\n${llms}`;
  // heavy: v1 内部按 balanced 处理；demo 源码拉取留待 v1.1
};
```

### 数据流

```
User clicks Send
  ↓
store.send(input, system)
  ↓ append user message; set isGenerating=true
  ↓ create AbortController, store ref
  ↓ pick provider impl by providerId
  ↓
provider.chat({ apiKey, model, system, messages, signal })
  ↓ yields delta chunks
  ↓ for await: append text to latest assistant message
  ↓ on done: accumulate usage
  ↓ on error: replace assistant message with error block; categorized by kind
  ↓ finally: isGenerating=false; abortRef=null
```

### 错误分类与 UI

| kind | 触发 | UI 文案 |
|---|---|---|
| `auth` | 401 | "API key 无效。检查 settings 里的 key →" |
| `rate` | 429 | "请求过频，稍后重试。" |
| `window` | 400 (含 context window exceeded) | "本会话内容过长。新开会话或换更大 context 模型。" |
| `network` | fetch reject / AbortError(非用户取消) | "网络问题，检查连接。" |
| `unknown` | 其他 | "请求失败：<msg>" |

错误以红色 inline message 显示在最后一条 assistant 位置，并不计入 messages 历史。

## 实现优先级

**v1（本次实现）**：
- ✅ 全部 3 个 provider + 流式 + AbortController 取消
- ✅ Empty / Settings / Conversation 三视图
- ✅ Sheet 触发器 + ⌘I 快捷键
- ✅ Empty 视图深链兜底（复用 `buildAiUrl`）
- ✅ Settings 完整：provider segmented / key / model / contextMode
- ✅ Conversation：消息列表 + 当前页 chip + meta + send/stop
- ✅ markdown 渲染：自写极简解析器（段落 / 代码块 / inline code / 链接 / list / 加粗 / 标题）
- ✅ Token meter + USD 估算
- ✅ 错误 4 类分类
- ✅ Anthropic ToS 提示
- ✅ i18n（zh + en）

**v1.1（不在本次范围）**：
- Code block "+ 加到 AI" 按钮 + attachment chips
- Heavy 模式真正展开 demo 源码
- Inline citation 高亮（v1 就用普通 markdown 链接）
- 移动端体验优化

## 安全/合规

- API key 仅存 `localStorage`（key: `retikz-ai-chat-config`）；UI 文案明确「永不上传」
- Anthropic 启用时显示 ToS 提示
- 不内置任何官方 key
- 站点禁止引入未审核第三方 JS（避免 XSS 偷 key）

## 不实现的事

明确**不做**：
- 会话持久化（关闭页面即丢）
- 会话列表 / 切换
- 跨设备同步
- 跨页向量检索 / agentic retrieval
- 上下文压缩 / 历史总结
- 会话导入/导出
