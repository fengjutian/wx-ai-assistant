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

import { slashCommand } from "./slash-command";



 export default () => {
 const extensions = [slashCommand, StarterKit, Placeholder ];

 return (
  <EditorRoot>
      <EditorContent
        extensions={extensions}
      >
      <EditorCommand>
        <EditorCommandItem onCommand={({ editor }) => { editor.chain().focus().toggleBold().run(); }} />
        <EditorCommandItem onCommand={({ editor }) => { editor.chain().focus().toggleItalic().run(); }} />
        <EditorCommandItem onCommand={({ editor }) => { editor.chain().focus().setParagraph().run(); }} />
      </EditorCommand>
      <EditorBubble>
        <EditorBubbleItem onSelect={(editor) => { editor.chain().focus().toggleBold().run(); }}>加粗</EditorBubbleItem>
        <EditorBubbleItem onSelect={(editor) => { editor.chain().focus().toggleItalic().run(); }}>斜体</EditorBubbleItem>
        <EditorBubbleItem onSelect={(editor) => { editor.chain().focus().unsetAllMarks().run(); }}>清除样式</EditorBubbleItem>
      </EditorBubble>
    </EditorContent>
  </EditorRoot>
);
}

