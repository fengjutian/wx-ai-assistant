import React from "react";
import {
  EditorBubble,
  EditorBubbleItem,
  EditorCommand,
  EditorCommandItem,
  EditorContent,
  EditorRoot,
  StarterKit,
  Placeholder,
} from "novel";

import { slashCommand, suggestionItems } from "./slash-command";

export default function NovelEditor() {
  const extensions = [slashCommand, StarterKit, Placeholder];

  return (
    <EditorRoot>
      <div style={{ height: 200 }}>
        <EditorContent extensions={extensions}>
          <EditorCommand>
            {suggestionItems.map((item, idx) => (
              <EditorCommandItem
                key={idx}
                onCommand={({ editor }) => {
                  const sel = (
                    editor.state as unknown as {
                      selection: { from: number; to: number };
                    }
                  ).selection;

                  if (item.command) {
                    item.command({
                      editor,
                      range: { from: sel?.from ?? 0, to: sel?.to ?? 0 },
                    });
                  }
                }}
              >
                {String(item.title || "")}
              </EditorCommandItem>
            ))}

            <EditorCommandItem
              onCommand={({ editor }) => {
                editor.chain().focus().toggleBold().run();
              }}
            >
              加粗
            </EditorCommandItem>

            <EditorCommandItem
              onCommand={({ editor }) => {
                editor.chain().focus().toggleItalic().run();
              }}
            >
              斜体
            </EditorCommandItem>

            <EditorCommandItem
              onCommand={({ editor }) => {
                editor.chain().focus().setParagraph().run();
              }}
            >
              段落
            </EditorCommandItem>
          </EditorCommand>

          <EditorBubble>
            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleBold().run();
              }}
            >
              加粗
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleItalic().run();
              }}
            >
              斜体
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().unsetAllMarks().run();
              }}
            >
              清除样式
            </EditorBubbleItem>
          </EditorBubble>
        </EditorContent>
      </div>
    </EditorRoot>
  );
}
