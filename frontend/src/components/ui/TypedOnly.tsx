import { useId, useState, type TextareaHTMLAttributes } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { Icon } from './Icon';

/**
 * A textarea that only accepts typed input: paste, drag-and-drop and paste-style inserts
 * (including mobile clipboard bars) are refused, as the institute requires for assignments.
 * This discourages copying AI-generated answers; it cannot prove who typed the text.
 */
export function TypedOnlyTextarea(props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onPaste' | 'onDrop'>) {
  const { lang } = useI18n();
  const [warned, setWarned] = useState(false);
  const noteId = useId();
  const refuse = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setWarned(true);
  };
  return (
    <div>
      <textarea
        {...props}
        onPaste={refuse}
        onDrop={refuse}
        onBeforeInput={(e) => {
          const type = (e.nativeEvent as InputEvent).inputType;
          if (type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'insertFromPasteAsQuotation') refuse(e);
        }}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={[props['aria-describedby'], noteId].filter(Boolean).join(' ')}
      />
      <p id={noteId} className="tiny inline-meta" style={{ marginTop: 6, color: warned ? 'var(--burgundy)' : 'var(--muted)', fontWeight: warned ? 600 : 400 }} role={warned ? 'status' : undefined}>
        <Icon name="edit" size={12} />{' '}
        {warned
          ? lang === 'fr' ? 'Le collage est désactivé : tapez votre réponse.' : 'Pasting is turned off: please type your answer.'
          : lang === 'fr' ? 'Réponse à taper vous-même (le collage est désactivé).' : 'Type your answer yourself (pasting is turned off).'}
      </p>
    </div>
  );
}
