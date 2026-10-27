import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

export const atlasPrefix = '/studio-projects/travel'

/** 使用外置数据目录；源码、插件升级和构建均不携带个人记录。 */
export function resolveAtlasRoot(environment = process.env) {
  const configured = environment.STARMAP_PRIVATE_ROOT?.trim()
  if (configured) {
    if (!isAbsolute(configured)) throw new Error('STARMAP_PRIVATE_ROOT 必须为绝对路径。')
    return resolve(configured)
  }
  const value = environment.DSH_HOME?.trim() || join(homedir(), '.dsh')
  const home = value === '~' ? homedir() : /^~[/\\]/.test(value) ? join(homedir(), value.slice(2)) : resolve(value)
  return join(home, 'studio', 'travel-atlas')
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}

function prefixMedia(value) {
  if (typeof value === 'string') return value.startsWith('/media/user/') ? atlasPrefix + value : value
  if (Array.isArray(value)) return value.map(prefixMedia)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, prefixMedia(item)]))
  return value
}

/** 复用上游本地编辑器，宿主接管身份校验、路由、数据加载及卸载。 */
export async function createAtlas(privateRoot) {
  const dataRoot = join(privateRoot, 'data')
  await mkdir(dataRoot, { recursive: true })
  try {
    await writeFile(join(dataRoot, 'travel-map.local.json'), JSON.stringify({ schema_version: 1, privacy_level: 'private-local', records: [] }) + '\n', { flag: 'wx' })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
  // 每次启用使用独立模块实例，避免重载后继承旧目录或已关闭的连接池。
  const moduleUrl = new URL('../upstream/StarMap/01_Web/scripts/local-editor-plugin.mjs', import.meta.url)
  const { travelAtlasLocalEditor } = await import(moduleUrl.href + '?instance=' + randomUUID())
  const editor = travelAtlasLocalEditor({ profile: 'personal', privateRoot })
  let middleware
  editor.configureServer({
    watcher: { add() {}, on() {} },
    moduleGraph: { getModuleById() {} },
    ws: { send() {} },
    middlewares: { use(handler) { middleware = handler } },
  })
  if (!middleware) throw new Error('旅行本地编辑器未注册。')
  const pending = new Set()
  let disposed = false
  return {
    async data() {
      const [privateEditorState, privateMediaCatalog, privateTravelMap] = await Promise.all([
        readJson(join(dataRoot, 'editor-state.local.json')),
        readJson(join(dataRoot, 'user-media.local.json')),
        readJson(join(dataRoot, 'travel-map.local.json')),
      ])
      return { privateEditorState, privateMediaCatalog: prefixMedia(privateMediaCatalog), privateTravelMap }
    },
    async handle(req, res) {
      if (disposed) { res.writeHead(503); res.end(); return }
      const origin = req.headers.origin
      if (origin) {
        let sameOrigin = false
        try { sameOrigin = new URL(origin).origin === 'http://' + req.headers.host }
        catch (error) { /* 无效的来源地址按拒绝处理。 */ }
        if (!sameOrigin) { res.writeHead(403); res.end(); return }
      }
      const originalUrl = req.url
      req.url = originalUrl.slice(atlasPrefix.length)
      const operation = Promise.resolve(middleware(req, res, () => { res.writeHead(404); res.end() }))
      pending.add(operation)
      try { await operation }
      finally { req.url = originalUrl; pending.delete(operation) }
    },
    async dispose() {
      disposed = true
      await Promise.allSettled(pending)
      await editor.closeEditor()
    },
  }
}
