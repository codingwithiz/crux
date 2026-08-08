import { test, expect } from "@playwright/test";
import { isPublicHttpUrl } from "../lib/extract";

// `sourceUrl` arrives from the browser and this server fetches it, so anything
// that reaches a private address is server-side request forgery. These are the
// payloads that matter, not a general URL-parsing exercise.
const BLOCKED = [
  "http://169.254.169.254/latest/meta-data/", // cloud instance metadata
  "https://169.254.169.254/",
  "http://localhost:11434/v1/chat/completions", // the local model endpoint
  "https://localhost/",
  "http://127.0.0.1/",
  "https://127.0.0.1:443/",
  "http://10.0.0.5/",
  "http://192.168.1.1/",
  "http://172.16.0.1/",
  "http://172.31.255.255/",
  "http://0.0.0.0/",
  "https://redis.internal/",
  "https://db.local/",
  "https://example.com:8080/", // non-web port = internal service
  "file:///etc/passwd",
  "gopher://example.com/",
  "not a url",
];

for (const url of BLOCKED) {
  test(`rejects ${url}`, () => {
    expect(isPublicHttpUrl(url)).toBe(false);
  });
}

const ALLOWED = [
  "https://example.com/article",
  "https://news.ycombinator.com/item?id=1",
  "https://example.com:443/x",
  "https://172.32.0.1/", // just outside the private 172.16-31 range
  "https://11.0.0.1/",
];

for (const url of ALLOWED) {
  test(`allows ${url}`, () => {
    expect(isPublicHttpUrl(url)).toBe(true);
  });
}
