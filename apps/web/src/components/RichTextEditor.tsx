import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  sanitizeRichText,
} from '../lib/rich-text';

interface RichTextEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  placeholder,
  onChange,
  multiline = true,
  className = '',
}: RichTextEditorProps): JSX.Element {
  const editorRef =
    useRef<HTMLDivElement>(null);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const [
    toolbarOpen,
    setToolbarOpen,
  ] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;

    if (
      editor &&
      document.activeElement !== editor &&
      editor.innerHTML !== value
    ) {
      editor.innerHTML = value;
    }
  }, [value]);

  function commit(): void {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const sanitized =
      sanitizeRichText(
        editor.innerHTML,
      );

    if (
      editor.innerHTML !== sanitized
    ) {
      editor.innerHTML = sanitized;
    }

    onChange(sanitized);
  }

  function runCommand(
    command: string,
    commandValue?: string,
  ): void {
    editorRef.current?.focus();

    document.execCommand(
      command,
      false,
      commandValue,
    );
  }

  function addLink(): void {
    const selection =
      window.getSelection();

    const savedRange =
      selection?.rangeCount
        ? selection
            .getRangeAt(0)
            .cloneRange()
        : null;

    const url = window.prompt(
      'Masukkan URL tautan:',
      'https://',
    );

    if (
      !url ||
      url === 'https://'
    ) {
      return;
    }

    if (
      savedRange &&
      selection
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    runCommand(
      'createLink',
      url,
    );
  }

  const buttonClass =
    'h-8 min-w-9 rounded px-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600';

  return (
    <div
      ref={wrapperRef}
      className="space-y-1"
      onBlurCapture={(event) => {
        const nextTarget =
          event.relatedTarget as
            | Node
            | null;

        if (
          !nextTarget ||
          !wrapperRef.current?.contains(
            nextTarget,
          )
        ) {
          setToolbarOpen(false);
        }
      }}
    >
      <div
        ref={editorRef}
        onFocus={() =>
          setToolbarOpen(true)
        }
        onClick={() =>
          setToolbarOpen(true)
        }
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onBlur={commit}
        onKeyDown={(event) => {
          if (
            !multiline &&
            event.key === 'Enter'
          ) {
            event.preventDefault();
            commit();
          }
        }}
        className={[
          'min-h-9 outline-none',
          'empty:before:pointer-events-none',
          'empty:before:text-slate-400',
          'empty:before:content-[attr(data-placeholder)]',
          '[&_a]:text-blue-600',
          '[&_a]:underline',
          '[&_ol]:ml-6',
          '[&_ol]:list-decimal',
          '[&_ul]:ml-6',
          '[&_ul]:list-disc',
          className,
        ].join(' ')}
        dangerouslySetInnerHTML={{
          __html: value,
        }}
      />

      <div
        className={
          toolbarOpen
            ? 'flex flex-wrap items-center gap-1'
            : 'hidden'
        }
      >
        <button
          type="button"
          title="Tebal"
          className={`${buttonClass} font-bold`}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand('bold');
          }}
        >
          B
        </button>

        <button
          type="button"
          title="Miring"
          className={`${buttonClass} italic`}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand('italic');
          }}
        >
          I
        </button>

        <button
          type="button"
          title="Garis bawah"
          className={`${buttonClass} underline`}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand('underline');
          }}
        >
          U
        </button>

        <button
          type="button"
          title="Tambahkan tautan"
          className={buttonClass}
          onMouseDown={(event) => {
            event.preventDefault();
            addLink();
          }}
        >
          🔗
        </button>

        <button
          type="button"
          title="Daftar bernomor"
          disabled={!multiline}
          className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-30`}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand(
              'insertOrderedList',
            );
          }}
        >
          1.
        </button>

        <button
          type="button"
          title="Daftar bullet"
          disabled={!multiline}
          className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-30`}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand(
              'insertUnorderedList',
            );
          }}
        >
          •
        </button>

        <button
          type="button"
          title="Hapus format"
          className={`${buttonClass} line-through`}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand(
              'removeFormat',
            );
          }}
        >
          Tx
        </button>
      </div>
    </div>
  );
}
