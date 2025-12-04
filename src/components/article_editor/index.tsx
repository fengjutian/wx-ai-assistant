import React, { useState } from "react";
import Editor from "@uiw/react-markdown-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

const ArticleEditor: React.FC = () => {
  const [content, setContent] = useState<string>("# 新文章\n\n开始写内容吧…");

  const handleSave = () => {
    localStorage.setItem("articleContent", content);
    alert("文章已保存！");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1, borderRight: "1px solid #eee" }}>
        <Editor
          height="100%"
          value={content}
          onChange={(value: string) => setContent(value)}
        />
      </div>

      <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code: (props: any) => {
              const { inline, className, children, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter language={match[1]}>
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code {...rest}>{children}</code>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <button
        onClick={handleSave}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          padding: "10px 20px",
          background: "#333",
          color: "#fff",
          borderRadius: 8,
          fontSize: 16,
        }}
      >
        保存文章
      </button>
    </div>
  );
};

export default ArticleEditor;
