import React, { useEffect } from 'react';
import { Message } from '../../preload';
import { XMarkdown } from '@ant-design/x-markdown';
import { Welcome } from '@ant-design/x';
import SenderComponent from '../sender/Sender';

type Props = {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: () => void;
};

const AssistantDashboard: React.FC<Props> = ({
  messages,
  isLoading,
  messagesEndRef,
  prompt,
  onPromptChange,
  onSubmit,
}) => {
  useEffect(() => {
    if (!isLoading) {
      onPromptChange('');
    }
  }, [isLoading, onPromptChange]);
  return (
    <div id="chat-area">
      <div id="messages">
        <Welcome
          icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
          title="等不及了，赶紧上车，系好安全带"
          description="Can't wait—hurry and get in the car, and buckle up"
        />
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.role === 'assistant' ? (
              <XMarkdown content={msg.content} />
            ) : (
              msg.content
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message bot">正在请求模型，请稍候...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <SenderComponent
        prompt={prompt}
        onPromptChange={onPromptChange}
        onSubmit={onSubmit} />
    </div>
  );
};

export default AssistantDashboard;
