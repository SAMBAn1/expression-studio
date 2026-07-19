import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Expression Studio application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Collections Expression Studio<\/title>/i);
  assert.match(html, /Calculated fields/i);
  assert.match(html, /New calculated field/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships the builder, data schema, and product story", async () => {
  const [page, data, story, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/expression-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/story/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /ExpressionBuilder/);
  assert.match(page, /CalculatedFieldsLibrary/);
  assert.match(page, /HowToDrawer/);
  assert.match(page, /UploadModal/);
  assert.match(page, /Add OR group/);
  assert.match(page, /operatorsByKind/);
  assert.match(page, /function-ready/);
  assert.match(data, /inferResultType/);
  assert.match(data, /seedExpressions/);
  assert.match(data, /sameLevelMathFunctionKeys/);
  assert.match(data, /conditionGroups/);
  assert.match(data, /DIFFERENCE/);
  assert.match(data, /number: Array\.from\(\{ length: 10 \}/);
  assert.match(data, /text: Array\.from\(\{ length: 10 \}/);
  assert.match(data, /date: Array\.from\(\{ length: 10 \}/);
  assert.match(story, /A simple SUMIF should not require a data journey/);
  assert.match(story, /Custom code/);
  assert.match(story, /StoryMotion/);
  assert.match(layout, /openGraph/);
  assert.match(packageJson, /lucide-react/);
});
