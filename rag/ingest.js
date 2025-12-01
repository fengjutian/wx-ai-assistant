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

export async function ingestBlob(file) {
  let text = "";
  const name = file?.name || "";
  const isPdf = (file?.type || "").includes("pdf") || name.endsWith(".pdf");
  if (isPdf) {
    const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist/build/pdf');
    GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
    const ab = await file.arrayBuffer();
    const pdf = await getDocument({ data: ab }).promise;
    let out = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const strs = content.items.map((i) => String(i.str || ''));
      out += strs.join(' ') + '\n';
    }
    text = out;
  } else {
    text = await file.text();
  }
  const chunks = splitText(text, 300);
  let items = [];
  for (let i = 0; i < chunks.length; i++) {
    const emb = await embedding(chunks[i]);
    items.push({
      id: name + "#" + i,
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
