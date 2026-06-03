# 🏃 Subway Surfer - Neo Edition

> 3D 无限跑酷网页游戏 / 3D endless runner web game  
> Three.js + Node.js 账号系统  
> Made by Neo 🤖 for James

---

## 🌐 在线游玩 / Play Online

| 链接 | 说明 |
|---|---|
| **http://35.212.200.85:3000/** | 🏆 主服务器（推荐）— 登录/游戏/后台一体 |
| **http://35.212.200.85:3000/admin** | 🔧 后台管理面板 |
| **http://35.212.200.85:3000/verify-codes** | 🔑 查看注册验证码 |
| **https://jamesbot2.github.io/subway-surfer/** | 🌍 GitHub Pages（可能不是最新） |
| **http://35.212.200.85:8080/** | 🔄 自动跳转到 :3000 |

> ⚠️ 服务器 IP `35.212.200.85` 可能会变，如果访问不了请联系 Neo

---

## 📁 项目结构

```
subway-surfer/
├── game/                     # 游戏模块（模块化拆分）
│   ├── constants.js          # 游戏常量
│   ├── state.js              # 游戏状态对象
│   ├── audio.js              # 音效 + 背景音乐系统
│   ├── textures.js           # 纹理生成
│   ├── scene.js              # Three.js 场景/相机/灯光/渲染器
│   ├── player.js             # 玩家模型
│   ├── track.js              # 轨道系统
│   ├── buildings.js          # 场景建筑 + 主题系统 + 障碍物生成
│   ├── obstacles.js          # 障碍物类型（火车/路障/无人机/闸门）
│   ├── coins.js              # 金币系统
│   ├── particles.js          # 粒子效果
│   ├── collision.js          # 碰撞检测 + 赛博模式
│   ├── ui.js                 # UI 系统（菜单/HUD/商店/Settings）
│   ├── homelander.js         # 祖国人彩蛋
│   ├── controls.js           # 键盘/触控/手机按钮控制
│   ├── police.js             # 🚔 警察追踪系统
│   ├── account.js            # 账号系统（登录/注册/Profile/存档）
│   └── main.js               # 主游戏循环 + 初始化
├── server/
│   ├── account-server.js     # 账号服务器（注册/登录/存档/Admin）
│   ├── static-server.js      # 静态文件服务器
│   └── data/users.json       # 用户数据库
├── signin.html               # 独立登录/注册页面
├── game.html                 # 游戏页面（含登录检查）
├── index.html                # 入口（重定向到 signin）
├── style.css                 # 样式
└── start-servers.sh          # 一键启动双服务器
```

---

## 🎮 游戏机制

### 操作 Controls
| 操作 | 桌面 | 手机 |
|---|---|---|
| 左移 | ← / A | 左滑 / ◀ |
| 右移 | → / D | 右滑 / ▶ |
| 跳跃 | ↑ / W / Space | 上滑 / ▲ |
| 翻滚 | ↓ / S | 下滑 / ▼ |
| 暂停 | Esc / P | ⏸ |
| FPV | 👁 按钮 | 👁 按钮 |
| 控制台 | ` | >_ 按钮 |
| 菜单 | M | — |

### 障碍物
- 🚂 **火车** — 跳跃或登上车顶
- 🧱 ~~路障~~（已移除，太难躲）
- 🚪 **钻底闸门** — 翻滚通过
- 🚧 **全车道路障** — 跳跃通过
- 🚁 **低空无人机** — 跳跃或翻滚

### 商店能力
| 能力 | 价格 | 效果 |
|---|---|---|
| 🦘 **二段跳** | 10,000 credits | 空中再来一次跳跃 |
| 🚀 **喷气背包** | 50,000 credits | 空中悬浮30s，冷却15s |
| 🏃 **屋顶行走** | 100,000 credits | 障碍物顶行走，侧面撞到才死 |

### 500px 赛博模式
速度达到 48× 时，全场景变为黑白未来科技风。

---

## 🔐 账号系统

### 功能
- **注册**：用户名 + 邮箱 + 密码 + 图形验证码
- **登录**：邮箱 + 密码 + 记住我
- **邮箱验证**：注册后输入验证码验证邮箱
- **云存档**：每 30s 自动保存 + 结算保存
- **Profile**：查看金币/信用点/技能/每难度最远距离/跑步次数

### 后台管理
**http://35.212.200.85:3000/admin**
- 查看所有用户（邮箱/用户名/密码/数据）
- 修改密码
- 删除用户
- 验证用户
- 设置金币数量
- **http://35.212.200.85:3000/verify-codes** — 查看验证码

### API 接口
| 接口 | 方法 | 功能 |
|---|---|---|
| `/api/register` | POST | 注册 |
| `/api/verify-code` | POST | 验证邮箱 |
| `/api/login` | POST | 登录 |
| `/api/save` | POST | 保存存档 |
| `/api/load` | GET | 加载存档 |
| `/api/leaderboard` | GET | 排行榜 |
| `/api/admin-delete-user` | POST | 删除用户 |
| `/api/admin-reset-password` | POST | 重置密码 |
| `/api/admin-verify-user` | POST | 验证用户 |
| `/api/admin-set-coins` | POST | 设置金币 |

---

## 🚔 警察追踪系统

跑过 200m 后，一辆警车从后方追来：
- 初始距离 12m
- 缓慢逼近（约 90 秒追上）
- 金币收集可将警车推后 1m
- 距离 < 0.5m → GAME OVER
- HUD 显示 🚔 DISTANCE: Xm（绿→橙→红）
- 警笛声随距离靠近而响起

---

## 🌍 场景主题

| 分数 | 主题 | 背景色 | 两侧模型 |
|---|---|---|---|
| 0-500 | 🏙️ 城市 | 天蓝 | 长方体建筑 |
| 500-1500 | 🌲 森林 | 松绿 | 锥形树冠 + 灌木 |
| 1500-3000 | 🏜️ 沙漠 | 沙黄 | 仙人掌 + 岩石 |
| 3000+ | 🌊 海洋 | 深青 | 冰柱 + 冰山 |

---

## 🦸 彩蛋

输入 `homelander` 开启祖国人模式：
- WASD 飞行
- 从眼睛射出持续激光
- 激光烧毁障碍物
- 美国国旗披风
- `quit` 退出

---

## 🚨 已知问题 / Bug

### 🆕 游戏左上角 HUD 按钮重叠
**现象**：速度倍数指示器（SPD: 1x）和音量按钮（🔊）在左上角位置重叠。
**原因**：`#speed-indicator` 和 `#mute-btn` 的 CSS 定位都被设为 `left: 66px`，`top` 仅差 2px。
**修复**：将 `#mute-btn` 的 `left` 移到速度指示器右侧（桌面: 136px，平板: 120px，手机: 106px）。
**状态**：✅ 已修复（2026-06-02）

