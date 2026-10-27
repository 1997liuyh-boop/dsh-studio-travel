import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/** 图源凭据只保存在外置目录，运行时由已认证的工作室页面读取。 */
export function createMapConfig(privateRoot) {
  const directory = join(privateRoot, 'config')
  const file = join(directory, 'map-config.json')
  let writes = Promise.resolve()
  const send = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
    res.end(JSON.stringify(body))
  }

  async function read() {
    let input
    try { input = JSON.parse(await readFile(file, 'utf8')) }
    catch (error) {
      if (error.code === 'ENOENT') return { source: 'local', tiandituToken: '', cesiumIonToken: '' }
      throw new Error('地图配置读取失败，请检查本机配置文件。')
    }
    const token = typeof input?.tiandituToken === 'string' ? input.tiandituToken.trim() : ''
    const cesiumToken = typeof input?.cesiumIonToken === 'string' ? input.cesiumIonToken.trim() : ''
    if (token && !/^[a-f0-9]{32}$/i.test(token)) throw new Error('本机天地图密钥格式无效，请重新配置。')
    if (cesiumToken && (cesiumToken.length > 2048 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(cesiumToken))) throw new Error('本机 Cesium Token 格式无效，请重新配置。')
    const source = input.source === 'cesium' && cesiumToken ? 'cesium' : input.source === 'tianditu' && token ? 'tianditu' : 'local'
    return { source, tiandituToken: token, cesiumIonToken: cesiumToken }
  }

  function save(input) {
    const operation = writes.then(async () => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('配置格式无效。')
      if (!['local', 'tianditu', 'cesium'].includes(input.source)) throw new Error('请选择本地低清、天地图或 Cesium。')
      if (input.tiandituToken !== undefined && typeof input.tiandituToken !== 'string') throw new Error('天地图密钥必须为文本。')
      if (input.cesiumIonToken !== undefined && typeof input.cesiumIonToken !== 'string') throw new Error('Cesium Token 必须为文本。')
      const previous = await read().catch(() => ({ source: 'local', tiandituToken: '', cesiumIonToken: '' }))
      const supplied = input.tiandituToken?.trim() || ''
      const token = input.clear === true || input.clearTianditu === true ? '' : supplied || previous.tiandituToken
      const cesiumToken = input.clearCesium === true ? '' : input.cesiumIonToken?.trim() || previous.cesiumIonToken
      if (token && !/^[a-f0-9]{32}$/i.test(token)) throw new Error('天地图密钥应为 32 位十六进制字符。')
      if (cesiumToken && (cesiumToken.length > 2048 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(cesiumToken))) throw new Error('Cesium Token 格式无效，请复制完整的访问令牌。')
      if (input.source === 'tianditu' && !token) throw new Error('请先填写天地图密钥。')
      if (input.source === 'cesium' && !cesiumToken) throw new Error('请先填写 Cesium Token。')
      await mkdir(directory, { recursive: true })
      const temporary = join(directory, `map-config-${randomUUID()}.tmp`)
      try {
        await writeFile(temporary, JSON.stringify({ schemaVersion: 2, source: input.source, tiandituToken: token, cesiumIonToken: cesiumToken }) + '\n', { mode: 0o600, flag: 'wx' })
        await rename(temporary, file)
      } finally { await rm(temporary, { force: true }) }
      return { configured: Boolean(token), tiandituConfigured: Boolean(token), cesiumConfigured: Boolean(cesiumToken), source: input.source }
    })
    writes = operation.catch(() => {})
    return operation
  }

  return {
    async handle(req, res, path) {
      if (path !== 'map-config' && path !== 'map-config/status') return false
      try {
        if (req.method === 'GET' || req.method === 'HEAD') {
          const config = await read()
          const body = path.endsWith('/status') ? { configured: Boolean(config.tiandituToken), tiandituConfigured: Boolean(config.tiandituToken), cesiumConfigured: Boolean(config.cesiumIonToken), source: config.source } : config
          if (req.method === 'HEAD') { res.writeHead(200, { 'cache-control': 'no-store' }); res.end() }
          else send(res, 200, body)
        } else if (req.method === 'POST' && path === 'map-config') {
          // 自定义请求头阻止跨站表单写入；所有者身份由工作室运行时统一校验。
          if (req.headers['x-dsh-travel-config'] !== '1' || req.headers['content-type']?.split(';')[0] !== 'application/json' || req.headers['sec-fetch-site'] === 'cross-site') {
            send(res, 403, { error: '地图配置请求来源无效。' }); return true
          }
          const chunks = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 4096) { send(res, 413, { error: '地图配置内容过大。' }); return true }
            chunks.push(chunk)
          }
          let input
          try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
          catch { send(res, 400, { error: '地图配置必须为 JSON。' }); return true }
          try { send(res, 200, await save(input)) }
          catch (error) { send(res, 400, { error: /^(天地图|Cesium|请|配置)/.test(error.message) ? error.message : '地图配置保存失败。' }) }
        } else send(res, 405, { error: '请求方式无效。' })
      } catch { send(res, 500, { error: '地图配置读取失败，请重新配置。' }) }
      return true
    },
  }
}
