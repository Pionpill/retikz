import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ContextMode, CurrentPage, DiagramFormatPreference } from '@/layout/ai-chat/context';
import { composeSystem } from '@/layout/ai-chat/context';
import { DEFAULT_MODELS } from '@/layout/ai-chat/models';
import type { CustomProvider } from '@/layout/ai-chat/providers/resolve';
import { isBuiltInProviderId, resolveProvider } from '@/layout/ai-chat/providers/resolve';
import type { ChatErrorKind, ChatMessage, ProviderId } from '@/layout/ai-chat/providers/types';
import { buildRepairPrompt, findInvalidRetikzBlocks } from '@/layout/ai-chat/retikz-validation';

import {
  CONVERSATION_SCHEMA_VERSION,
  type Conversation,
  deleteConversationFromStorage,
  deriveTitleFromMessages,
  loadAllConversations,
  saveConversation,
} from '@/layout/ai-chat/conversationsStorage';

/** 主视图 / 设置视图 / 历史会话列表视图 */
type View = 'main' | 'settings' | 'history';

type ErrorState = { kind: ChatErrorKind; message: string } | null;

/** Add Context 选中的页面：URL 路径 + 已翻译标题；mdx 抓取放在 send() 时按需做 */
export type ContextItem = {
  path: string;
  title: string;
};

type PersistedState = {
  /** 当前选中的 provider id；内置三家或某个自定义 provider 的 id */
  providerId: string;
  /** 每个 provider（内置或自定义）当前选中的 model name */
  models: Record<string, string>;
  /** 内置 provider 的 API Key；自定义 provider 的 key 在 customProviders 里 */
  apiKeys: Record<ProviderId, string>;
  /** 各内置 provider 的 base URL 覆盖；空字符串 → 用各家默认端点 */
  baseUrls: Record<ProviderId, string>;
  /** 用户为某个 provider（内置或自定义）添加的自定义 model 名，用于 picker 展示 */
  customModels: Record<string, ReadonlyArray<string>>;
  /** 用户添加的自定义 provider；按 id 持久化 */
  customProviders: Record<string, CustomProvider>;
  contextMode: ContextMode;
  /** AI 出图首选格式：auto 让模型自选；ir / tsx 强制单选 */
  diagramFormatPreference: DiagramFormatPreference;
  /** retikz schema 错误自动修复策略：off=关 / limited=有限（max 3）/ always=始终（max 999 兜底防爆） */
  autoRepairMode: AutoRepairMode;
  /**
   * 当前 active 会话 id；null 表示"还没开始任何会话"（panel 打开后第一次 send 时自动创建）
   * @description 仅持久化 id 本身（小且热），完整 Conversation 列表存 IDB；启动时按 id 把对应消息装载回 messages
   */
  activeConversationId: string | null;
};

/** Auto-repair 三档：关 / 有限（默认）/ 始终 */
export type AutoRepairMode = 'off' | 'limited' | 'always';

type EphemeralState = {
  open: boolean;
  view: View;
  messages: Array<ChatMessage>;
  isGenerating: boolean;
  usage: { input: number; output: number; cacheRead: number };
  error: ErrorState;
  currentPage: CurrentPage | null;
  /** 用户通过 Add Context 选中的额外页面（不含当前页，当前页自动并入 send 时使用） */
  contextSelection: Array<ContextItem>;
  /** 当前进行中的请求 AbortController；abort() 会触发 stream 提前结束 */
  abortController: AbortController | null;
  /** 输入框 draft 文本，提升到 store 让外部（空态 suggestions / 命令）可写入 */
  draft: string;
  /** 外部写入 draft 后请求 input focus 的一次性 flag；input 监听后立即清掉 */
  focusInputNonce: number;
  /** Wand2 润色按钮进行中标记；UI 据此 disable 按钮 + 切 spinner */
  polishingDraft: boolean;
  /** 当前 turn 内已自动重试过几次 retikz schema 修复——防止无限循环（max 1） */
  retikzRepairAttempts: number;
  /** auto-repair 自递归 send 时设为 true：让被调的 send 不重置 attempts 计数 */
  retikzRepairInProgress: boolean;
  /** 全部历史会话的内存缓存，从 IDB 装载；以 conversation.id 为 key */
  conversations: Record<string, Conversation>;
  /** IDB 装载完成标记；hydrate 前 history 视图显示骨架 */
  conversationsHydrated: boolean;
};

