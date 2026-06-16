import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  editable?: boolean;
  onChange?: (content: string) => void;
}

function getMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return '';
  const storage = editor.storage as { markdown?: { getMarkdown?: () => string } };
  return storage.markdown?.getMarkdown?.() ?? editor.getHTML();
}

export function RichTextEditor({ content, editable = true, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content,
    editable,
    onUpdate: (e) => {
      onChange?.(getMarkdown(e.editor));
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      if (content !== getMarkdown(editor)) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {editable && (
        <div className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded text-sm ${editor.isActive('bold') ? 'bg-gray-200 font-bold' : 'hover:bg-gray-100'}`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded text-sm italic ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 font-bold' : 'hover:bg-gray-100'}`}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 font-bold' : 'hover:bg-gray-100'}`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            1. List
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[300px]" />
    </div>
  );
}
