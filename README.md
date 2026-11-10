# dsh-studio-travel

StarMap：地球足迹、国家城市、路线、相册与旅程时间线

本仓库根目录是可安装的 DSH 插件，版本 0.2.0。在插件市场添加本仓库 Git URL，安装后启用。先安装并启用 [工作室容器与共享运行时](https://github.com/1997liuyh-boop/dsh-studio-library)，再启用本插件。

Git 安装使用已提交的 lib/ 与静态资源。开发时执行 npm install --include=dev --legacy-peer-deps、npm run build、npm run check；构建只使用本仓库源码与公开依赖，不引用相邻工作库。

## 功能与上游说明


StarMap：地球足迹、国家城市、路线、相册与旅程时间线。本插件有独立的页面源码、宿主注册、构建与发布版本。

从库根目录构建：`node scripts/build.mjs travel`。依赖 dsh-worktable ^0.6.0 与 dsh-studio-projects ^0.5.0。

来源及锁定提交见 [UPSTREAM.json](UPSTREAM.json)。

图源菜单提供“地图服务配置”，可配置 Cesium ion Token 和天地图浏览器端应用密钥。支持保存并应用、留空保留、分别清除，以及选择默认图源。天地图影像和中文注记使用同一密钥；输入框默认掩码，已保存的凭据不回填。

配置保存到外置旅行数据目录的 `config/map-config.json`，不进入源码与插件包。运行时加载配置，修改后刷新页面即可，无需重新构建；本地低清图源仍可直接使用。工作室运行时统一验证所有者身份，保存接口另外要求 JSON 和专用请求头。
