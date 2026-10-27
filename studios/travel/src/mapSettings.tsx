import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import './mapSettings.css'

interface MapSettingsProps { open: boolean; onClose: () => void }
type MapStatus = { tiandituConfigured: boolean; cesiumConfigured: boolean; source: 'local' | 'tianditu' | 'cesium' }
const endpoint = '/studio-projects/travel/map-config'

/** 配置弹窗只读取是否配置，输入框从不回填已保存的密钥。 */
export function MapSettings({ open, onClose }: MapSettingsProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [token, setToken] = useState('')
  const [cesiumToken, setCesiumToken] = useState('')
  const [source, setSource] = useState<MapStatus['source']>('tianditu')
  const [configured, setConfigured] = useState(false)
  const [cesiumConfigured, setCesiumConfigured] = useState(false)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) { dialog.current?.close(); setToken(''); setCesiumToken(''); return }
    dialog.current?.showModal()
    const controller = new AbortController()
    setLoading(true); setMessage('')
    void fetch(endpoint + '/status', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('读取失败')
      const status: MapStatus = await response.json()
      if (controller.signal.aborted) return
      setConfigured(status.tiandituConfigured)
      setCesiumConfigured(status.cesiumConfigured)
      setSource(status.source)
    }).catch(() => { if (!controller.signal.aborted) setMessage('本机地图配置读取失败，可填写密钥后重新保存。') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [open])

  async function save(event: FormEvent, clear?: 'cesium' | 'tianditu') {
    event.preventDefault()
    if (pending || loading) return
    setPending(true); setMessage('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-travel-config': '1' },
        body: JSON.stringify({ tiandituToken: clear ? undefined : token.trim(), cesiumIonToken: clear ? undefined : cesiumToken.trim(),
          source: clear === source ? 'local' : source, clearCesium: clear === 'cesium', clearTianditu: clear === 'tianditu' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '保存失败，请重试。')
      setToken('')
      setCesiumToken('')
      try { localStorage.setItem('starmap:map-source', result.source) } catch { /* 存储不可用时仍使用本机默认图源。 */ }
      location.reload()
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败，请重试。'); setPending(false) }
  }

  return createPortal(<dialog ref={dialog} className="studio-map-dialog" aria-labelledby="studio-map-title"
    onCancel={event => { event.preventDefault(); if (!pending) onClose() }}
    onClick={event => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <form onSubmit={event => { void save(event) }} className="studio-map-form">
      <div className="studio-map-heading"><h2 id="studio-map-title">地图服务配置</h2><button type="button" aria-label="关闭地图配置" disabled={pending} onClick={onClose}>×</button></div>
      <p>凭据保存在本机。留空保存会保留现有值，已保存的凭据不回填。</p>
      <p role="status">{loading ? '正在读取配置…' : `Cesium：${cesiumConfigured ? '已配置' : '未配置'} · 天地图：${configured ? '已配置' : '未配置'}`}</p>
      <label>Cesium ion Token<input name="cesiumIonToken" type="password" autoComplete="new-password" maxLength={2048} disabled={pending || loading}
        value={cesiumToken} onChange={event => setCesiumToken(event.target.value)} placeholder={cesiumConfigured ? '留空保留现有 Token' : '输入 Cesium ion 访问令牌'} /></label>
      <label>天地图应用密钥<input name="tiandituToken" type="password" autoComplete="new-password" maxLength={32} disabled={pending || loading}
        value={token} onChange={event => setToken(event.target.value)} placeholder={configured ? '留空保留现有密钥' : '输入 32 位应用密钥'} /></label>
      <label>默认图源<select value={source} disabled={pending || loading} onChange={event => setSource(event.target.value === 'cesium' ? 'cesium' : event.target.value === 'tianditu' ? 'tianditu' : 'local')}>
        <option value="cesium">Cesium（全球影像）</option><option value="tianditu">天地图（影像与中文标注）</option><option value="local">本地低清（无需网络）</option>
      </select></label>
      {message && <p role="alert">{message}</p>}
      <div className="studio-map-actions"><button type="button" disabled={!cesiumConfigured || pending || loading} onClick={event => { void save(event, 'cesium') }}>清除 Cesium Token</button>
        <button type="button" disabled={!configured || pending || loading} onClick={event => { void save(event, 'tianditu') }}>清除天地图密钥</button>
        <button type="submit" disabled={pending || loading}>{pending ? '正在保存…' : '保存并应用'}</button></div>
    </form>
  </dialog>, document.body)
}
