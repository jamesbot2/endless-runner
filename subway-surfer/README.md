# 🏃 Subway Surfer - Neo Edition

> 一个 3D 无限跑酷网页游戏 / A 3D endless runner web game  
> 使用 Three.js 构建 / Built with Three.js  
> 灵感来自 Subway Surfers / Inspired by Subway Surfers  
> 由 Neo 🤖 为 James 制作 / Made by Neo for James

---

## 🎮 游玩 / Play

**https://jamesbot2.github.io/subway-surfer/**

---

## 📖 目录 / Table of Contents

- [架构 / Architecture](#-架构--architecture)
- [游戏机制 / Game Mechanics](#-游戏机制--game-mechanics)
- [功能特性 / Features](#-功能特性--features)
- [已知问题 / Known Issues](#-已知问题--known-issues)
- [开发 / Development](#-开发--development)

---

## 🏗 架构 / Architecture

### 技术栈 / Tech Stack

| 层级 / Layer | 技术 / Technology |
|---|---|
| **引擎 / Engine** | Three.js r128 (WebGL) |
| **物理 / Physics** | 自定义 AABB 碰撞 / Custom AABB collision + 抛物线跳跃 / parabolic jump |
| **渲染 / Rendering** | Canvas 生成纹理（无外部资源）/ Canvas-generated textures (no external assets) |
| **音频 / Audio** | Web Audio API（程序化音效）/ Procedural sound |
| **托管 / Hosting** | GitHub Pages |
| **CDN** | cdnjs → jsdelivr（备用 / fallback） |

### 项目结构 / Project Structure

```
subway-surfer/
├── index.html     ← 入口 / Entry point，加载 Three.js CDN + game.js
├── style.css      ← 全屏 Canvas 布局 / Full-screen canvas layout，UI 覆盖层 / UI overlays，手机按键 / mobile controls
└── game.js        ← ~2200 行 / ~2200 lines，单文件游戏逻辑 / single-file game logic
```

### 代码架构 / Code Architecture (game.js)

游戏运行在单个 IIFE `(function() { ... })()` 内，避免全局污染 / Runs inside a single IIFE to avoid global scope pollution.

**核心系统顺序 / Key Systems (in order):**

```
常量 Constants → 状态 State → 纹理生成 Texture Gen → 场景 Scene → 玩家 Player
→ 轨道 Track → 建筑 Buildings → 障碍物 Obstacles → 金币 Coins
→ 粒子 Particles → 音频 Audio → 生成逻辑 Spawn Logic → UI → 按键 Control
→ 碰撞 Collision → 游戏流程 Game Flow → 更新循环 Update → 相机 Camera
→ 渲染循环 Render → 初始化 Init
```

#### 1. 游戏循环 / Game Loop

```
animate()
  └→ requestAnimationFrame(animate)  // 递归帧调度 / recursive frame scheduler
  └→ update()                        // 所有游戏逻辑 / all game logic
  └→ renderer.render(scene, camera)  // 每帧必渲染 / always renders every frame
```

#### 2. 更新循环 / Update Loop

```
gameOver? → 相机震动衰减 → return
paused / not started? → return
↓
delta = clock.getDelta()
→ 速度增加 → 分数 → UI 刷新
→ 移动轨道段（循环复用）
→ 移动障碍物、金币、建筑
→ 粒子（移动 + 清理）
→ 玩家车道平滑切换
→ 跳跃物理（重力 + 速度）
→ 翻滚高度 + 压缩
→ 跑步动画（上下弹动、手臂/腿部摆动）
→ 车身倾斜
→ 金币收集
→ 生成障碍物（填充管道）
→ 碰撞检测
→ 祖国人更新（如果激活）
→ 相机跟随
```

#### 3. 坐标系 / Coordinate System

```
+Z = 玩家后方 / behind the player（迎面而来 / coming toward）
-Z = 前方 / ahead（玩家跑向的方向 / where the player runs）
+Y = 上 / up
+X = 右 / right
相机位置 / Camera at z=+7，看向 / looking toward z=-10
玩家固定在 z=0（世界围绕玩家移动 / world moves around them）
```

- **3 条车道 / 3 lanes**: X 位置 / positions at -2.2, 0, 2.2
- **物体沿 +Z 方向移动**（朝相机移动，在 z=+30 处被清理）
- **物体在 -Z 处生成**（前方，通过雾效淡入）
- **雾效 / Fog**: 距相机 60–120 单位（天空蓝色 / sky blue 0x87CEEB）

#### 4. 障碍物生成 / Obstacle Spawning ("Pipe Fill")

```
ahead = 在 z(-90, 0) 范围内的障碍物
targetCount = min(6 + speed×6, 18)  // 速度越快越多
if ahead.length < targetCount:
    选择车道，检查 zBlocked（±6 单位内无重叠）
    选择类型 / pick type: 火车 train(40%)，路障 barrier(15%)，钻底 roll-under(45%)
    在 z = -(45 + speed×30) - random(15) 处生成
    附近生成金币
```

**难度模式 / Difficulty modes:**
- 简单 Easy: 数量 ×0.4，间距 ×2，初始 10 个
- 中等 Medium: 数量 ×0.7，初始 15 个
- 困难 Hard: 数量 ×1.0，初始 20 个（默认 / default）

---

## 🎯 游戏机制 / Game Mechanics

### 操作 / Controls

| 操作 Action | 桌面 Desktop | 手机 Mobile |
|---|---|---|
| 开始 Start | Space / Enter | 点击 TAP TO START |
| 左移 Left | ← / A | 左滑 / 点左 / ◀ 按钮 |
| 右移 Right | → / D | 右滑 / 点右 / ▶ 按钮 |
| 跳跃 Jump | ↑ / W / Space | 上滑 / 点中间 / ▲ 按钮 |
| 翻滚 Roll | ↓ / S | 下滑 / ▼ 按钮（按住保持 / hold to stay） |
| 暂停 Pause | Esc / P | ⏸ 按钮（左上 / top-left） |
| 控制台 Console | `（反引号） | >_ 按钮（右上 / top-right） |
| 第一人称 FPV | 👁 按钮 | 👁 按钮（右上 / top-right） |
| 主菜单 Menu | M | RETURN TO MENU（暂停或结算 / pause or game over） |

### 障碍物 / Obstacles

| 类型 Type | 躲避方式 Avoid by | 碰撞箱 Hitbox |
|---|---|---|
| 🚂 火车 Train | 跳过 Jump over | 2.4×1.8×6 |
| 🧱 路障 Barrier | 跳过 Jump over | 1.6×0.6×1.0 |
| 🚪 钻底闸门 Roll-Under | 滑铲 Roll/Slide under | 2.6×0.5×5 (顶梁在 y=1.4) |
| 🚂➕ 斜坡火车 Ramp Train | 跑上屋顶 Run onto roof | 同火车 + 橙色斜坡在车尾 |

### 彩蛋 / Easter Eggs

| 命令 Command | 效果 Effect |
|---|---|
| `homelander` | 🦸 化身为祖国人飞翔（WASD 控制），激光眼，无敌 |
| `quit` | 退出祖国人模式 |

### 难度 / Difficulty

| 等级 Level | 初始障碍数 Init Obs | 生成倍率 Rate | 间距 Gap | 颜色 Color |
|---|---|---|---|---|
| 🟢 简单 EASY | 10 | 40% | 30 unit | 绿色 Green |
| 🟡 中等 MEDIUM | 15 | 70% | 20 unit | 黄色 Yellow |
| 🔴 困难 HARD | 20 | 100% | 15 unit | 红色 Red（默认） |

### 速度系统 / Speed System

- **初始速度 START_SPEED**: 0.35 (21 units/sec)
- **最大速度 MAX_SPEED**: 2.25 (135 units/sec)
- **显示 Display**: 1× → 50×
- **颜色 Colors**: 白色白 (<15×) → 橙色 Orange (15-35×) → 红色 Red (>35×)
- **加速度 Acceleration**: 0.0005/帧（约 63 秒到极速）

---

## ✨ 功能特性 / Features

### 斜坡火车 / Ramp Trains (30% 的火车 / of trains)
- 橙色斜坡在车厢尾部 (z=+4.5)
- 跑上去 → 登上车顶（`state.onRoof = true`）
- 在车顶之间跳跃（跳过任意障碍物表面）
- 车厢经过后自动掉落

### 第一人称视角 / First-Person View (FPV)
- 点击 👁 切换
- 相机在眼睛高度 (y+1.3)
- 跟随跳跃/翻滚高度变化
- FPV 时隐藏玩家模型

### 按住翻滚 / Hold-to-Roll
- 按住 ↓ / S / 手机 ▼ = 持续滑铲
- 松手 = 站起
- 下滑手势 = 最少 400ms 翻滚
- 跳跃取消翻滚，翻滚取消跳跃

### 空中翻滚 / Air Roll (Jump + ↓)
- 空中翻滚时 2.5× 重力
- 快速落地
- 落地继续保持滑铲

### 控制台 / Console (`)
- 游戏中输入命令
- `homelander` → 变身为祖国人飞行
- `quit` → 退出祖国人
- 打开时暂停游戏

### 最佳分数 / Best Score (localStorage)
- 跨会话持久保存
- 在 HUD 和结算界面显示

### 障碍物重叠预防 / Obstacle Overlap Prevention
- `zBlocked` 检查：生成前检查 ±6 单位
- 路障不放在钻底闸门附近
- 钻底闸门不放在斜坡火车附近
- Z 位置被占用则跳过生成

### 手机虚拟按键 / Mobile Controls
- 十字布局（▲ 上排，◀ ▼ ▶ 下排）
- 触摸区域：点击左/右 1/3 切换车道
- 滑动手势识别
- 按住 ▼ 持续翻滚

---

## 🐛 已知问题 / Known Issues

### 缺陷 / Bugs
- **Telegram 内嵌浏览器**：WebGL 工作不稳定；某些 WebView 屏蔽 CDN 或缺少 GPU 加速
- **手机控制台键盘**：关闭键盘后重新打开时，部分手机键盘不响应首次点击
- **障碍物边缘重叠**：双障碍物（同 Z 堵 2 道）在车道边界有 ±0.2 单位的视觉重叠
- **Homelander 左右移动（部分浏览器）**：直接按键移动在 Playwright 测试中正常，但在某些浏览器/键盘布局上无效；更新循环后备（WASD 读取 `keys[]`）应能覆盖，但需进一步调试
- **上滑跳跃延迟**：低端手机上触摸事件处理可能有 ~100ms 延迟

### 缺失功能 / Missing Features
- **真正的地铁跑酷式障碍物**：移动火车、变道路障
- **道具系统**：2× 倍率、磁铁、滑板、护盾
- **任务系统**：每日挑战、分数目标
- **角色皮肤**：不同模型的可解锁角色
- **音效开关**：缺少静音按钮
- **排行榜**：没有全球排名
- **暂停界面响应**：TAP TO CONTINUE 在某些设备上首次点击不注册
- **障碍物种类**：只有 3 种 + 斜坡火车；需要更多（低空飞行物、地面缺口、全车道障碍）
- **斜坡上车检测**：仅在前向接近时工作，侧向或反向不生效
- **车顶机制**：车顶间跳跃可用但不流畅；掉落检测仅按 Z 轴，不考虑 X 轴移动

### 性能 / Performance
- **无 LOD 系统**：所有障碍物细节一致，不随距离降低
- **粒子清理**：祖国人模式下的激光粒子未正确释放
- **手机帧率**：弱 GPU 设备上运行困难（无阴影有帮助但雾+多绘制调用仍较重）
- **建筑**：简化的彩色方块但仍约 30 个绘制调用/帧；可批量处理

### 用户体验 / UX
- **无教程**：新玩家不读 README 不知道操作
- **手机暂停按钮太小**：⏸ 按钮较小不易点击
- **控制台按钮冲突**：>_ 和 👁 按钮在某些屏幕尺寸上重叠
- **字体加载**：使用系统字体，无自定义字体

---

## 🔧 开发 / Development

### 本地运行 / Run Locally

```bash
# 克隆 / Clone
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer

# 使用任意 HTTP 服务器 / Serve with any HTTP server
python3 -m http.server 8080
# 或者 / Or
npx serve .
```

打开 `http://localhost:8080` 即可游玩。

### 构建和部署 / Build & Deploy

```bash
# 推送到 GitHub → GitHub Pages 自动部署
git push origin main
```

无需构建步骤。纯 HTML/CSS/JS。

### 测试 / Testing

```bash
# 需要 Playwright / Requires Playwright
npx playwright install chromium
node test.js
```

---

## 📜 License

MIT — 欢迎 Fork、修改和分享 / feel free to fork, modify, and share.
