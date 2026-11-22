// Voice input with the browser's built-in speech recognition (Chrome, Edge, Safari).
// The browser may send the audio to its own speech service; the text is then read on this device.
import { html, useState, useRef, useEffect } from './lib.js';
import { t } from './i18n.js';
import { voiceLang } from './ui.js';

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const voiceSupported = Boolean(Recognition);

// onText(text, final): called with the words heard so far, and once more with final = true.
export function useVoice(onText) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => () => rec.current?.abort(), []);

  function start() {
    if (!Recognition) return setError(t('mic_unsupported'));
    setError('');
    const r = new Recognition();
    r.lang = voiceLang();
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let heard = '';
    r.onresult = (e) => {
      heard = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim();
      cb.current(heard, false);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? t('mic_denied') : t('mic_error', { msg: e.error }));
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
      if (heard) cb.current(heard, true);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch (err) {
      setError(t('mic_error', { msg: err.message }));
    }
  }

  const stop = () => rec.current?.stop();

  return { listening, error, start, stop, toggle: () => (listening ? stop() : start()) };
}

export const MicIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
  </svg>
`;
