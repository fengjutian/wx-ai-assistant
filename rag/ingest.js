import fs from "fs";
import pdfParse from "pdf-parse";
import { embedding } from "./embed.js";

export async function ingestFile(filePath) {
  let text = "";

  if (filePath.endsWith(".pdf")) {
    const data = await pdfParse(fs.readFileSync(filePath));
    text = data.text;
  } else {
    text = fs.readFileSync(filePath, "utf-8");
  }

  const chunks = splitText(text, 300); // 每 300 字分块

  let items = [];
  for (let i = 0; i < chunks.length; i++) {
    const emb = await embedding(chunks[i]);
    items.push({
      id: filePath + "#" + i,
      text: chunks[i],
      embedding: emb
    });
  }

  return items;
}

function splitText(text, size = 300) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}
