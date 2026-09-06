import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  HelpCircle,
  Trophy,
  Volume2,
  RotateCcw,
  Zap,
  Lightbulb,
  Mic,
  MicOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppLanguage } from '../../types';
import { useI18n } from '../../lib/i18n';
import { authenticatedFetch } from '../../lib/api';

interface StudentAITutorProps {
  language: AppLanguage;
}

export const StudentAITutor: React.FC<StudentAITutorProps> = ({
  language,
}) => {
  const t = useI18n(language);

  const [messages, setMessages] = useState<
    { sender: 'ai' | 'student'; text: string; hintLevel?: number }[]
  >([
    {
      sender: 'ai',
      text: `👋 **Salom Ali! I'm your Socratic AI Math & Science Tutor.**\n\nI won't just give you the final answers directly — instead, I will ask smart questions and give progressive hints so YOU master the concept and earn XP! 🏆\n\nWhat are you working on today?`,
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const quickPrompts = [
    'I am stuck on: (2x - 1)/2 = (x + 5)/3',
    'How do I find LCM of 2 and 3?',
    'Quiz question on linear equations!',
    'Why multiply both sides by 6?',
  ];

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim()) return;

    if (!customPrompt) setInputText('');

    const newMessages = [...messages, { sender: 'student' as const, text: textToSend }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await authenticatedFetch('/api/ai/student-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((message) => ({
            role: message.sender === 'student' ? 'user' : 'model',
            content: message.text,
          })),
          subject: 'Mathematics',
          grade: '7-A',
          language,
        }),
      });
      const data = await res.json();
      const reply = data.tutorResponse || data.text;
      if (reply) {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: reply },
        ]);
        if (
          reply.includes('Correct') ||
          reply.includes('Well done') ||
          reply.includes('Barakalla')
        ) {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `✨ **Socratic Hint:** Let's look at the denominators: $2$ and $3$. If you multiply both sides by **6** (their common denominator), what equation do you get? Try writing it down!`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeechSimulation = (text: string) => {
    setIsSpeaking(true);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsSpeaking(false), 3000);
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setInputText('How do I simplify 3(2x - 1) = 2(x + 5)?');
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setInputText('How do I simplify 3(2x - 1) = 2(x + 5)?');
      }, 2500);
    }
  };

  return (
    <div id="student-ai-tutor-view" className="flex flex-col h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-6rem)] space-y-3 sm:space-y-4">
      {/* Tutor Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-indigo-200/80 bg-white p-3.5 sm:px-5 sm:py-3.5 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm shadow-indigo-500/30">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Socratic AI Tutor
              </h1>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Live 24/7
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Step-by-step guidance for Math & Science
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> +15 XP / solution
          </span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Messages scroll area */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-3.5 sm:p-5">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 sm:gap-3 ${
                msg.sender === 'student' ? 'flex-row-reverse' : ''
              }`}
            >
              {msg.sender === 'ai' ? (
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-bold text-white dark:bg-white dark:text-slate-950">
                  <span>Ali</span>
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-xl rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed ${
                  msg.sender === 'student'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'border border-indigo-100 bg-indigo-50/70 text-slate-800 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-slate-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.sender === 'ai' && (
                  <div className="mt-2 flex items-center justify-between border-t border-indigo-100/80 pt-1.5 text-[10px] text-slate-400 dark:border-indigo-900/60">
                    <span>Socratic Method</span>
                    <button
                      onClick={() => handleSpeechSimulation(msg.text)}
                      className="flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
                      style={{ minHeight: '32px' }}
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>{isSpeaking ? 'Listening...' : 'Read Aloud'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 w-fit">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking of the best pedagogical hint for you...</span>
            </div>
          )}
        </div>

        {/* Bottom Area: Quick Prompt Pills & Input */}
        <div className="border-t border-slate-200 bg-slate-50/80 p-2.5 sm:p-4 dark:border-slate-800 dark:bg-slate-950/70">
          {/* Quick Prompts Carousel */}
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                style={{ minHeight: '36px' }}
              >
                💡 {prompt}
              </button>
            ))}
          </div>

          {/* Text Input + Mic + Send */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleVoiceRecording}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse border-rose-600'
                  : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
              style={{ minHeight: '44px', minWidth: '44px' }}
              title="Voice Input"
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <input
              type="text"
              placeholder="Ask question or state next step..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              style={{ minHeight: '44px' }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 shrink-0"
              style={{ minHeight: '44px' }}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
