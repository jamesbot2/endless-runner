# Endless Runner

Desktop-first Three.js endless runner built with Electron, Node.js, WebSocket PVP, account login, cloud saves, character unlocks, and an admin backend.

[![Desktop Build](https://github.com/jamesbot2/endless-runner/actions/workflows/desktop-build.yml/badge.svg)](https://github.com/jamesbot2/endless-runner/actions/workflows/desktop-build.yml)
[![Release Desktop](https://github.com/jamesbot2/endless-runner/actions/workflows/desktop-release.yml/badge.svg)](https://github.com/jamesbot2/endless-runner/actions/workflows/desktop-release.yml)
[![Release](https://img.shields.io/github/v/release/jamesbot2/endless-runner)](https://github.com/jamesbot2/endless-runner/releases)

## English

### Overview

Endless Runner is a Windows desktop game packaged with Electron. The game runtime is a modular IIFE-based Three.js r128 codebase, bundled into `game.js` for the Electron renderer. Online services are handled by two lightweight Node.js servers:

- Account server: HTTP API on port `3000`
- PVP server: WebSocket server on port `3001`

The default production API endpoint is:

```text
http://api.damnatiox.com
```

### Features

- Endless three-lane runner gameplay with jumping, rolling, obstacles, police chase, speed scaling, and changing environments.
- Desktop Electron client with local storage fallback and offline play.
- Account system with registration, login, captcha, email verification, cloud save/load, and leaderboard.
- PVP rooms with up to 3 players, ready/start flow, real-time player state sync, death spectating, and match ranking.
- Character selection and unlock system.
- Abilities: double jump, jetpack, roof walk, and Homelander easter egg.
- Normal-mode gun pickups, disabled in PVP.
- Admin panel for managing users, coins, credits, characters, abilities, runs, verification state, and PVP/audit data.
- Windows portable build through `win-unpacked`.

### Download

Prebuilt Windows builds are published in:

[GitHub Releases](https://github.com/jamesbot2/endless-runner/releases)

Download the latest Windows zip, extract it, and run:

```text
Endless Runner.exe
```

Do not run only the `.exe` after copying it out of the folder. The whole `win-unpacked` folder is required because Electron needs its `resources`, DLLs, and runtime files.

### Local Development

Requirements:

- Node.js 20+ recommended
- npm
- Git
- Windows for normal Electron desktop testing

Install dependencies:

```bash
git clone https://github.com/jamesbot2/endless-runner.git
cd endless-runner
npm install
cd apps/desktop
npm install
cd ../..
```

Build the game bundle:

```bash
npm run build:game
```

Start local servers:

```bash
npm run server:account
npm run server:pvp
```

Start Electron in development mode:

```bash
npm run desktop:dev
```

### Build and Package

```bash
npm run build:game
npm run desktop:build
npm run desktop:pack
```

Output:

```text
apps/desktop/release/win-unpacked/
```

`desktop:pack` creates a portable Windows folder. It skips `winCodeSign` to avoid Windows symlink permission issues, then applies the desktop icon to `Endless Runner.exe` with a post-pack script.

For a full installer:

```bash
npm run desktop:dist
```

The installer path is generated under:

```text
apps/desktop/release/
```

### Release Zip

After `npm run desktop:pack`, zip the full `win-unpacked` folder:

```powershell
Compress-Archive -Path apps\desktop\release\win-unpacked\* -DestinationPath Endless-Runner-win-unpacked.zip -Force
```

Upload the zip to GitHub Releases.

### Tests

```bash
npm run desktop:test:smoke
npm run pvp:smoke
```

For headless Linux/GCP environments, use:

```bash
npm run desktop:test:smoke:headless
```

Electron GUI tests on a server usually require Xvfb.

### Server Deployment

Quick start:

```bash
node server/account-server.js
node server/pvp-server.js
```

Systemd service files are included:

```text
server/endless-runner-account.service
server/endless-runner-pvp.service
```

Typical production ports:

| Service | Port | Protocol |
|---|---:|---|
| Account API | 3000 | HTTP |
| PVP | 3001 | WebSocket |

If using Nginx or Cloudflare, proxy the account API to `/` and the PVP WebSocket route to `/pvp`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ENDLESS_RUNNER_API_BASE_URL` | `http://api.damnatiox.com` | Account API base URL |
| `SUBWAY_API_BASE_URL` | none | Legacy alias for older builds |
| `SMTP_USER` | none | SMTP account for verification email |
| `SMTP_PASS` | none | SMTP password or authorization code |

### Account API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | API health/status |
| `/api/captcha` | GET | Captcha SVG |
| `/api/register` | POST | Register account |
| `/api/verify-code` | POST | Verify email code |
| `/api/login` | POST | Login and return token |
| `/api/load` | GET | Load cloud save |
| `/api/save` | POST | Save cloud data |
| `/api/leaderboard` | GET | Leaderboard |
| `/admin` | GET | Admin panel |

Default admin credentials are currently:

```text
admin / admin123
```

Change them before any public production deployment.

### PVP Protocol

Default WebSocket route:

```text
ws://<host>:3001/pvp
```

When behind a domain/proxy:

```text
ws://api.damnatiox.com/pvp
```

Core message flow:

| Client to Server | Server to Client | Purpose |
|---|---|---|
| `hello` | `hello:ok` | Authenticate socket |
| `room:create` | `room:update` | Create room |
| `room:join` | `room:update` | Join room |
| `room:ready` | `room:update` | Toggle ready |
| `room:start` | `match:start` | Start match |
| `match:snapshot` | `match:snapshot` | Sync live player state |
| `match:dead` | `match:finish` | Death and final ranking |

### Project Structure

```text
.
|-- apps/desktop/              Electron desktop client
|   |-- electron/              Main and preload process
|   |-- src/                   Renderer, config, auth bridge, legacy assets
|   |-- tests/                 Electron smoke tests
|   |-- build/                 App icons
|   `-- package.json           Desktop package scripts
|-- game/                      Modular game source files
|-- game.js                    Generated browser/Electron game bundle
|-- server/                    Account API, admin panel, PVP server
|-- models/                    Source 3D models
|-- audio/                     Audio assets
|-- tools/                     Asset conversion and helper scripts
|-- docs/                      Release and deployment docs
|-- package.json               Root scripts
`-- .github/workflows/         CI and release workflows
```

### License

Private project. All rights reserved.

---

## 中文

### 项目简介

Endless Runner 是一个桌面端无尽跑酷游戏。客户端使用 Electron 打包，游戏画面基于 Three.js r128，核心游戏代码仍然保留早期的 IIFE 模块风格，并通过 `game.js` 作为最终运行包加载。

线上服务由两个 Node.js 服务组成：

- 账号服务：HTTP API，默认端口 `3000`
- PVP 服务：WebSocket，默认端口 `3001`

当前默认生产接口地址是：

```text
http://api.damnatiox.com
```

### 主要功能

- 三车道无尽跑酷：跳跃、蹲滚、障碍物、警察追逐、速度倍率、场景切换。
- Electron 桌面端：支持本地存档、离线模式、窗口/全屏控制。
- 账号系统：注册、登录、验证码、邮箱验证、云存档、排行榜。
- PVP 模式：最多 3 人房间、准备机制、房主开始、实时状态同步、死亡观战、赛后排名。
- 角色系统：角色预览、选择、购买和解锁。
- 技能系统：二段跳、喷气背包、车顶行走，以及 Homelander 彩蛋。
- 枪械道具：普通模式可拾取，PVP 模式禁用。
- 后台管理：管理用户、金币、credit、角色、技能、最高距离、runs、验证状态、PVP 和审计数据。
- Windows 便携版发布：通过 `win-unpacked` 文件夹运行，无需安装。

### 下载和运行

正式版本在 GitHub Releases：

[GitHub Releases](https://github.com/jamesbot2/endless-runner/releases)

下载最新 Windows zip 后，解压整个文件夹，然后运行：

```text
Endless Runner.exe
```

注意：不要只把 `.exe` 单独复制出来运行。Electron 程序需要同目录下的 `resources`、DLL 和运行时文件，必须保留整个解压后的文件夹。

### 本地开发

建议环境：

- Node.js 20 或更高版本
- npm
- Git
- Windows 桌面环境

安装依赖：

```bash
git clone https://github.com/jamesbot2/endless-runner.git
cd endless-runner
npm install
cd apps/desktop
npm install
cd ../..
```

构建游戏主包：

```bash
npm run build:game
```

启动本地账号服务和 PVP 服务：

```bash
npm run server:account
npm run server:pvp
```

启动 Electron 开发模式：

```bash
npm run desktop:dev
```

### 打包

常用打包流程：

```bash
npm run build:game
npm run desktop:build
npm run desktop:pack
```

输出目录：

```text
apps/desktop/release/win-unpacked/
```

`desktop:pack` 会生成 Windows 便携版目录。当前打包流程会跳过 `winCodeSign`，避免 Windows symlink 权限问题，然后通过 `postpack` 脚本给 `Endless Runner.exe` 写入应用图标。

如果要生成安装器：

```bash
npm run desktop:dist
```

安装器会输出到：

```text
apps/desktop/release/
```

### 生成 Release 压缩包

运行 `npm run desktop:pack` 后，把整个 `win-unpacked` 目录压缩：

```powershell
Compress-Archive -Path apps\desktop\release\win-unpacked\* -DestinationPath Endless-Runner-win-unpacked.zip -Force
```

然后把 zip 上传到 GitHub Releases。

### 测试

桌面端 smoke test：

```bash
npm run desktop:test:smoke
```

PVP 集成测试：

```bash
npm run pvp:smoke
```

如果是在 GCP/Linux 无桌面环境测试 Electron，需要 Xvfb：

```bash
npm run desktop:test:smoke:headless
```

### 服务器部署

快速启动：

```bash
node server/account-server.js
node server/pvp-server.js
```

仓库内包含 systemd 服务文件：

```text
server/endless-runner-account.service
server/endless-runner-pvp.service
```

常用端口：

| 服务 | 端口 | 协议 |
|---|---:|---|
| 账号 API | 3000 | HTTP |
| PVP | 3001 | WebSocket |

如果通过 Nginx 或 Cloudflare 代理，建议：

- 账号 API 代理到 `/`
- PVP WebSocket 代理到 `/pvp`

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ENDLESS_RUNNER_API_BASE_URL` | `http://api.damnatiox.com` | 账号 API 地址 |
| `SUBWAY_API_BASE_URL` | 无 | 旧版本兼容别名 |
| `SMTP_USER` | 无 | 发送邮箱验证码的 SMTP 账号 |
| `SMTP_PASS` | 无 | SMTP 密码或授权码 |

### 账号和后台

常用接口：

| 接口 | 方法 | 说明 |
|---|---|---|
| `/` | GET | API 状态 |
| `/api/captcha` | GET | SVG 验证码 |
| `/api/register` | POST | 注册账号 |
| `/api/verify-code` | POST | 验证邮箱验证码 |
| `/api/login` | POST | 登录并返回 token |
| `/api/load` | GET | 读取云存档 |
| `/api/save` | POST | 保存云存档 |
| `/api/leaderboard` | GET | 排行榜 |
| `/admin` | GET | 后台管理页面 |

当前默认后台账号：

```text
admin / admin123
```

公开部署前建议修改默认后台账号密码。

### PVP 通信

直连 WebSocket：

```text
ws://<host>:3001/pvp
```

通过域名和反向代理时：

```text
ws://api.damnatiox.com/pvp
```

核心流程：

| 客户端发送 | 服务端返回 | 用途 |
|---|---|---|
| `hello` | `hello:ok` | 鉴权 |
| `room:create` | `room:update` | 创建房间 |
| `room:join` | `room:update` | 加入房间 |
| `room:ready` | `room:update` | 切换准备状态 |
| `room:start` | `match:start` | 开始比赛 |
| `match:snapshot` | `match:snapshot` | 同步实时玩家状态 |
| `match:dead` | `match:finish` | 死亡和最终排名 |

### 项目结构

```text
.
|-- apps/desktop/              Electron 桌面端
|   |-- electron/              Electron main/preload
|   |-- src/                   渲染层、配置、登录桥接、旧游戏资源
|   |-- tests/                 Electron smoke test
|   |-- build/                 应用图标
|   `-- package.json           桌面端脚本
|-- game/                      模块化游戏源码
|-- game.js                    构建后的游戏总包
|-- server/                    账号 API、后台、PVP 服务
|-- models/                    3D 模型资源
|-- audio/                     音频资源
|-- tools/                     资源转换和辅助脚本
|-- docs/                      发布和部署文档
|-- package.json               根目录脚本
`-- .github/workflows/         CI 和发布流程
```

### 许可证

私人项目，保留所有权利。
