import React from 'react';
import styles from '../../app.module.css';
import { XMarkdown } from '@ant-design/x-markdown';
import { Welcome, Sender } from '@ant-design/x';
import { Message } from '../../preload';

type Props = {
  rightWidth: number;
  messages: Message[];
  isLoading: boolean;
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
};

const OperatorPanel: React.FC<Props> = ({
  rightWidth,
  messages,
  isLoading,
  prompt,
  onPromptChange,
  onSubmit,
  messagesEndRef,
}) => {
  return (
    <div
      id="right"
      className={styles.rightPanel}
      style={{ width: `${rightWidth}%` }}
    >
      <div id="chat-area" className={styles.chatArea}>
        <div id="messages" className={styles.messages}>
          <Welcome
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title="Hello, 我是你的阅读助手"
            description="Base on Ant Design, AGI product interface solution, create a better intelligent vision~"
          />
          {messages.map((msg, index) => (
            <div key={index} className={`${styles.message} ${styles[msg.role]}`}>
              {msg.role === 'assistant' ? (
                <XMarkdown content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.assistant}`}>正在请求模型，请稍候...</div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div id="controls" className={styles.controls}>
          <Sender
            value={prompt}
            onChange={(val) => onPromptChange(val)}
            onSubmit={onSubmit}
            placeholder="向大模型提问..."
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default OperatorPanel;
