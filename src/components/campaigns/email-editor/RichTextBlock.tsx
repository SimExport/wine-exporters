import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, Link2Off } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Props {
  html: string;
  variant: 'heading' | 'text';
  onChange: (html: string) => void;
  disabled?: boolean;
}

/** Small Tiptap instance: paragraphs, line breaks, bold, italic, http(s) links only. */
export const RichTextBlock = ({ html, variant, onChange, disabled }: Props) => {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false, codeBlock: false, code: false,
        blockquote: false, horizontalRule: false, strike: false, underline: false,
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https'], defaultProtocol: 'https' },
      }),
    ],
    content: html,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[2.5rem] rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring [&_p]:my-1 [&_a]:text-primary [&_a]:underline',
          variant === 'heading' ? 'text-lg font-semibold' : 'text-sm leading-relaxed',
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Replace content only when it changes from outside (e.g. new AI proposal).
  useEffect(() => {
    if (editor && html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false });
  }, [html, editor]);
  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);

  if (!editor) return null;
  const setLink = () => {
    const prev = editor.getAttributes('link').href ?? 'https://';
    const url = window.prompt(t('emailEditor.linkPrompt'), prev);
    if (url === null) return;
    if (!/^https?:\/\/\S+$/i.test(url.trim())) { toast({ title: t('emailEditor.linkInvalid'), variant: 'destructive' }); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };
  const btn = (active: boolean) => cn('h-7 w-7', active && 'bg-muted');
  return (
    <div className="space-y-1">
      {!disabled && (
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive('bold'))} title={t('emailEditor.bold')} aria-label={t('emailEditor.bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive('italic'))} title={t('emailEditor.italic')} aria-label={t('emailEditor.italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive('link'))} title={t('emailEditor.link')} aria-label={t('emailEditor.link')} onClick={setLink}><Link2 className="h-3.5 w-3.5" /></Button>
          {editor.isActive('link') && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t('emailEditor.unlink')} aria-label={t('emailEditor.unlink')} onClick={() => editor.chain().focus().unsetLink().run()}><Link2Off className="h-3.5 w-3.5" /></Button>}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