type Actions = {
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setView: (view: View) => void;
  setProvider: (id: string) => void;
  setApiKey: (id: ProviderId, key: string) => void;
  setModel: (providerId: string, model: string) => void;
  setBaseUrl: (id: ProviderId, baseUrl: string) => void;
  setContextMode: (mode: ContextMode) => void;
  setDiagramFormatPreference: (pref: DiagramFormatPreference) => void;
  setAutoRepairMode: (mode: AutoRepairMode) => void;
  /** 把一个用户输入的 model 名追加到 customModels[providerId]（去重） */
  addCustomModel: (providerId: string, model: string) => void;
  /** 新增 / 更新一个自定义 provider；若该 provider 的 model 未设置过，默认选 models[0] */
  upsertCustomProvider: (provider: CustomProvider) => void;
  /** 删除自定义 provider；若被删的是当前 providerId，回退到 deepseek */
  removeCustomProvider: (id: string) => void;
  setCurrentPage: (page: CurrentPage | null) => void;
  /** 把页面加入 Add Context 选择集；已存在则跳过 */
  addContext: (item: ContextItem) => void;
  removeContext: (path: string) => void;
  send: (input: string) => Promise<void>;
  abort: () => void;
  /** "新建会话"语义：当前 active 已保存到 IDB（每次 send 完成时已 save），这里只把内存里 active 置空 + 清运行态消息，旧会话仍在 history 里能找到 */
  clearConversation: () => void;
  /** 启动时从 IDB 装载历史；幂等，重复调用第二次起立即返回 */
  hydrateConversations: () => Promise<void>;
  /** 切到 history 列表里的某条会话；空字符串 id 视为"新建空会话"（等同 clearConversation） */
  switchConversation: (id: string) => void;
  /** 从 history 删除一条会话（IDB + 内存）；若被删的是 active，自动回退到 null（即新建空会话） */
  deleteConversation: (id: string) => Promise<void>;
  /** 重命名会话标题；空标题被忽略 */
  renameConversation: (id: string, title: string) => void;
  /** 把某条 user 消息内容拉回 draft 并 focus 输入框；非破坏性——已有 messages 保留，用户按 Enter 后作为新 turn 追加 */
  editAndResendAt: (index: number) => void;
  /** 截断 messages：丢弃 [index, end) 范围；用户主动剪枝对话 */
  truncateMessagesFrom: (index: number) => void;
  /** 重新生成 index 处的 assistant 消息：截断到其前面的 user 消息（不含），再 send 那条 user 内容 */
  regenerateAssistantAt: (index: number) => Promise<void>;
  /** 主动压缩对话历史：让当前模型把 messages 总结成一段，替换 messages 并重置 usage */
  compressConversation: () => Promise<void>;
  setDraft: (text: string) => void;
  /** 写入 draft 并触发 input focus —— 给空态 suggestion 点击用 */
  fillDraftAndFocus: (text: string) => void;
  /** 用当前 provider + model 把 draft 重写得更清晰；成功后 setDraft 替换；失败保留原 draft */
  polishDraft: () => Promise<void>;
};

const INITIAL_USAGE = { input: 0, output: 0, cacheRead: 0 };

