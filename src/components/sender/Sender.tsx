import {
  ApiOutlined,
  CodeOutlined,
  EditOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  ProfileOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import {
  Attachments,
  AttachmentsProps,
  Sender,
  SenderProps,
} from "@ant-design/x";

import {
  Button,
  Divider,
  Flex,
  GetRef,
  MenuProps,
  message,
  Modal,
  Input,
  Form,
  Upload,
} from "antd";

import React, { useEffect, useRef, useState } from "react";

/* ===========================================================================
 * 1. Agent 配置
 * ======================================================================== */
const AGENTS: Record<
  string,
  { icon: React.ReactNode; label: string; slotConfig: SenderProps["slotConfig"] }
> = {
  deep_search: {
    icon: <SearchOutlined />,
    label: "Deep Search",
    slotConfig: [],
  },

  ai_code: {
    icon: <CodeOutlined />,
    label: "AI Code",
    slotConfig: [
      { type: "text", value: "Please use " },
      {
        type: "select",
        key: "code_lang",
        props: {
          options: ["JS", "C++", "Java"],
          placeholder: "Please select a programming language",
        },
      },
      { type: "text", value: " to write a mini game." },
    ],
  },

  ai_writing: {
    icon: <EditOutlined />,
    label: "Writing",
    slotConfig: [
      { type: "text", value: "Please write an article about " },
      {
        type: "select",
        key: "writing_type",
        props: {
          options: ["Campus", "Travel", "Reading"],
          placeholder: "Please enter a topic",
        },
      },
      { type: "text", value: ". The requirement is " },
      {
        type: "input",
        key: "writing_num",
        props: {
          defaultValue: "800",
          placeholder: "Please enter the number of words.",
        },
      },
      { type: "text", value: " words." },
    ],
  },
};

/* ===========================================================================
 * 2. 辅助函数：插入 Tag 到 Sender 输入框
 * ======================================================================== */
function insertFileTag(senderRef: any, fileName: string) {
  senderRef.current?.insert?.([
    {
      type: "tag",
      key: `doc_${Date.now()}`,
      props: {
        label: (
          <Flex gap="small">
            <ProfileOutlined />
            {fileName}
          </Flex>
        ),
        value: fileName,
      },
    },
    { type: "text", value: "\n" },
  ]);

  // 修复 textarea 不刷新的问题
  try {
    const el = senderRef.current?.nativeElement as HTMLElement;
    const ta = el?.querySelector("textarea") as HTMLTextAreaElement;
    if (ta) {
      ta.value = `${ta.value}`;
      ta.focus();
      ta.selectionStart = ta.selectionEnd = ta.value.length;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } catch {}
}

/* ===========================================================================
 * 3. RAG ingest + search + embed 封装
 * ======================================================================== */
function getRawFile(f: any): File | null {
  const raw = (f?.originFileObj || f?.file || f) as File | undefined;
  if (!raw) return null;
  if (typeof (raw as any).arrayBuffer === 'function') return raw as File;
  // 兼容极少数环境：使用 FileReader 获取数据，再构造 Blob
  return raw as File;
}
async function ingestFile(raw: File) {
  const ab = await raw.arrayBuffer();

  const resp = await (window as any).rag?.ingestFileBlob?.({
    name: raw.name,
    type: raw.type,
    data: ab,
  });

  if (resp?.error) throw new Error(resp.error);

  for (const item of resp.items || []) {
    await (window as any).rag?.ingest?.(item);
  }
}

async function buildRagPrompt(question: string) {
  const q = question.trim();
  let finalPrompt = q;

  try {
    const embResp = await (window as any).rag?.embed?.({ text: q });
    if (embResp?.error) return q;

    const embedding = embResp.embedding || [];
    const searchResp = await (window as any).rag?.search?.({ embedding, topK: 5 });

    const docs = (searchResp?.documents || []).flat().join("\n---\n");
    if (docs) {
      finalPrompt = `利用以下文档回答问题：\n${docs}\n\n问题：${q}`;
    }
  } catch {}

  return finalPrompt;
}

/* ===========================================================================
 * 4. 组件主体
 * ======================================================================== */
const SenderComponent: React.FC<{
  onPromptChange?: (val: string) => void;
  prompt?: string;
  onSubmit?: (val: string) => void;
  onCaptureSelection?: () => void;
}> = ({ onPromptChange, prompt, onSubmit, onCaptureSelection }) => {
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState("deep_search");
  const [fileList, setFileList] = useState<AttachmentsProps["items"]>([]);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);

  // 模型设置
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelUrl, setModelUrl] = useState("");
  const [modelName, setModelName] = useState("");

  const senderRef = useRef<GetRef<typeof Sender>>(null);
  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);

  /* === 同步外部 prompt → Sender === */
  useEffect(() => {
    try {
      const el = senderRef.current?.nativeElement as HTMLElement;
      const ta = el?.querySelector("textarea") as HTMLTextAreaElement;
      if (ta) {
        ta.value = prompt || "";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch {}
  }, [prompt]);

  /* === 加载模型配置 === */
  useEffect(() => {
    (async () => {
      const cfg = await window.api?.getModelConfig?.();
      if (cfg) {
        setApiKey(cfg.apiKey || "");
        setModelUrl(cfg.url || "");
        setModelName(cfg.name || "");
      }
    })();
  }, []);

  /* === 上传文件 → RAG → 插入 tag === */
  const handleUpload = async (info: any) => {
    const list = info?.fileList ?? (info?.file ? [info.file] : []);
    for (const f of list) {
      const raw = getRawFile(f);
      if (!raw) {
        message.error('无法读取本地文件');
        continue;
      }
      try {
        await ingestFile(raw);
        message.success(`已导入 ${raw.name}`);
        insertFileTag(senderRef, raw.name);
        setUploadedNames((prev) => (prev.includes(raw.name) ? prev : [...prev, raw.name]));
      } catch {
        message.error('导入失败');
      }
    }
  };

  /* === 提交消息 === */
  const handleSubmit = async (value: string) => {
    let finalPrompt = await buildRagPrompt(value);
    try {
      if (uploadedNames.length > 0) {
        const resp = await (window as any).rag?.getDocsByNames?.({ names: uploadedNames, maxPerFile: 8, maxChars: 3000 });
        const docsByName: Record<string, string[]> = resp?.docs || {};
        const parts: string[] = [];
        for (const name of uploadedNames) {
          const docs = docsByName[name] || [];
          if (docs.length > 0) {
            parts.push(`【文件：${name}】\n${docs.join('\n---\n')}`);
          }
        }
        if (parts.length > 0) {
          finalPrompt = `请结合以下文件内容进行分析：\n\n${parts.join('\n\n')}\n\n问题：${value.trim()}`;
        }
      }
    } catch {}

    if (onSubmit) {
      onSubmit(finalPrompt);
    } else {
      setLoading(true);
      message.info(`Send: ${finalPrompt}`);
    }
    senderRef.current?.clear?.();
  };

  /* === Sender Header (顶部 Attachments) === */
  const senderHeader = (
    <Sender.Header title="Attachments" open forceRender>
      <Attachments
        ref={attachmentsRef}
        beforeUpload={() => false}
        items={fileList}
        onChange={({ fileList }) => {
          setFileList(fileList);
        }}
        getDropContainer={() => senderRef.current?.nativeElement}
      />
    </Sender.Header>
  );

  /* ===========================================================================
   * UI
   * ======================================================================== */
  return (
    <Flex vertical gap="middle" style={{ margin: 10 }}>
      <Sender
        ref={senderRef}
        loading={loading}
        header={senderHeader}
        placeholder="按回车发送"
        autoSize={{ minRows: 3, maxRows: 6 }}
        slotConfig={AGENTS[activeAgent].slotConfig}
        onChange={onPromptChange}
        onSubmit={handleSubmit}
        suffix={false}
        onCancel={() => setLoading(false)}
        footer={(actionNode) => (
          <Flex justify="space-between" align="center">
            <Flex gap="small" align="center">
              {/* 纸夹（打开附件区） */}
              <Button type="text" icon={<PaperClipOutlined />} />

              {/* 文件上传 */}
              <Upload
                multiple
                showUploadList={false}
                beforeUpload={() => false}
                accept=".txt,.md,.pdf,text/plain,application/pdf"
                onChange={handleUpload}
              >
                <Button type="text" icon={<ProfileOutlined />}>
                  文件
                </Button>
              </Upload>
            </Flex>

            {/* 右侧：模型设置 + 发送按钮 */}
            <Flex align="center">
              <Button
                type="text"
                icon={<ApiOutlined />}
                onClick={() => setSettingsOpen(true)}
              />
              <Divider type="vertical" />
              {actionNode}
            </Flex>
          </Flex>
        )}
      />

      {/* 模型设置弹窗 */}
      <Modal
        title="模型配置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={async () => {
          await window.api?.setModelConfig?.({
            apiKey,
            url: modelUrl,
            name: modelName,
          });
          message.success("模型配置已更新");
          setSettingsOpen(false);
        }}
      >
        <Form layout="vertical">
          <Form.Item label="API Key">
            <Input.Password
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="模型地址">
            <Input
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="模型名称">
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default SenderComponent;
