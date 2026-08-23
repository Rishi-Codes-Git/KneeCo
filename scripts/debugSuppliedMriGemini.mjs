import { readFile, writeFile } from "node:fs/promises";

const imagePath = "/home/ubuntu/upload/WhatsAppImage2026-08-23at3.01.09AM.jpeg";
const data = (await readFile(imagePath)).toString("base64");
const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
  method: "POST",
  headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
  body: JSON.stringify({
    contents: [{ parts: [{ inlineData: { mimeType: "image/jpeg", data } }, { text: "Is this a readable knee MRI image? Reply with concise JSON containing only studyType and a short note. Do not diagnose." }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  }),
  signal: AbortSignal.timeout(60_000),
});
const text = await response.text();
await writeFile("/home/ubuntu/nexora-knee-ai/.gemini-supplied-mri-debug.json", JSON.stringify({ status: response.status, body: text }));
console.log(JSON.stringify({ status: response.status, saved: true }));
