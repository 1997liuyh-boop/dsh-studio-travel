# dsh-studio-travel

[简体中文](README.zh.md)

**Repository name:** `dsh-studio-travel`

**Repository description:** StarMap-based travel studio for recording visited places, routes, albums, and trip timelines.

`dsh-studio-travel` adapts the open-source [StarMap](https://github.com/Aisland-SJL/StarMap) application as an independently installed DSH studio. The DSH worktable supplies the studio list and project container; this package supplies the travel page and its local data integration.

## Features

- Browse a globe and map with countries, cities, saved places, and travel footprints.
- Organize routes with ordered destinations, dates, transport, and notes.
- Keep trip photos, captions, and timeline entries together.
- Configure Cesium ion, Tianditu, and the default map source in the studio settings.
- Store travel data in the configured local studio data directory. Credentials are not written into source files or the plugin package.
- Use the shared DSH session controls; connection failures are reported with a retry action.

## Installation

This repository declares a DSH bundle at `package.json` → `dsh.bundle.patch`. Install with the DSH Desktop plugin manager. Add the control package first, then this exact tagged source:

```text
github:1997liuyh-boop/dsh-studio-library#v0.1.3
github:1997liuyh-boop/dsh-studio-travel#v0.2.6
```

Confirm that the plugin manager lists `dsh-studio-travel` version `0.2.1`, then open the Travel studio. The package requires compatible `dsh-worktable` `^0.6.0` and `dsh-studio-projects` `^0.5.0` packages. In the UI, add them by installing the control package above.

For local development, use Node.js 22 and npm:

```sh
npm install --include=dev --legacy-peer-deps
npm run build
npm run check
```

## Requirements and limitations

The bundled low-resolution map source can work offline. External map providers require network access and their own credentials. Provider availability, quotas, and usage rights are set by those providers. Local albums and travel records are not uploaded to this repository or synchronized automatically between devices. Back up the travel data before clearing the DSH studio data directory.

## Sources and license

Original source: [Aisland-SJL/StarMap](https://github.com/Aisland-SJL/StarMap), commit `17eebdf8f6e942906041f6b1069acba7d559f76e`, MIT. The upstream record and adaptations are listed in [UPSTREAM.json](UPSTREAM.json). This repository's adaptation code is MIT licensed; see [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
