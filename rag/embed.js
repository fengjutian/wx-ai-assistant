import OpenAI from "openai";

export async function embedding(text) {
  const base = (process.env.MODEL_URL || '').replace(/\/chat\/completions$/, '') || 'https://api.moonshot.cn/v1';
  const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL: base });
  const model = process.env.MODEL_EMBED_NAME || process.env.MODEL_NAME || 'kimi-k2-0905-preview';
  const res = await client.embeddings.create({ model, input: text });
  return res.data[0].embedding;
}
