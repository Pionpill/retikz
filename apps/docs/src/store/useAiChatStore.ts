import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ContextMode, CurrentPage } from '@/layout/ai-chat/context';
import { composeSystem } from '@/layout/ai-chat/context';
import { DEFAULT_MODELS } from '@/layout/ai-chat/models';
import { getProvider } from '@/layout/ai-chat/providers';
import type { ChatErrorKind, ChatMessage, ProviderId } from '@/layout/ai-chat/providers/types';

/** 主视图 vs 设置视图。empty 状态由容器组件按是否填了 key 推导，不进 store */
type View = 'main' | 'settings';

type ErrorState = { kind: ChatErrorKind; message: string } | null;

type PersistedState = {
  providerId: ProviderId;
  models: Record<ProviderId, string>;
  apiKeys: Record<ProviderId, string>;
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
  /** 当前进行中的请求 AbortController；abort() 会触发 stream 提前结束 */
  abortController: AbortController | null;
};

type Actions = {
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setView: (view: View) => void;
  setProvider: (id: ProviderId) => void;
  setApiKey: (id: ProviderId, key: string) => void;
  setModel: (id: ProviderId, model: string) => void;
  setContextMode: (mode: ContextMode) => void;
  setCurrentPage: (page: CurrentPage | null) => void;
  send: (input: string) => Promise<void>;
  abort: () => void;
  clearConversation: () => void;
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
  abortController: null,
};

/**
 * AI 聊天面板 store
 * @description persisted: provider 选择 / 每家 key + 模型 / contextMode（localStorage `retikz-ai-chat`）。
 *   非持久化：open / view / messages / 用量 / 错误 / 当前页 mdx。
 *   send() 负责调 provider 流并增量更新 messages；abort() 触发 AbortController 终止当前请求。
 */
export const useAiChatStore = create<PersistedState & EphemeralState & Actions>()(
  persist(
    (set, get) => ({
      // persisted defaults
      providerId: 'deepseek',
      models: { ...DEFAULT_MODELS },
      apiKeys: { deepseek: '', openai: '', anthropic: '' },
      contextMode: 'balanced',

      // ephemeral defaults
      ...INITIAL_EPHEMERAL,

      setOpen: open => set({ open }),
      toggleOpen: () => set(s => ({ open: !s.open })),
      setView: view => set({ view }),

      setProvider: id => set({ providerId: id }),
      setApiKey: (id, key) => set(s => ({ apiKeys: { ...s.apiKeys, [id]: key } })),
      setModel: (id, model) => set(s => ({ models: { ...s.models, [id]: model } })),
      setContextMode: mode => set({ contextMode: mode }),

      setCurrentPage: page => set({ currentPage: page }),

      send: async input => {
        const text = input.trim();
        if (!text) return;
        const state = get();
        if (state.isGenerating) return;
        const apiKey = state.apiKeys[state.providerId];
        if (!apiKey) return;

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
          const system = await composeSystem(state.contextMode, state.currentPage);
          const provider = getProvider(state.providerId);
          // 发给 provider 时不带最后那个空 assistant 占位
          const messagesForSend = baseMessages.slice(0, -1);

          for await (const chunk of provider.chat({
            apiKey,
            model: state.models[state.providerId],
            system,
            messages: messagesForSend,
            signal: controller.signal,
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
              // error: drop the empty assistant placeholder if untouched
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
            // 用户取消或失败时若最后一条 assistant 仍为空，则丢弃，避免下次发送时携带空消息
            if (last?.role === 'assistant' && last.content === '') m.pop();
            return { messages: m, isGenerating: false, abortController: null };
          });
        }
      },

      abort: () => {
        get().abortController?.abort();
      },

      clearConversation: () => set({ messages: [], error: null, usage: INITIAL_USAGE }),
    }),
    {
      name: 'retikz-ai-chat',
      partialize: state => ({
        providerId: state.providerId,
        models: state.models,
        apiKeys: state.apiKeys,
        contextMode: state.contextMode,
      }),
    },
  ),
);
