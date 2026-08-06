import { useState } from 'react';
import { copyText } from '../utils';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = '📋 Copy' }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');

  const handleClick = async () => {
    const ok = await copyText(text);
    setState(ok ? 'ok' : 'err');
    setTimeout(() => setState('idle'), 1200);
  };

  return (
    <button
      type="button"
      className={`copy-btn ${state === 'ok' ? 'flash-ok' : state === 'err' ? 'flash-err' : ''}`}
      onClick={handleClick}
      aria-label={label}
    >
      {state === 'ok' ? '✓ Copied' : state === 'err' ? '✗ Failed' : label}
    </button>
  );
}