const INITIAL_EPHEMERAL: EphemeralState = {
  open: false,
  view: 'main',
  messages: [],
  isGenerating: false,
  usage: INITIAL_USAGE,
  error: null,
  currentPage: null,
  contextSelection: [],
  abortController: null,
  draft: '',
  focusInputNonce: 0,
  polishingDraft: false,
  retikzRepairAttempts: 0,
  retikzRepairInProgress: false,
  conversations: {},
  conversationsHydrated: false,
};

/** retikz 修复闭环允许的最大自动重试次数（每个用户 turn 内）：limited 模式封顶 3 防 LLM 死循环；always 模式开个 99 兜底 */
const RETIKZ_REPAIR_MAX_BY_MODE: Record<AutoRepairMode, number> = {
  off: 0,
  limited: 3,
  always: 99,
};

/** history 保留的最大会话数；超出按 updatedAt 升序自动淘汰；active 会话强制保留 */
const MAX_CONVERSATIONS = 10;

/**
 * AI 聊天面板 store
 * @description persisted: provider 选择 / 每家 key + 模型 / 自定义 provider / contextMode
 *   （localStorage `retikz-ai-chat`）。非持久化：open / view / messages / 用量 / 错误 / 当前页 mdx /
 *   contextSelection。send() 负责调 provider 流并增量更新 messages；abort() 触发 AbortController
 *   终止当前请求。
 */
