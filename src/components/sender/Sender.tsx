import {
  AntDesignOutlined,
  ApiOutlined,
  CodeOutlined,
  EditOutlined,
  FileImageOutlined,
  OpenAIOutlined,
  PaperClipOutlined,
  ProfileOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Attachments, AttachmentsProps, Sender, SenderProps } from '@ant-design/x';
import { Button, Divider, Dropdown, Flex, GetRef, MenuProps, message, Modal, Input, Form } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const Switch = Sender.Switch;

const AgentInfo: {
  [key: string]: {
    icon: React.ReactNode;
    label: string;
    slotConfig: SenderProps['slotConfig'];
  };
} = {
  deep_search: {
    icon: <SearchOutlined />,
    label: 'Deep Search',
    slotConfig: [
      // { type: 'text', value: 'Please help me search for news about ' },
      // {
      //   type: 'select',
      //   key: 'search_type',
      //   props: {
      //     options: ['AI', 'Technology', 'Entertainment'],
      //     placeholder: 'Please select a category',
      //   },
      // },
      // { type: 'text', value: ' and summarize it into a list.' },
    ],
  },
  ai_code: {
    icon: <CodeOutlined />,
    label: 'AI Code',
    slotConfig: [
      { type: 'text', value: 'Please use ' },
      {
        type: 'select',
        key: 'code_lang',
        props: {
          options: ['JS', 'C++', 'Java'],
          placeholder: 'Please select a programming language',
        },
      },
      { type: 'text', value: ' to write a mini game.' },
    ],
  },
  ai_writing: {
    icon: <EditOutlined />,
    label: 'Writing',
    slotConfig: [
      { type: 'text', value: 'Please write an article about ' },
      {
        type: 'select',
        key: 'writing_type',
        props: {
          options: ['Campus', 'Travel', 'Reading'],
          placeholder: 'Please enter a topic',
        },
      },
      { type: 'text', value: '. The requirement is ' },
      {
        type: 'input',
        key: 'writing_num',
        props: {
          defaultValue: '800',
          placeholder: 'Please enter the number of words.',
        },
      },
      { type: 'text', value: ' words.' },
    ],
  },
};

const IconStyle = {
  fontSize: 16,
};

const SwitchTextStyle = {
  display: 'inline-flex',
  width: 28,
  justifyContent: 'center',
  alignItems: 'center',
};

const FileInfo: {
  [key: string]: {
    icon: React.ReactNode;
    label: string;
  };
} = {
  file_image: {
    icon: <FileImageOutlined />,
    label: 'x-image',
  },
};

type SenderComponentProps = {
  onPromptChange?: (val: string) => void;
  prompt?: string;
  onSubmit?: (val: string) => void;
  onCaptureSelection?: () => void;
};

