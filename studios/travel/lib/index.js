// <define:STUDIO_PROJECT>
var define_STUDIO_PROJECT_default = { name: "\u65C5\u884C", icon: "\u2708\uFE0F", description: "StarMap\uFF1A\u5730\u7403\u8DB3\u8FF9\u3001\u56FD\u5BB6\u57CE\u5E02\u3001\u8DEF\u7EBF\u3001\u76F8\u518C\u4E0E\u65C5\u7A0B\u65F6\u95F4\u7EBF" };

// studios/travel/src/index.ts
import { fileURLToPath } from "node:url";
import { createAtlas, resolveAtlasRoot } from "./atlas.mjs";

// studios/travel/src/mapConfig.mjs
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
function createMapConfig(privateRoot) {
  const directory = join(privateRoot, "config");
  const file = join(directory, "map-config.json");
  let writes = Promise.resolve();
  const send = (res, status, body) => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    res.end(JSON.stringify(body));
  };
  async function read() {
    let input;
    try {
      input = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return { source: "local", tiandituToken: "", cesiumIonToken: "" };
      throw new Error("\u5730\u56FE\u914D\u7F6E\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u672C\u673A\u914D\u7F6E\u6587\u4EF6\u3002");
    }
    const token = typeof input?.tiandituToken === "string" ? input.tiandituToken.trim() : "";
    const cesiumToken = typeof input?.cesiumIonToken === "string" ? input.cesiumIonToken.trim() : "";
    if (token && !/^[a-f0-9]{32}$/i.test(token)) throw new Error("\u672C\u673A\u5929\u5730\u56FE\u5BC6\u94A5\u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u914D\u7F6E\u3002");
    if (cesiumToken && (cesiumToken.length > 2048 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(cesiumToken))) throw new Error("\u672C\u673A Cesium Token \u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u914D\u7F6E\u3002");
    const source = input.source === "cesium" && cesiumToken ? "cesium" : input.source === "tianditu" && token ? "tianditu" : "local";
    return { source, tiandituToken: token, cesiumIonToken: cesiumToken };
  }
  function save(input) {
    const operation = writes.then(async () => {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("\u914D\u7F6E\u683C\u5F0F\u65E0\u6548\u3002");
      if (!["local", "tianditu", "cesium"].includes(input.source)) throw new Error("\u8BF7\u9009\u62E9\u672C\u5730\u4F4E\u6E05\u3001\u5929\u5730\u56FE\u6216 Cesium\u3002");
      if (input.tiandituToken !== void 0 && typeof input.tiandituToken !== "string") throw new Error("\u5929\u5730\u56FE\u5BC6\u94A5\u5FC5\u987B\u4E3A\u6587\u672C\u3002");
      if (input.cesiumIonToken !== void 0 && typeof input.cesiumIonToken !== "string") throw new Error("Cesium Token \u5FC5\u987B\u4E3A\u6587\u672C\u3002");
      const previous = await read().catch(() => ({ source: "local", tiandituToken: "", cesiumIonToken: "" }));
      const supplied = input.tiandituToken?.trim() || "";
      const token = input.clear === true || input.clearTianditu === true ? "" : supplied || previous.tiandituToken;
      const cesiumToken = input.clearCesium === true ? "" : input.cesiumIonToken?.trim() || previous.cesiumIonToken;
      if (token && !/^[a-f0-9]{32}$/i.test(token)) throw new Error("\u5929\u5730\u56FE\u5BC6\u94A5\u5E94\u4E3A 32 \u4F4D\u5341\u516D\u8FDB\u5236\u5B57\u7B26\u3002");
      if (cesiumToken && (cesiumToken.length > 2048 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(cesiumToken))) throw new Error("Cesium Token \u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u590D\u5236\u5B8C\u6574\u7684\u8BBF\u95EE\u4EE4\u724C\u3002");
      if (input.source === "tianditu" && !token) throw new Error("\u8BF7\u5148\u586B\u5199\u5929\u5730\u56FE\u5BC6\u94A5\u3002");
      if (input.source === "cesium" && !cesiumToken) throw new Error("\u8BF7\u5148\u586B\u5199 Cesium Token\u3002");
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `map-config-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify({ schemaVersion: 2, source: input.source, tiandituToken: token, cesiumIonToken: cesiumToken }) + "\n", { mode: 384, flag: "wx" });
        await rename(temporary, file);
      } finally {
        await rm(temporary, { force: true });
      }
      return { configured: Boolean(token), tiandituConfigured: Boolean(token), cesiumConfigured: Boolean(cesiumToken), source: input.source };
    });
    writes = operation.catch(() => {
    });
    return operation;
  }
  return {
    async handle(req, res, path) {
      if (path !== "map-config" && path !== "map-config/status") return false;
      try {
        if (req.method === "GET" || req.method === "HEAD") {
          const config = await read();
          const body = path.endsWith("/status") ? { configured: Boolean(config.tiandituToken), tiandituConfigured: Boolean(config.tiandituToken), cesiumConfigured: Boolean(config.cesiumIonToken), source: config.source } : config;
          if (req.method === "HEAD") {
            res.writeHead(200, { "cache-control": "no-store" });
            res.end();
          } else send(res, 200, body);
        } else if (req.method === "POST" && path === "map-config") {
          if (req.headers["x-dsh-travel-config"] !== "1" || req.headers["content-type"]?.split(";")[0] !== "application/json" || req.headers["sec-fetch-site"] === "cross-site") {
            send(res, 403, { error: "\u5730\u56FE\u914D\u7F6E\u8BF7\u6C42\u6765\u6E90\u65E0\u6548\u3002" });
            return true;
          }
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 4096) {
              send(res, 413, { error: "\u5730\u56FE\u914D\u7F6E\u5185\u5BB9\u8FC7\u5927\u3002" });
              return true;
            }
            chunks.push(chunk);
          }
          let input;
          try {
            input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            send(res, 400, { error: "\u5730\u56FE\u914D\u7F6E\u5FC5\u987B\u4E3A JSON\u3002" });
            return true;
          }
          try {
            send(res, 200, await save(input));
          } catch (error) {
            send(res, 400, { error: /^(天地图|Cesium|请|配置)/.test(error.message) ? error.message : "\u5730\u56FE\u914D\u7F6E\u4FDD\u5B58\u5931\u8D25\u3002" });
          }
        } else send(res, 405, { error: "\u8BF7\u6C42\u65B9\u5F0F\u65E0\u6548\u3002" });
      } catch {
        send(res, 500, { error: "\u5730\u56FE\u914D\u7F6E\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u914D\u7F6E\u3002" });
      }
      return true;
    }
  };
}

// studios/travel/src/index.ts
var name = "dsh-studio-travel";
var inject = ["studioProjects"];
async function apply(ctx) {
  const atlas = await createAtlas(resolveAtlasRoot());
  const mapConfig = createMapConfig(resolveAtlasRoot());
  ctx.effect(() => () => atlas.dispose(), "\u65C5\u884C\u7F16\u8F91\u5668");
  ctx.effect(() => ctx.studioProjects.register({ id: "travel", ...define_STUDIO_PROJECT_default, root: fileURLToPath(new URL("../static/", import.meta.url)), async handle(req, res, path) {
    if (await mapConfig.handle(req, res, path)) return true;
    if (path === "data" && ["GET", "HEAD"].includes(req.method ?? "")) {
      const body = JSON.stringify(await atlas.data());
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(req.method === "HEAD" ? void 0 : body);
      return true;
    }
    if (path.startsWith("__travelatlas/editor/") || path.startsWith("media/user/")) {
      await atlas.handle(req, res);
      return true;
    }
    return false;
  } }), "\u65C5\u884C\u9875\u9762");
}
export {
  apply,
  inject,
  name
};
