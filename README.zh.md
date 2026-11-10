# dsh-studio-travel

[English](README.md)

**仓库名称：** $n\n\n**仓库描述：**基于 StarMap 的旅行工作室，用于记录旅行足迹、地点、路线、相册和旅程时间线。

`dsh-studio-travel` 将开源 [StarMap](https://github.com/Aisland-SJL/StarMap) 适配为独立安装的 DSH 工作室。DSH 工作台提供工作室列表和项目容器；本插件提供旅行页面及本地数据接入。

## 功能与特性

- 浏览地球和地图，查看国家、城市、已保存地点和旅行足迹。
- 按顺序整理路线，记录地点、日期、交通方式和备注。
- 将旅行照片、说明和旅程时间线放在一起管理。
- 在工作室设置中配置 Cesium ion、天地图和默认地图源。
- 将旅行数据保存在配置的本地工作室数据目录；凭据不会写入源码或插件包。
- 使用 DSH 共享会话控制；连接失败会显示原因和重试入口。

## 安装

本仓库在 `package.json` 的 `dsh.bundle.patch` 中声明 DSH 插件包。请使用 DSH Desktop 插件管理器，先添加控制包，再添加以下固定版本来源：

```text
github:1997liuyh-boop/dsh-studio-library#v0.1.3
github:1997liuyh-boop/dsh-studio-travel#v0.2.1
```

确认插件管理器显示 `dsh-studio-travel` 版本 `0.2.1`，然后打开“旅行”工作室。本插件要求兼容的 `dsh-worktable ^0.6.0` 和 `dsh-studio-projects ^0.5.0`；通过先安装上面的控制包添加这些依赖。

本地开发需要 Node.js 22 和 npm：

```sh
npm install --include=dev --legacy-peer-deps
npm run build
npm run check
```

## 要求与限制

内置低清地图源可离线使用。外部地图服务需要网络及各自的凭据。服务可用性、配额和使用权由服务提供方决定。旅行记录和相册不会上传到本仓库，也不会在设备间自动同步。清理 DSH 工作室数据目录前，请先备份旅行数据。

## 来源与许可

上游源码来自 [Aisland-SJL/StarMap](https://github.com/Aisland-SJL/StarMap)，固定提交为 `17eebdf8f6e942906041f6b1069acba7d559f76e`，采用 MIT 许可。上游记录和适配内容见 [UPSTREAM.json](UPSTREAM.json)。本仓库适配代码采用 MIT 许可，详见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
