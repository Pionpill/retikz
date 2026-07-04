import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ContextMode, CurrentPage, DiagramFormatPreference } from './composeSystemPrompt';
import type { Conversation } from './conversations-storage';
import type { CustomProvider } from './providers/resolve';
import type { ChatErrorKind, ChatMessage, ProviderId } from './providers/types';
import type { AutoRepairMode } from './repair';

import { composeSystem } from './composeSystemPrompt';
import {
  CONVERSATION_SCHEMA_VERSION,
  deleteConversationFromStorage,
  deriveTitleFromMessages,
  loadAllConversations,
  saveConversation,
} from './conversations-storage';
import { DEFAULT_MODELS } from './models';
import { isBuiltInProviderId, resolveProvider } from './providers/resolve';
import { RETIKZ_REPAIR_MAX_BY_MODE } from './repair';
import { buildRepairPrompt, findInvalidRetikzBlocks } from './retikz-validation';

export type { AutoRepairMode } from './repair';

/** 主视图 / 设置视图 / 历史会话列表视图 */
type View = 'main' | 'settings' | 'history';

type ErrorState = { kind: ChatErrorKind; message: string } | null;

/** Add Context 选中的页面。 */
export type ContextItem = {
  path: string;
  title: string;
};

type PersistedState = {
  /** 当前选中的 provider id。 */
  providerId: string;
  /** 每个 provider 当前选中的 model name。 */
  models: Record<string, string>;
  /** 内置 provider 的 API Key。 */
  apiKeys: Record<ProviderId, string>;
  /** 各内置 provider 的 base URL 覆盖。 */
  baseUrls: Record<ProviderId, string>;
  /** 用户为 provider 添加的自定义 model 名。 */
  customModels: Record<string, ReadonlyArray<string>>;
  /** 用户添加的自定义 provider。 */
  customProviders: Record<string, CustomProvider>;
  contextMode: ContextMode;
  /** AI 出图首选格式。 */
  diagramFormatPreference: DiagramFormatPreference;
  /** retikz schema 错误自动修复策略。 */
  autoRepairMode: AutoRepairMode;
  /** 当前 active 会话 id。 */
  activeConversationId: string | null;
};

type EphemeralState = {
  open: boolean;
  view: View;
  messages: Array<ChatMessage>;
  isGenerating: boolean;
  usage: { input: number; output: number; cacheRead: number };
  error: ErrorState;
  currentPage: CurrentPage | null;
  /** 用户通过 Add Context 选中的额外页面。 */
  contextSelection: Array<ContextItem>;
  /** 当前进行中的请求 AbortController。 */
  abortController: AbortController | null;
  /** 输入框 draft 文本。 */
  draft: string;
  /** 请求 input focus 的一次性 flag。 */
  focusInputNonce: number;
  /** Wand2 润色按钮进行中标记。 */
  polishingDraft: boolean;
  /** 当前 turn 内已自动重试过几次 retikz schema 修复。 */
  retikzRepairAttempts: number;
  /** auto-repair 自递归 send 状态。 */
  retikzRepairInProgress: boolean;
  /** 全部历史会话的内存缓存。 */
  conversations: Record<string, Conversation>;
  /** IDB 装载完成标记。 */
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
  /** 新建会话。 */
  clearConversation: () => void;
  /** 启动时从 IDB 装载历史。 */
  hydrateConversations: () => Promise<void>;
  /** 切到 history 列表里的某条会话。 */
  switchConversation: (id: string) => void;
  /** 从 history 删除一条会话。 */
  deleteConversation: (id: string) => Promise<void>;
  /** 重命名会话标题；空标题被忽略 */
  renameConversation: (id: string, title: string) => void;
  /** 把某条 user 消息内容拉回 draft 并 focus 输入框。 */
  editAndResendAt: (index: number) => void;
  /** 截断 messages。 */
  truncateMessagesFrom: (index: number) => void;
  /** 重新生成 index 处的 assistant 消息。 */
  regenerateAssistantAt: (index: number) => Promise<void>;
  /** 主动压缩对话历史。 */
  compressConversation: () => Promise<void>;
  setDraft: (text: string) => void;
  /** 写入 draft 并触发 input focus。 */
  fillDraftAndFocus: (text: string) => void;
  /** 用当前 provider + model 润色 draft。 */
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

const MAX_CONVERSATIONS = 20;

/** AI 聊天面板 store。 */
export const useAiChatStore = create<PersistedState & EphemeralState & Actions>()(
  persist(
    (set, get) => {
      const persistActiveConversation = () => {
        const state = get();
        const id = state.activeConversationId;
        if (!id) return;
        const existing = state.conversations[id];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record<string,V> index 在 TS 默认 typings 下永远返回 V，但运行时 id 不存在时确实是 undefined；保留防御
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
        removeContext: path => set(s => ({ contextSelection: s.contextSelection.filter(c => c.path !== path) })),

        send: async input => {
          const text = input.trim();
          if (!text) return;
          const state = get();
          if (state.isGenerating) return;
          const resolved = resolveProvider(state.providerId, state);
          if (!resolved || !resolved.apiKey) return;
          const model = state.models[state.providerId];
          if (!model) return;

          if (!state.retikzRepairInProgress) {
            set({ retikzRepairAttempts: 0 });
          }

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
            enforceConversationsCap();
          }

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
            persistActiveConversation();
          }

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
              ...(active ? { messages: active.messages, usage: active.usage } : {}),
              ...(id && !active ? { activeConversationId: null } : {}),
            };
          });
          enforceConversationsCap();
        },

        switchConversation: id => {
          const state = get();
          if (state.isGenerating) return;
          if (id === '') {
            set({ activeConversationId: null, messages: [], error: null, usage: INITIAL_USAGE });
            return;
          }
          const target = state.conversations[id];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 同上，运行时 id 不存在时索引返回 undefined
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
          set(s => {
            const rest = { ...s.conversations };
            delete rest[id];
            return {
              conversations: rest,
              ...(isActive ? { activeConversationId: null, messages: [], error: null, usage: INITIAL_USAGE } : {}),
            };
          });
          await deleteConversationFromStorage(id);
        },

        renameConversation: (id, title) => {
          const trimmed = title.trim();
          if (!trimmed) return;
          const state = get();
          const existing = state.conversations[id];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 同上，运行时 id 不存在时索引返回 undefined
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
          const userMsg = state.messages.at(index - 1);
          if (!userMsg || userMsg.role !== 'user') return;
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