### 1. SHOP 界面按键无响应
**现象**：主菜单 SHOP 按钮点击后，商店界面和设置界面无法交互或点击无反应。
**原因**：使用了内联 `onclick` 属性（通过 `innerHTML` 设置），在某些浏览器的作用域解析中不可靠。
**修复**：改用 `data-shop-action` 属性 + 事件委托模式，所有按钮通过单一 `addEventListener` 处理。
**状态**：✅ 已修复（2026-06-02）

### 2. Profile 页面 CLOSE 按钮不工作
**现象**：Profile 页面中的 CLOSE 按钮点击后无法关闭页面，点击背景空白处也无法关闭。
**原因**：CLOSE 按钮 HTML 缺少 `id="pf-close"` 属性，导致 `getElementById('pf-close')` 找不到元素，事件监听器从未附加。内联 onclick 也存在作用域问题。
**修复**：添加 `id="pf-close"` 属性，改用 `addEventListener` 绑定关闭事件。
**状态**：✅ 已修复（2026-06-02）

### 3. Profile 数据加载不完整
**现象**：Profile 页面打开时，Email、技能、跑步次数、每难度最远距离等数据不完整或显示默认值。
**原因**：`showProfile()` 调用 `loadAccountData()`（异步 fetch）后立即构建 HTML，fetch 返回前 `SG.state` 的 maxEasy/maxMedium 等字段为旧值。
**修复**：将 `loadAccountData()` 改为返回 Promise，`showProfile()` 等待数据加载完成后通过 `_renderProfile()` 渲染。
**状态**：✅ 已修复（2026-06-02）

### 4. 音量滑块数值不持久
**现象**：拖动音量滑块后关闭再打开 Shop，数值恢复为默认值。
**原因**：与 Bug #1 相关 — Shop 内联 onclick 不可靠导致滑块 oninput 事件无法正确保存到 localStorage。
**修复**：Bug #1 修复后，滑块 oninput handler 可以正常工作，值通过 localStorage 持久化。
**状态**：✅ 已修复（2026-06-02）

### 5. `game.js` 静态文件未正确配置
**现象**：模块化合并为单文件后，`/game.js` 请求返回 404 或错误 Content-Type。
**原因**：`server/account-server.js` 的静态文件处理器只匹配 `/game/` 开头的路径，未包含 `/game.js`。
**相关代码**：
- `server/account-server.js:139` — 静态文件路径匹配条件
**状态**：✅ 已修复

### 6. 游戏首次加载黑屏（已修复）
**现象**：打开 `game.html` 后页面全黑。
**原因**：`ui.js` 中 `showShop()` 函数多了一个 `}` 闭合符，导致函数提前关闭，后续代码（`var owned = [false, SG.state.canDoubleJump, ...]`）在脚本加载时立即执行，此时 `SG.state` 尚未初始化。
**相关代码**：
- `game.js:1580` — 多余的 `}` 已移除
**状态**：✅ 已修复

### 7. 模块加载顺序问题（已修复）
**现象**：`SG.setupUI is not a function`、`SG.updateMenuCredits is not a function` 等错误。
**原因**：18 个独立模块通过 IIFE 加载，`account.js` 在 `main.js` 之前加载导致 `SG.init` 未定义。解决方案：合并为单文件 `game.js`。
**状态**：✅ 已修复## 🛠 本地开发

```bash
# 克隆
git clone https://github.com/jamesbot2/neo-creations.git
cd neo-creations/subway-surfer

# 启动游戏服务器（端口 8080）
node server/static-server.js

# 启动账号服务器（端口 3000）
node server/account-server.js

# 打开 http://localhost:3000
```

## 📜 License

MIT
