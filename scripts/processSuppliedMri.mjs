import { readFile } from "node:fs/promises";
import { appRouter } from "../server/routers.ts";

const sourcePath = "/home/ubuntu/upload/WhatsAppImage2026-08-23at3.01.09AM.jpeg";
const bytes = await readFile(sourcePath);
const caller = appRouter.createCaller({});

const result = await caller.cases.create({
  patientId: "F002",
  patientName: "Patient F002",
  age: 59,
  sex: "female",
  oaStatus: "unknown",
  lifestyleContext: undefined,
  kneeSide: "unknown",
  scan: {
    fileName: "knee-mri-f002.jpeg",
    contentType: "image/jpeg",
    sizeBytes: bytes.length,
    contentBase64: bytes.toString("base64"),
  },
});

console.log(JSON.stringify(result));
process.exit(0);
