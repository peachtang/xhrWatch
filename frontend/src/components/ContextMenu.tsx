import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  key: string;
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** 通用右键菜单：fixed 定位到鼠标位置，点击外部 / Esc / 滚动 / 缩放时关闭 */
export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMove = () => onClose();
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [onClose]);

  // 简单防溢出：菜单预估宽 300px，每项高 32px，超出视口时回退
  const left = Math.max(4, Math.min(x, window.innerWidth - 304));
  const top = Math.max(4, Math.min(y, window.innerHeight - items.length * 32 - 16));

  return (
    <div ref={ref} className="ctx-menu" style={{ left, top }} role="menu">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="ctx-menu-item"
          role="menuitem"
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
