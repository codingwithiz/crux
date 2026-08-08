import { test, expect } from "@playwright/test";
import { cleanSecret } from "../lib/env";

// A credential ends up in an HTTP header, and headers are ByteStrings. One
// invisible character — a BOM from a UTF-8 file, a zero-width space copied off
// a web page — makes the provider SDK throw "Cannot convert argument to a
// ByteString because the character at index N has a value of 65279", which
// surfaces to users as a model outage rather than a bad dashboard paste.
test("strips a leading BOM", () => {
  expect(cleanSecret("﻿sk-proj-abc123")).toBe("sk-proj-abc123");
});

test("strips zero-width spaces and stray newlines", () => {
  expect(cleanSecret("sk-​proj​-abc\n")).toBe("sk-proj-abc");
});

test("trims surrounding whitespace", () => {
  expect(cleanSecret("  sk-proj-abc  ")).toBe("sk-proj-abc");
});

test("leaves a clean key untouched", () => {
  expect(cleanSecret("sk-proj-abc123")).toBe("sk-proj-abc123");
});

// modelReady() gates on this, so a variable holding only invisible characters
// must read as "not configured" rather than passing the gate and failing later.
test("a value of only invisible characters is undefined, not empty string", () => {
  expect(cleanSecret("﻿​")).toBeUndefined();
  expect(cleanSecret("")).toBeUndefined();
  expect(cleanSecret(undefined)).toBeUndefined();
});
