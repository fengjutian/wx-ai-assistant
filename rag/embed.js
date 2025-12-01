import { DeepSeek } from "@deepseek-ai/sdk";

const client = new DeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

export async function embedding(text) {
  const res = await client.embeddings.create({
    model: "deepseek-embedding",
    input: text
  });
  return res.data[0].embedding;
}


import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedding(text) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return res.data[0].embedding;
}
