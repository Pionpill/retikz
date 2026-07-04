import type { FC } from 'react';

import { Mic, MicOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { useAiChatStore } from '../useAiChatStore';

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};
type SpeechRecognitionErrorEvent = { error: string };
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Toolbar 右侧 Mic 按钮。 */
export const AiChatInputMicButton: FC = () => {
  const { t, i18n } = useTranslation();
  const draft = useAiChatStore(s => s.draft);
  const setDraft = useAiChatStore(s => s.setDraft);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const draftAtStartRef = useRef<string>('');
  const [listening, setListening] = useState(false);

  const Constructor = getSpeechRecognitionConstructor();

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = i18n.language === 'en' ? 'en-US' : 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;

    draftAtStartRef.current = draft;

    recognition.onresult = event => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      const base = draftAtStartRef.current;
      const separator = base.length > 0 && !base.endsWith(' ') ? ' ' : '';
      setDraft(`${base}${separator}${transcript}`);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Constructor, draft, i18n.language, setDraft]);

  if (!Constructor) return null;

  const label = listening ? t('ai.convMicListening') : t('ai.convMicLabel');

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={cn(
        'flex size-7 cursor-pointer items-center justify-center rounded hover:bg-accent hover:text-foreground',
        listening ? 'text-red-500' : 'text-muted-foreground',
      )}
      aria-label={label}
      title={label}
      aria-pressed={listening}
    >
      {listening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
    </button>
  );
};
