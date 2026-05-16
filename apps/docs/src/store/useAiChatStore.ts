import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ContextMode, CurrentPage } from '@/layout/ai-chat/context';
import { composeSystem } from '@/layout/ai-chat/context';
import { DEFAULT_MODELS } from '@/layout/ai-chat/models';
import type { CustomProvider } from '@/layout/ai-chat/providers/resolve';
import { isBuiltInProviderId, resolveProvider } from '@/layout/ai-chat/providers/resolve';
import type { ChatErrorKind, ChatMessage, ProviderId } from '@/layout/ai-chat/providers/types';

/** 主视图 vs 设置视图。empty 状态由容器组件按是否填了 key 推导，不进 store */
type View = 'main' | 'settings';

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
};

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
  clearConversation: () => void;
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
};

/**
 * AI 聊天面板 store
 * @description persisted: provider 选择 / 每家 key + 模型 / 自定义 provider / contextMode
 *   （localStorage `retikz-ai-chat`）。非持久化：open / view / messages / 用量 / 错误 / 当前页 mdx /
 *   contextSelection。send() 负责调 provider 流并增量更新 messages；abort() 触发 AbortController
 *   终止当前请求。
 */
export const useAiChatStore = create<PersistedState & EphemeralState & Actions>()(
  persist(
    (set, get) => ({
      providerId: 'deepseek',
      models: { ...DEFAULT_MODELS },
      apiKeys: { deepseek: '', openai: '', anthropic: '' },
      baseUrls: { deepseek: '', openai: '', anthropic: '' },
      customModels: {},
      customProviders: {},
      contextMode: 'balanced',

      ...INITIAL_EPHEMERAL,

      setOpen: open => set({ open }),
      toggleOpen: () => set(s => ({ open: !s.open })),
      setView: view => set({ view }),

      setProvider: id => set({ providerId: id }),
      setApiKey: (id, key) => set(s => ({ apiKeys: { ...s.apiKeys, [id]: key } })),
      setModel: (providerId, model) => set(s => ({ models: { ...s.models, [providerId]: model } })),
      setBaseUrl: (id, baseUrl) => set(s => ({ baseUrls: { ...s.baseUrls, [id]: baseUrl } })),
      setContextMode: mode => set({ contextMode: mode }),

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

        const userMsg: ChatMessage = { role: 'user', content: text };
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
          const system = await composeSystem(state.contextMode, state.currentPage, state.contextSelection);
          const messagesForSend = baseMessages.slice(0, -1);

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
        }
      },

      abort: () => {
        get().abortController?.abort();
      },

      clearConversation: () => set({ messages: [], error: null, usage: INITIAL_USAGE }),

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
    }),
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
      }),
    },
  ),
);

export { isBuiltInProviderId };
