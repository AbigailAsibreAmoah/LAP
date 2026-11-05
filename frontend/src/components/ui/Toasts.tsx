import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { spring } from '../animations/motion';
import { Icon, type IconName } from './Icon';

interface Toast {
  id: number;
  text: string;
  icon: IconName;
}

// Reused across hot reloads (see AppStore).
const toastHolder = globalThis as { __laporteToastContext?: React.Context<(text: string, icon?: IconName) => void> };
const ToastContext = (toastHolder.__laporteToastContext ??= createContext<(text: string, icon?: IconName) => void>(() => {}));

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, icon: IconName = 'checkCircle') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={spring.snappy}>
              <Icon name={t.icon} size={18} />
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