const SenderComponent: React.FC<SenderComponentProps> = ({ onPromptChange, prompt, onSubmit, onCaptureSelection }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [deepThink, setDeepThink] = useState<boolean>(true);
  const [activeAgentKey, setActiveAgentKey] = useState('deep_search');
  const [fileList, setFileList] = useState<AttachmentsProps['items']>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const agentItems: MenuProps['items'] = Object.keys(AgentInfo).map((agent) => {
    const { icon, label } = AgentInfo[agent];
    return {
      key: agent,
      icon,
      label,
    };
  });
  const [open, setOpen] = React.useState(false);
  const attachmentsRef = React.useRef<GetRef<typeof Attachments>>(null);
  const fileItems = Object.keys(FileInfo).map((file) => {
    const { icon, label } = FileInfo[file];
    return {
      key: file,
      icon,
      label,
    };
  });

  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const agentItemClick: MenuProps['onClick'] = (item) => {
    setActiveAgentKey(item.key);
  };
  const fileItemClick: MenuProps['onClick'] = (item) => {
    const { icon, label } = FileInfo[item.key];
    senderRef.current?.insert?.([
      {
        type: 'tag',
        key: `${item.key}_${Date.now()}`,
        props: {
          label: (
            <Flex gap="small">
              {icon}
              {label}
            </Flex>
          ),
          value: item.key,
        },
      },
    ]);
  };

  // Mock send message
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        message.success('Send message successfully!');
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [loading]);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.api?.getModelConfig?.();
        if (cfg) {
          setApiKey(cfg.apiKey || '');
          setModelUrl(cfg.url || '');
          setModelName(cfg.name || '');
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const senderHeader = (
    <Sender.Header
      title="Attachments"
      styles={{
        content: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      forceRender
    >
      <Attachments
        ref={attachmentsRef}
        // Mock not real upload file
        beforeUpload={() => false}
        items={fileList}
        onChange={({ fileList }) => setFileList(fileList)}
        getDropContainer={() => senderRef.current?.nativeElement}
      />
    </Sender.Header>
  );

  useEffect(() => {
    try {
      const el = (senderRef as any)?.current?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      const ta = el.querySelector('textarea') as HTMLTextAreaElement | null;
      if (ta) {
        ta.value = String(prompt || '');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch {
      // ignore
    }
  }, [prompt]);

  return (
    <Flex vertical gap="middle" style={{ margin: 10 }}>
      <Sender
        loading={loading}
        ref={senderRef}
        placeholder="按回车发送消息"
        value={prompt}
        header={senderHeader}
        footer={(actionNode) => {
          return (
            <Flex justify="space-between" align="center">
              <Flex gap="small" align="center">
                <Button style={IconStyle} type="text" icon={<PaperClipOutlined />} />
                <Switch
                  value={deepThink}
                  checkedChildren={
                    <>
                      Deep Think:<span style={SwitchTextStyle}>on</span>
                    </>
                  }
                  unCheckedChildren={
                    <>
                      Deep Think:<span style={SwitchTextStyle}>off</span>
                    </>
                  }
                  onChange={(checked: boolean) => {
                    setDeepThink(checked);
                  }}
                  icon={<OpenAIOutlined />}
                />
                <Dropdown
                  menu={{
                    selectedKeys: [activeAgentKey],
                    onClick: agentItemClick,
                    items: agentItems,
                  }}
                >
                  <Switch value={false} icon={<AntDesignOutlined />}>
                    Agent
                  </Switch>
                </Dropdown>
                {fileItems?.length ? (
                  <Dropdown menu={{ onClick: fileItemClick, items: fileItems }}>
                    <Switch value={false} icon={<ProfileOutlined />}>
                      Files
                    </Switch>
                  </Dropdown>
                ) : null}
              </Flex>
              <Flex align="center">
                <Button type="text" style={IconStyle} icon={<ApiOutlined />} onClick={() => setSettingsOpen(true)} />
                <Button type="text" onClick={() => onCaptureSelection?.()}>抓取选区</Button>
                <Divider orientation="vertical" />
                {actionNode}
              </Flex>
            </Flex>
          );
        }}
        suffix={false}
        onChange={(v) => {
          onPromptChange?.(v);
        }}
        onSubmit={(v) => {
          if (onSubmit) {
            onSubmit(v);
            senderRef.current?.clear?.();
          } else {
            setLoading(true);
            message.info(`Send message: ${v}`);
            senderRef.current?.clear?.();
          }
        }}
        onCancel={() => {
          setLoading(false);
          message.error('Cancel sending!');
        }}
        slotConfig={AgentInfo[activeAgentKey].slotConfig}
        autoSize={{ minRows: 3, maxRows: 6 }}
      />
      <Modal
        title="模型配置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={async () => {
          await window.api?.setModelConfig?.({ apiKey, url: modelUrl, name: modelName });
          message.success('模型配置已更新');
          setSettingsOpen(false);
        }}
      >
        <Form layout="vertical">
          <Button
            style={{ marginBottom: 12 }}
            onClick={async () => {
              await window.api?.resetModelConfig?.();
              const cfg = await window.api?.getModelConfig?.();
              setApiKey(cfg?.apiKey || '');
              setModelUrl(cfg?.url || '');
              setModelName(cfg?.name || '');
              message.success('已重置为 .env 默认值');
            }}
          >
            重置为 .env 默认值
          </Button>
          <Form.Item label="API Key">
            <Input.Password value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="输入模型 API Key" />
          </Form.Item>
          <Form.Item label="模型地址">
            <Input value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="https://.../chat/completions" />
          </Form.Item>
          <Form.Item label="模型名称">
            <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="kimi-k2-..." />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default SenderComponent;
