import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { analysisApi } from './api';
import { getErrorMessage } from '../../lib/utils';

export const ChatBox = ({ user, onClose }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      isUser: false,
      text: t('analysis.chat.greeting', { name: user?.name || 'bạn' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages((p) => [...p, { isUser: true, text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await analysisApi.chat(q, i18n.language);
      const reply = res.data?.answer || res.data?.message || res.data?.data?.answer || '...';
      setMessages((p) => [...p, { isUser: false, text: reply }]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        { isUser: false, text: getErrorMessage(err, 'Lỗi kết nối AI'), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          onClick={(e) => e.stopPropagation()}
          className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-lg dark:bg-dark-surface sm:h-[600px] sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-stroke">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-navy-dark">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-navy dark:text-ivory">
                  {t('analysis.chat.title')}
                </h3>
                <p className="text-xs text-muted dark:text-dark-text-muted">Online</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted hover:bg-surface-alt dark:text-dark-text-muted dark:hover:bg-dark-surface-alt"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface-alt p-6 dark:bg-dark-bg">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  'flex ' + (m.isUser ? 'justify-end' : 'justify-start')
                }
              >
                <div
                  className={
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ' +
                    (m.isUser
                      ? 'bg-navy text-white dark:bg-ceramic dark:text-navy-dark'
                      : m.isError
                      ? 'bg-danger/15 text-danger'
                      : 'bg-surface text-navy dark:bg-dark-surface dark:text-dark-text')
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 text-sm text-muted dark:bg-dark-surface dark:text-dark-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  {t('analysis.chat.thinking')}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-stroke bg-surface p-4 dark:border-dark-stroke dark:bg-dark-surface">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('analysis.chat.placeholder')}
              disabled={loading}
              className="flex-1 rounded-full border border-stroke bg-surface-alt px-5 py-3 text-sm text-navy placeholder:text-muted focus:border-ceramic focus:bg-surface focus:outline-none dark:border-dark-stroke dark:bg-dark-surface-alt dark:text-dark-text dark:placeholder:text-dark-text-muted"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-colors hover:bg-navy-light disabled:opacity-50 dark:bg-ceramic dark:text-navy-dark dark:hover:bg-ceramic-light"
              aria-label="Send"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ChatBox;

