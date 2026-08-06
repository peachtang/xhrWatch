import { useEffect, useRef } from 'react';
import {
  createJSONEditor,
  Mode,
  type Content,
  type ContextMenuItem,
  isContextMenuRow,
  isMenuButton,
  isMenuDropDownButton,
  isMenuSeparator,
} from 'vanilla-jsoneditor';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

interface JsonEditorProps {
  value: unknown;
}

const KEEP_MENU = new Set([
  'Copy',
  'Copy value',
  'Copy path',
  'Copy row',
  'Collapse',
  'Expand',
  'Expand all',
  'Collapse all',
]);

function keepMenuItem(item: ContextMenuItem): boolean {
  if (isMenuSeparator(item)) return true;
  if (isMenuButton(item)) return KEEP_MENU.has(item.text ?? '');
  if (isMenuDropDownButton(item)) return KEEP_MENU.has(item.main.text ?? '');
  if (isContextMenuRow(item)) {
    return item.items.some((sub) => {
      if (isMenuSeparator(sub)) return false;
      if (isMenuButton(sub)) return KEEP_MENU.has(sub.text ?? '');
      if (isMenuDropDownButton(sub)) return KEEP_MENU.has(sub.main.text ?? '');
      return false;
    });
  }
  return false;
}

function onRenderContextMenu(items: ContextMenuItem[]) {
  return items.filter(keepMenuItem);
}

export default function JsonEditor({ value }: JsonEditorProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);

  useEffect(() => {
    if (!targetRef.current) return;

    editorRef.current = createJSONEditor({
      target: targetRef.current,
      props: {
        content: { json: value } as Content,
        mode: Mode.tree,
        readOnly: true,
        mainMenuBar: false,
        navigationBar: true,
        statusBar: false,
        onRenderContextMenu,
      },
    });

    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    editorRef.current?.updateProps({
      content: { json: value } as Content,
    });
  }, [value]);

  return <div ref={targetRef} className="jse-theme-dark json-editor" />;
}
