import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function ragQuery(question, retrieveDocs, topK = 3) {
  const emb = await embedding(question);

  const result = await retrieveDocs(emb, topK);

  const context = result.documents.flat().join("\n---\n");

  const answer = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "你是本地知识库助手。" },
      {
        role: "user",
        content: `利用以下文档回答问题：\n${context}\n\n问题：${question}`
      }
    ]
  });

  return answer.choices[0].message.content;
}