export const useAiChatStore = create<PersistedState & EphemeralState & Actions>()(
  persist(
    (set, get) => {
      /**
       * 把当前 active 会话的 messages / usage 镜像写回 cache + IDB
       * @description send / truncate / compress 等会改 messages 的动作收尾时调用一次。
       *   标题为空时按首条 user 消息派生；createdAt 不动；updatedAt 永远更新
       */
      const persistActiveConversation = () => {
        const state = get();
        const id = state.activeConversationId;
        if (!id) return;
        const existing = state.conversations[id];
        if (!existing) return;
        const now = Date.now();
        const updated: Conversation = {
          ...existing,
          messages: state.messages,
          usage: state.usage,
          title: existing.title || deriveTitleFromMessages(state.messages, ''),
          updatedAt: now,
        };
        set(s => ({ conversations: { ...s.conversations, [id]: updated } }));
        void saveConversation(updated);
      };

      /**
       * 把会话总数控制在 MAX_CONVERSATIONS 以内：超出时按 updatedAt 升序剔除最旧的
       * @description active 会话强制保留（即便它本身就是最旧的）；调用时机：新建会话后、hydration 完成后
       */
      const enforceConversationsCap = () => {
        const state = get();
        const all = Object.values(state.conversations);
        if (all.length <= MAX_CONVERSATIONS) return;
        const sorted = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
        const keep = new Set<string>();
        if (state.activeConversationId) keep.add(state.activeConversationId);
        for (const c of sorted) {
          if (keep.size >= MAX_CONVERSATIONS) break;
          keep.add(c.id);
        }
        const evictIds = all.filter(c => !keep.has(c.id)).map(c => c.id);
        if (evictIds.length === 0) return;
        set(s => {
          const rest = { ...s.conversations };
          for (const id of evictIds) delete rest[id];
          return { conversations: rest };
        });
        for (const id of evictIds) void deleteConversationFromStorage(id);
      };

      return {
      providerId: 'deepseek',
      models: { ...DEFAULT_MODELS },
      apiKeys: { deepseek: '', openai: '', anthropic: '' },
      baseUrls: { deepseek: '', openai: '', anthropic: '' },
      customModels: {},
      customProviders: {},
      contextMode: 'balanced',
      diagramFormatPreference: 'auto',
      autoRepairMode: 'limited',
      activeConversationId: null,

      ...INITIAL_EPHEMERAL,

      setOpen: open => set({ open }),
      toggleOpen: () => set(s => ({ open: !s.open })),
      setView: view => set({ view }),

      setProvider: id => set({ providerId: id }),
      setApiKey: (id, key) => set(s => ({ apiKeys: { ...s.apiKeys, [id]: key } })),
      setModel: (providerId, model) => set(s => ({ models: { ...s.models, [providerId]: model } })),
      setBaseUrl: (id, baseUrl) => set(s => ({ baseUrls: { ...s.baseUrls, [id]: baseUrl } })),
      setContextMode: mode => set({ contextMode: mode }),
      setDiagramFormatPreference: pref => set({ diagramFormatPreference: pref }),
      setAutoRepairMode: mode => set({ autoRepairMode: mode }),

      addCustomModel: (providerId, model) =>
        set(s => {
          const existing = s.customModels[providerId] ?? [];
          if (existing.includes(model)) return {};
          return { customModels: { ...s.customModels, [providerId]: [...existing, model] } };
        }),

      upsertCustomProvider: provider =>
        set(s => {
          const nextModels =
            s.models[provider.id] && provider.models.includes(s.models[provider.id])
              ? s.models
              : { ...s.models, [provider.id]: provider.models[0] ?? '' };
          return {
            customProviders: { ...s.customProviders, [provider.id]: provider },
            models: nextModels,
          };
        }),

      removeCustomProvider: id =>
        set(s => {
          const rest = Object.fromEntries(Object.entries(s.customProviders).filter(([key]) => key !== id));
          const fallbackProviderId = s.providerId === id ? 'deepseek' : s.providerId;
          return { customProviders: rest, providerId: fallbackProviderId };
        }),

      setCurrentPage: page => set({ currentPage: page }),

      addContext: item =>
        set(s => {
          if (s.contextSelection.some(c => c.path === item.path)) return {};
          return { contextSelection: [...s.contextSelection, item] };
        }),
      removeContext: path =>
        set(s => ({ contextSelection: s.contextSelection.filter(c => c.path !== path) })),

      send: async input => {
        const text = input.trim();
        if (!text) return;
        const state = get();
        if (state.isGenerating) return;
        const resolved = resolveProvider(state.providerId, state);
        if (!resolved || !resolved.apiKey) return;
        const model = state.models[state.providerId];
        if (!model) return;

        // 用户初发 → 把上一 turn 留下的修复计数清零；auto-repair 自递归 send 时跳过（保持递增的 attempts）
        if (!state.retikzRepairInProgress) {
          set({ retikzRepairAttempts: 0 });
        }

        // 若当前没有 active conversation（首次发或刚 clearConversation 完），新建一个空壳挂到 cache；
        // 真正的消息体由下面的 set({ messages: baseMessages }) 写入，标题在 finally 阶段从首条 user msg 派生
        if (state.activeConversationId == null) {
          const id = crypto.randomUUID();
          const now = Date.now();
          const conv: Conversation = {
            schemaVersion: CONVERSATION_SCHEMA_VERSION,
            id,
            title: '',
            messages: [],
            usage: INITIAL_USAGE,
            pageContext: state.currentPage,
            createdAt: now,
            updatedAt: now,
          };
          set(s => ({
            activeConversationId: id,
            conversations: { ...s.conversations, [id]: conv },
          }));
          // 新建可能让总数超 cap，立刻淘汰最旧（active 强制保留）
          enforceConversationsCap();
        }

        // auto-repair 自递归触发时把 user msg 打 autoSent 标，UI 据此区分样式
        const userMsg: ChatMessage = state.retikzRepairInProgress
          ? { role: 'user', content: text, autoSent: true }
          : { role: 'user', content: text };
        const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
        const baseMessages = [...state.messages, userMsg, assistantMsg];
        const controller = new AbortController();
        set({
          messages: baseMessages,
          isGenerating: true,
          error: null,
          abortController: controller,
        });

        try {
          const system = await composeSystem(
            state.contextMode,
            state.currentPage,
            state.contextSelection,
            state.diagramFormatPreference,
          );
          // 喂给 provider 的消息 strip 掉 autoSent flag（provider 不需要也不该感知）
          const messagesForSend = baseMessages.slice(0, -1).map(({ role, content }) => ({ role, content }));

          for await (const chunk of resolved.chat({
            apiKey: resolved.apiKey,
            model,
            system,
            messages: messagesForSend,
            signal: controller.signal,
            baseUrl: resolved.baseUrl,
          })) {
            if (controller.signal.aborted) break;
            if (chunk.type === 'delta') {
              set(s => {
                const m = s.messages.slice();
                const last = m.at(-1);
                if (last?.role === 'assistant') {
                  m[m.length - 1] = { role: 'assistant', content: last.content + chunk.text };
                }
                return { messages: m };
              });
            } else if (chunk.type === 'done') {
              set(s => ({
                usage: {
                  input: s.usage.input + chunk.usage.input,
                  output: s.usage.output + chunk.usage.output,
                  cacheRead: s.usage.cacheRead + (chunk.usage.cacheRead ?? 0),
                },
              }));
            } else {
              set(s => {
                const m = s.messages.slice();
                const last = m.at(-1);
                if (last?.role === 'assistant' && last.content === '') m.pop();
                return { messages: m, error: { kind: chunk.kind, message: chunk.message } };
              });
            }
          }
        } catch (e) {
          if ((e as { name?: string }).name !== 'AbortError') {
            set({ error: { kind: 'unknown', message: (e as Error).message } });
          }
        } finally {
          set(s => {
            const m = s.messages.slice();
            const last = m.at(-1);
            if (last?.role === 'assistant' && last.content === '') m.pop();
            return { messages: m, isGenerating: false, abortController: null };
          });
          // 把当前 active 会话的 messages / usage / 标题落到 cache + IDB；递归 auto-repair 内的 send 也会再次进这里把更新的 messages 再写一次
          persistActiveConversation();
        }

        // stream 收尾后扫一遍 retikz 块；按 autoRepairMode 决定上限
        const post = get();
        const maxAttempts = RETIKZ_REPAIR_MAX_BY_MODE[post.autoRepairMode];
        if (maxAttempts === 0) {
          set({ retikzRepairInProgress: false });
          return;
        }
        const lastAssistant = post.messages.at(-1);
        if (lastAssistant?.role !== 'assistant') {
          set({ retikzRepairInProgress: false });
          return;
        }
        const invalid = findInvalidRetikzBlocks(lastAssistant.content);
        if (invalid.length === 0 || post.retikzRepairAttempts >= maxAttempts) {
          set({ retikzRepairInProgress: false });
          return;
        }
        const lang = post.currentPage?.lang ?? 'zh';
        const repairPrompt = buildRepairPrompt(invalid, lang);
        set({
          retikzRepairAttempts: post.retikzRepairAttempts + 1,
          retikzRepairInProgress: true,
        });
        await get().send(repairPrompt);
      },

      abort: () => {
        get().abortController?.abort();
      },

      clearConversation: () => {
        // "新建会话"语义：每次 send 完成时已 persist 过当前 active 到 IDB；
        // 这里只是把 active 解绑、清运行态，下次 send 会自动新建一条 conversation
        set({ activeConversationId: null, messages: [], error: null, usage: INITIAL_USAGE });
      },

      hydrateConversations: async () => {
        if (get().conversationsHydrated) return;
        const conversations = await loadAllConversations();
        set(s => {
          const id = s.activeConversationId;
          const active = id ? conversations[id] : null;
          return {
            conversations,
            conversationsHydrated: true,
            // 有 active 命中 → 把它的 messages / usage 装载到运行态；否则保留默认空态
            ...(active ? { messages: active.messages, usage: active.usage } : {}),
            // 持久化的 id 在 IDB 找不到（被异端清过 / schema 不兼容跳过）→ 解绑，避免悬空
            ...(id && !active ? { activeConversationId: null } : {}),
          };
        });
        // 装载完后立刻 enforce cap：之前如有保存超过 10 条的老数据，这里收敛
        enforceConversationsCap();
      },

      switchConversation: id => {
        const state = get();
        if (state.isGenerating) return;
        if (id === '') {
          // 空 id 表示主动新建空会话；等同 clearConversation
          set({ activeConversationId: null, messages: [], error: null, usage: INITIAL_USAGE });
          return;
        }
        const target = state.conversations[id];
        if (!target) return;
        set({
          activeConversationId: id,
          messages: target.messages,
          usage: target.usage,
          error: null,
        });
      },

      deleteConversation: async id => {
        const state = get();
        const isActive = state.activeConversationId === id;
        // 内存先剔除（UI 立刻刷新），IDB 后写；删除失败也只是下次启动还会重新装载
        set(s => {
          const rest = { ...s.conversations };
          delete rest[id];
          return {
            conversations: rest,
            ...(isActive
              ? { activeConversationId: null, messages: [], error: null, usage: INITIAL_USAGE }
              : {}),
          };
        });
        await deleteConversationFromStorage(id);
      },

      renameConversation: (id, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        const state = get();
        const existing = state.conversations[id];
        if (!existing) return;
        const updated: Conversation = { ...existing, title: trimmed, updatedAt: Date.now() };
        set(s => ({ conversations: { ...s.conversations, [id]: updated } }));
        void saveConversation(updated);
      },

      editAndResendAt: index => {
        const state = get();
        if (state.isGenerating) return;
        const target = state.messages.at(index);
        if (!target || target.role !== 'user') return;
        // 非破坏性：不动 messages，只把内容拉回 draft，让用户改完按 Enter 当新 turn 发
        set(s => ({
          draft: target.content,
          focusInputNonce: s.focusInputNonce + 1,
        }));
      },

      truncateMessagesFrom: index => {
        const state = get();
        if (state.isGenerating) return;
        if (index < 0 || index >= state.messages.length) return;
        set({ messages: state.messages.slice(0, index), error: null });
        persistActiveConversation();
      },

      regenerateAssistantAt: async index => {
        const state = get();
        if (state.isGenerating) return;
        const assistantMsg = state.messages.at(index);
        if (!assistantMsg || assistantMsg.role !== 'assistant') return;
        // 找上一条 user 消息（通常 index-1，但 autoSent 也走 user role，直接取前一条即可）
        const userMsg = state.messages.at(index - 1);
        if (!userMsg || userMsg.role !== 'user') return;
        // 截断到 user 之前，由 send() 把 user + 新 assistant 重新追加；autoSent flag 不带回 send()
        // send 的 finally 会再次 persist，这里不重复
        set({ messages: state.messages.slice(0, index - 1), error: null });
        await get().send(userMsg.content);
      },

      setDraft: text => set({ draft: text }),
      fillDraftAndFocus: text => set(s => ({ draft: text, focusInputNonce: s.focusInputNonce + 1 })),

      compressConversation: async () => {
        const state = get();
        if (state.isGenerating) return;
        if (state.messages.length === 0) return;
        const resolved = resolveProvider(state.providerId, state);
        if (!resolved || !resolved.apiKey) return;
        const model = state.models[state.providerId];
        if (!model) return;

        const lang = state.currentPage?.lang ?? 'zh';
        const instruction =
          lang === 'en'
            ? 'Summarize the conversation above in 200-400 words. Preserve key facts, decisions, code snippets references, and unresolved questions. Your summary will replace the entire conversation history, so write it as if you (assistant) were recalling what was discussed.'
            : '把以上对话总结成 200-400 字的摘要。保留关键事实、结论、代码 / 文件引用以及未解决的问题。摘要将替换整段对话历史，请以你（assistant）回忆"刚才谈了什么"的口吻写。';

        const askMessage: ChatMessage = { role: 'user', content: instruction };
        const controller = new AbortController();
        set({ isGenerating: true, error: null, abortController: controller });

        let summary = '';
        try {
          for await (const chunk of resolved.chat({
            apiKey: resolved.apiKey,
            model,
            system:
              lang === 'en'
                ? 'You are summarizing a chat conversation. Respond with the summary text only, no preamble.'
                : '你正在总结一段对话。直接给出摘要文本，不要加前言或后记。',
            messages: [...state.messages, askMessage],
            signal: controller.signal,
            baseUrl: resolved.baseUrl,
          })) {
            if (controller.signal.aborted) break;
            if (chunk.type === 'delta') summary += chunk.text;
            else if (chunk.type === 'error') {
              set({ error: { kind: chunk.kind, message: chunk.message } });
              return;
            }
          }
        } catch (e) {
          if ((e as { name?: string }).name !== 'AbortError') {
            set({ error: { kind: 'unknown', message: (e as Error).message } });
          }
        } finally {
          const trimmed = summary.trim();
          if (trimmed.length > 0) {
            set({
              messages: [{ role: 'assistant', content: trimmed }],
              usage: INITIAL_USAGE,
              isGenerating: false,
              abortController: null,
            });
            // 压缩后整个会话被 1 条 assistant 摘要替换；落盘
            persistActiveConversation();
          } else {
            set({ isGenerating: false, abortController: null });
          }
        }
      },

      polishDraft: async () => {
        const state = get();
        if (state.polishingDraft) return;
        const original = state.draft.trim();
        if (!original) return;
        const resolved = resolveProvider(state.providerId, state);
        if (!resolved || !resolved.apiKey) return;
        const model = state.models[state.providerId];
        if (!model) return;

        const lang = state.currentPage?.lang ?? 'zh';
        const system =
          lang === 'en'
            ? 'You rewrite user prompts to be clearer and more complete. Preserve original intent. Do not answer the question. Respond with only the rewritten prompt text, no preamble.'
            : '你的任务是把用户的提问改写得更清晰、信息更完整，但严格保留原意。不要回答问题，只输出改写后的提示词正文，不要加前言或解释。';
        const instruction =
          lang === 'en'
            ? `Rewrite the following user message:\n${original}`
            : `请改写下面这条用户提问：\n${original}`;

        const controller = new AbortController();
        set({ polishingDraft: true, error: null });

        let rewritten = '';
        let hadError = false;
        try {
          for await (const chunk of resolved.chat({
            apiKey: resolved.apiKey,
            model,
            system,
            messages: [{ role: 'user', content: instruction }],
            signal: controller.signal,
            baseUrl: resolved.baseUrl,
          })) {
            if (controller.signal.aborted) break;
            if (chunk.type === 'delta') rewritten += chunk.text;
            else if (chunk.type === 'error') {
              hadError = true;
              set({ error: { kind: chunk.kind, message: chunk.message } });
              break;
            }
          }
        } catch (e) {
          if ((e as { name?: string }).name !== 'AbortError') {
            hadError = true;
            set({ error: { kind: 'unknown', message: (e as Error).message } });
          }
        } finally {
          const trimmed = rewritten.trim();
          if (!hadError && trimmed.length > 0) {
            set(s => ({
              draft: trimmed,
              polishingDraft: false,
              focusInputNonce: s.focusInputNonce + 1,
            }));
          } else {
            set({ polishingDraft: false });
          }
        }
      },
      };
    },
    {
      name: 'retikz-ai-chat',
      partialize: state => ({
        providerId: state.providerId,
        models: state.models,
        apiKeys: state.apiKeys,
        baseUrls: state.baseUrls,
        customModels: state.customModels,
        customProviders: state.customProviders,
        contextMode: state.contextMode,
        diagramFormatPreference: state.diagramFormatPreference,
        autoRepairMode: state.autoRepairMode,
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
);

export { isBuiltInProviderId };
