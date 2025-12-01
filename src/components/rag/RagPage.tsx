import React, { useState } from 'react';
import { Flex, Input, Button, Upload, message } from 'antd';

const RagPage: React.FC = () => {
  const [topK, setTopK] = useState<number>(3);
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const doUpload = async (file: File) => {
    try {
      const ab = await file.arrayBuffer();
      const resp = await (window as any).rag?.ingestFileBlob?.({ name: file.name, type: file.type, data: ab });
      if (resp?.error) {
        message.error(resp.error);
        return;
      }
      const items = resp?.items || [];
      for (const item of items) {
        await (window as any).rag?.ingest?.(item);
      }
      message.success(`已导入 ${file.name}`);
    } catch {
      message.error('导入失败');
    }
  };

  const ask = async () => {
    const q = String(question || '').trim();
    if (!q) return;
    setBusy(true);
    try {
      const embResp = await (window as any).rag?.embed?.({ text: q });
      if (embResp?.error) {
        message.error(embResp.error);
        setBusy(false);
        return;
      }
      const emb = embResp?.embedding || [];
      const sr = await (window as any).rag?.search?.({ embedding: emb, topK });
      const docs = (sr?.documents || []).flat().join('\n---\n');
      const prompt = `利用以下文档回答问题：\n${docs}\n\n问题：${q}`;
      const res = await (window as any).api?.callModel?.(prompt, []);
      if (res?.error) {
        message.error(res.error);
      }
      console.log('sr', res);
      setAnswer(res?.text || '');
    } catch {
      message.error('检索或生成失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex vertical style={{ padding: 12 }} gap="small">
      <Flex gap="small" align="center">
        <Upload multiple showUploadList={false} beforeUpload={() => false} accept=".txt,.md,.pdf,text/plain,application/pdf" onChange={async ({ file }) => {
          const raw = (file as any).originFileObj as File;
          if (raw) await doUpload(raw);
        }}>
          <Button type="primary">上传文件</Button>
        </Upload>
        <Input style={{ width: 100 }} value={String(topK)} onChange={(e) => {
          const v = Number(e.target.value || 3);
          setTopK(Number.isFinite(v) ? Math.max(1, Math.min(10, v)) : 3);
        }} placeholder="topK" />
      </Flex>
      <Input.TextArea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="输入问题" autoSize={{ minRows: 3, maxRows: 6 }} />
      <Button type="primary" loading={busy} onClick={ask}>检索问答</Button>
      <Input.TextArea value={answer} readOnly autoSize={{ minRows: 6, maxRows: 20 }} placeholder="答案输出" />
    </Flex>
  );
};

export default RagPage;
