import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'
import { cp } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const prefix = '/studio-projects/travel'
const source = fileURLToPath(new URL('./upstream/StarMap/01_Web/', import.meta.url))
const mapSettingsComponent = fileURLToPath(new URL('./src/mapSettings.tsx', import.meta.url)).replaceAll('\\', '/')

// 上游插件的资源复制未兼容 Windows 绝对路径和嵌套部署，使用明确的资源目录。
const cesiumAdapter = cesium()
cesiumAdapter.closeBundle = async () => cp(
  fileURLToPath(new URL('../../node_modules/cesium/Build/Cesium/', import.meta.url)),
  fileURLToPath(new URL('./static/cesium/', import.meta.url)),
  { recursive: true },
)

export default defineConfig({
  root: source,
  base: prefix + '/',
  envDir: false,
  define: {
    'import.meta.env.VITE_CESIUM_ION_TOKEN': '""',
    'import.meta.env.VITE_TIANDITU_TOKEN': '""',
    'import.meta.env.VITE_MAP_SOURCE': '"local"',
    'import.meta.env.VITE_TRAVEL_ATLAS_DATA_MODE': '"local"',
  },
  plugins: [
    {
      name: 'harness-travel-adapter',
      enforce: 'pre',
      resolveId(id) {
        if (id === 'virtual:starmap-private-data') return '\0harness-travel-data'
        if (id === 'virtual:starmap-studio-settings') return '\0harness-travel-settings'
      },
      load(id) {
        if (id === '\0harness-travel-settings') return `let mapSettings = { source: 'local', tiandituToken: '', cesiumIonToken: '' };
          try { const response = await fetch('${prefix}/map-config', { cache: 'no-store' }); if (response.ok) mapSettings = await response.json(); } catch {}
          export { mapSettings };`
        if (id !== '\0harness-travel-data') return
        return `const response = await fetch('${prefix}/data', { cache: 'no-store' });
          if (!response.ok) throw new Error('旅行数据读取失败，请检查工作室插件与本地数据。');
          const data = await response.json();
          export const privateEditorState = data.privateEditorState;
          export const privateMediaCatalog = data.privateMediaCatalog;
          export const privateTravelMap = data.privateTravelMap;`
      },
      transform(code, id) {
        if (id.endsWith('/src/data/mapSources.ts')) {
          // 天地图 w 矩阵级别与墨卡托瓦片级别保持一致，避免底图出现偏移。
          return `import { mapSettings as studioMapSettings } from 'virtual:starmap-studio-settings';\n` + code
            .replace("const cesiumIonToken = (import.meta.env.VITE_CESIUM_ION_TOKEN ?? '').trim()", "const cesiumIonToken = (studioMapSettings.cesiumIonToken || '').trim()")
            .replace("const tiandituToken = (import.meta.env.VITE_TIANDITU_TOKEN ?? '').trim()", "const tiandituToken = (studioMapSettings.tiandituToken || '').trim()")
            .replace("const configuredDefault = (import.meta.env.VITE_MAP_SOURCE ?? 'auto').trim().toLowerCase()", "const configuredDefault = studioMapSettings.source || 'local'")
            .replace('const tiandituTileMatrixLabels = Array.from({ length: 18 }, (_, index) => String(index + 1))', 'const tiandituTileMatrixLabels = Array.from({ length: 19 }, (_, index) => String(index))')
            .replace('maximumLevel: 17,', 'minimumLevel: 1,\n    maximumLevel: 18,')
        }
        if (id.endsWith('/src/components/MapSourceSwitcher.tsx')) {
          return `import { MapSettings } from ${JSON.stringify(mapSettingsComponent)};\n` + code
            .replace('const [open, setOpen] = useState(false)', 'const [open, setOpen] = useState(false)\n  const [settingsOpen, setSettingsOpen] = useState(false)')
            .replace('<div ref={shellRef} className="atlas-map-source-switcher">', '<div ref={shellRef} className="atlas-map-source-switcher">\n      <MapSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />')
            .replace('<p>地图图源</p>', '<p>地图图源</p><button type="button" role="menuitem" onClick={() => { setOpen(false); setSettingsOpen(true) }}>地图服务配置</button>')
        }
        if (id.endsWith('/src/data/localEditorApi.ts')) return code.replaceAll('/__travelatlas/editor/', prefix + '/__travelatlas/editor/')
        if (id.endsWith('/src/data/editorState.ts')) {
          return code.replace("import.meta.env.DEV && import.meta.env.MODE === 'personal'", 'true')
        }
      },
    },
    react(), tailwind(), cesiumAdapter,
  ],
  build: {
    target: 'esnext',
    outDir: fileURLToPath(new URL('./static/', import.meta.url)),
    emptyOutDir: true,
  },
})
