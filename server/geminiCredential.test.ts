import { expect, test } from "vitest";

test.runIf(Boolean(process.env.GEMINI_API_KEY))("Gemini server credential can access the models endpoint", async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  expect(apiKey, "GEMINI_API_KEY must be configured server-side").toBeTruthy();

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": apiKey! },
    signal: AbortSignal.timeout(10_000),
  });

  expect(response.status, "Gemini models endpoint must accept the configured server credential").toBe(200);
});
