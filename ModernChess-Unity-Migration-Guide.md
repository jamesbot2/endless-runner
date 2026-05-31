# ModernChess -> Unity/C# Migration Guide / 迁移指南

> Prompts for Claude Code / 给 Claude Code 的提示词
> Plus full environment setup guide / 完整环境配置指南

---

## 1. Environment Setup / 环境配置

### 1.1 Hardware Requirements / 硬件要求

| Item / 项目 | Minimum / 最低 | Recommended / 推荐 |
|---|---|---|
| CPU | 4 cores / 4核 | 6 cores+ (i5-12xxx / R5 5600+) / 6核以上 |
| RAM | 8 GB | **16 GB** |
| Disk / 硬盘 | SSD, 10GB free / SSD空闲10GB | SSD, 20GB+ free / 20GB以上 |
| GPU | Integrated / 集成显卡 | Dedicated / 独显 (GTX 1060+ or any) |
| OS / 系统 | Windows 10 / macOS 12 / Ubuntu 20.04 | Windows 11 / macOS 14 |

For a 2D chess game, almost any modern laptop can run it.
/ 2D象棋游戏，大部分现代笔记本都能用。

### 1.2 Software to Install / 需要安装的软件

**1. Unity Hub** (manages Unity versions / 管理Unity版本)
- Download / 下载: https://unity.com/download
- Free, no account needed to download / 免费

**2. Unity Editor (Unity 6 LTS, 6000.0.x)** (install through Hub / 通过Hub安装)
- Open Unity Hub -> Installs tab -> Install Editor -> Choose Unity 6 LTS
- When installing / 安装时勾选:
  - [x] **WebGL Build Support** (optional, for web export / 可选，网页导出)
  - [x] **Windows / Mac / Linux Build Support** (for your OS / 你的平台)
- Size / 大小: ~3-5GB download / 下载
- Time / 时间: 20-40 minutes depending on internet / 20-40分钟

**3. IDE (pick one / 二选一)**

| IDE | Price / 价格 | Notes / 说明 |
|---|---|---|
| **Visual Studio Community 2022** | Free / 免费 | Unity auto-installs this / Unity自动安装 |
| **JetBrains Rider** | Paid (free with student email) / 付费(学生免费) | Better C# support / C#支持更好 |

Unity Hub will ask during Unity installation if you want VS. Say yes.
/ Unity Hub安装Unity时会问要不要装VS，选是。

**4. Claude Code or Cursor** (for AI-assisted coding / AI辅助编程)
- **Claude Code**: npm install -g @anthropic-ai/claude-code
  (requires Node.js 18+ / 需要Node.js 18+)
- **Cursor**: https://cursor.com (GUI editor with AI built in / 内置AI的编辑器)
- **OR / 或者**: Claude Code in VS Code terminal / 在VS Code终端里用

### 1.3 Installation Steps / 安装步骤 (Chinese detailed / 中文详细)

```
1. 访问 https://unity.com/download 下载并安装 Unity Hub
2. 打开 Unity Hub -> 左侧 Installs -> 右上 Install Editor
3. 选择 Unity 6 (6000.0.x LTS) 版本
4. 安装选项勾选 WebGL Build Support（以后想网页发布就需要）
5. 点击 Install，等下载安装完成
6. 安装 Visual Studio Community 2022（如果Hub没自动装，自己去 https://visualstudio.microsoft.com/ 下载）
   - 安装时勾选 ".NET桌面开发" 和 "使用Unity的游戏开发" 工作负载
7. 安装 Node.js 18+ (https://nodejs.org)
8. npm install -g @anthropic-ai/claude-code
9. 验证: 打开终端输入 claude --version，显示版本号即成功
```

### 1.4 Create the Unity Project / 创建Unity项目

1. Open Unity Hub / 打开Unity Hub
2. Click "New Project" / 点击新建项目
3. Choose "2D (URP)" template / 选择2D URP模板
4. Name / 项目名: `ModernChess-Unity`
5. Location / 位置: Choose your folder / 选择存放目录
6. Click "Create Project" / 点击创建

### 1.5 GitHub Repo Setup / GitHub仓库设置

1. Go to https://github.com/new
2. Repo name / 仓库名: `ModernChess-Unity`
3. **Important: Add .gitignore -> choose "Unity" template**
   / 重要：.gitignore 选择 Unity 模板
4. Create repo / 创建仓库
5. In Unity project folder / 在Unity项目文件夹下:
```bash
git init
git add .
git commit -m "Initial Unity project"
git remote add origin https://github.com/jame100101/ModernChess-Unity.git
git push -u origin main
```

### 1.6 Asset Preparation / 资源准备

From your old Java project `assets/` folder, copy into Unity project:
/ 从旧Java版的 assets/ 文件夹复制到Unity项目：

```
Old Java:  d:/game_project/assets/
                    |
                    +-- player.png        -->  ModernChess-Unity/Assets/Resources/player.png
                    +-- ai_easy.png       -->  ModernChess-Unity/Assets/Resources/ai_easy.png
                    +-- ai_medium.png     -->  ModernChess-Unity/Assets/Resources/ai_medium.png
                    +-- ai_hard.png       -->  ModernChess-Unity/Assets/Resources/ai_hard.png
```

Also create / 同时创建:
```
ModernChess-Unity/Assets/Resources/Sounds/
    (put your sound effect files here / 把音效文件放这里)
```

---

## 2. Migration Steps / 迁移步骤

### Step 1: Pure Logic Layer / 纯逻辑层 (NO Unity dependency)

**Prompt / 提示词 (copy to Claude Code / 复制给Claude Code):**

> I'm migrating my Java chess game to Unity C#. Translate the pure logic layer under Assets/Scripts/Core/.
> / 我要把 Java 象棋游戏迁移到 Unity C#，翻译纯逻辑层到 Assets/Scripts/Core/。
>
> Original: https://github.com/jame100101/ModernChess
>
> 1. PieceType.cs - enum { PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING }
> 2. Piece.cs - class Piece { PieceType type; bool isWhite; bool hasMoved; }
> 3. Move.cs - struct Move { int sr, sc, tr, tc; }
> 4. GameLogic.cs - core board class:
>    - int boardSize (8x8 default, support larger for Amusement mode)
>    - Piece[][] board 2D array
>    - bool isWhiteTurn
>    - getPiece(r,c), setPiece(r,c,piece)
>    - movePiece(sr,sc,tr,tc) -> captured Piece
>    - undoMove(sr,sc,tr,tc, captured)
>    - getValidMoves(r,c) -> List<Move>
>    - isInCheck(isWhite) -> bool
>    - isCheckmate(isWhite) -> bool
>    - generateAllMoves(isWhite) -> List<Move>
>    - cloneBoard() -> deep copy
>
> Requirements / 要求:
> - NO UnityEngine references, pure C# / 不引用 UnityEngine
> - Namespace: ModernChess.Core
> - Keep original logic, don't refactor / 保持原有逻辑不改

**Verify / 验证:** Write a quick console test to confirm move generation works.
/ 写一个控制台测试，确认走法生成正常。

---

### Step 2: Stockfish / UCI Integration / Stockfish 接入

**Prompt / 提示词:**

> Translate Java ChessAIController to C# under Assets/Scripts/Core/.
> / 把 Java 的 ChessAIController 翻译成 C#。
>
> Original functions / 原功能:
> - ProcessBuilder launches stockfish / 启动Stockfish进程
> - Init: uci -> uciok, isready -> readyok
> - requestBestMoveAsync(logic, skillLevel, listener)
>   -> position fen [FEN]
>   -> go depth [N]
>   -> parse bestmove [move]
> - toFEN(logic) -> FEN string / FEN字符串
> - uciToMove(uci, logic) -> Move
> - mapSkillLevelToDepth(int) -> int
> - shutdown()
>
> C# requirements / C#要求:
> - Use System.Diagnostics.Process / 用Process启动
> - Use async Task, 30s timeout with CancellationToken / 加30秒超时
> - Cross-platform: stockfish.exe (Win) / stockfish (Mac/Linux)
> - Support Restart() after crash / 引擎crash后支持重启
> - Namespace: ModernChess.Core

**Verify / 验证:** Pass a FEN string to Stockfish, confirm you get a bestmove back.
/ 传给Stockfish一个FEN，确认能拿到bestmove回应。

---

### Step 3: Built-in AI (Minimax) / 内置AI (minimax)

**Prompt / 提示词:**

> Translate Java AmusementChessAI to C# under Assets/Scripts/Core/.
> / 把 Java 的 AmusementChessAI 翻译成 C#。
>
> Namespace: ModernChess.Core, pure C#, no UnityEngine.
>
> Methods / 方法:
> - findBestMove(logic, depth) -> Move (alpha-beta pruning)
> - minimax(logic, depth, alpha, beta) -> int
>   - White = minimizing, Black = maximizing / 白方最小化，黑方最大化
> - evaluateBoard(logic) -> int
>   - material + center control + pawn advancement + mobility
>     / 子力 + 中心控制 + 兵推进 + 机动性
> - getPieceValue(type) -> int
> - generateAllMoves(logic, isWhite) -> List<Move>

---

### Step 4: Unity UI - Main Menu / 主菜单

**Prompt / 提示词:**

> Create Assets/Scripts/UI/MainMenu.cs with code (no manual UI).
> / 用代码创建主菜单UI（不要手动拉UI）。
>
> Requirements / 要求 (参考 Java StartScreen):
> - Dark bg #1A1C24 / 深色背景
> - Title "MODERN CHESS", cyan #61DAFB, large font / 标题
> - 4 buttons: PvP / PvE / Amusement / Exit / 四个按钮
> - Rounded buttons, hover color transition / 圆角按钮，hover变色
> - Bottom: info text + Settings button / 底部信息栏+设置按钮
> - Generate everything in Awake() / 全部在Awake()中用代码生成

**Verify / 验证:** Drag onto empty scene GameObject -> Play -> see menu.
/ 拖到场景空对象上 -> 点Play -> 看到菜单。

---

### Step 5: Unity UI - Difficulty Picker / 难度选择

**Prompt / 提示词:**

> Create Assets/Scripts/UI/DifficultyPanel.cs
>
> 5 difficulty buttons: Beginner / Easy / Medium / Hard / God-like
> / 5个难度按钮：入门/简单/中等/高手/神级
> Each shows: name, depth, Elo, description / 每个显示名称、深度、Elo、描述
> OnClick fires OnDifficultySelected(int skillLevel) / 点击触发事件
> Back button to main menu / 返回按钮

---

### Step 6: Unity UI - Board Rendering / 棋盘渲染

**Prompt / 提示词:**

> Create Assets/Scripts/UI/BoardRenderer.cs
>
> Features / 功能:
> - Generate 8x8 grid cells (Image) in Awake() / 代码生成8x8格子
> - Cell colors: #F0D9B5 / #B58863 / 格子颜色交替
> - Each cell has Button, OnCellClick(row, col) / 每个格子有点击事件
> - Reads ModernChess.Core.GameLogic for state / 读取GameLogic数据
> - RenderBoard(): show piece sprites on cells / 渲染棋子
> - Highlight valid moves (green overlay) / 高亮合法走法
> - Support board flip (black/white perspective) / 支持棋盘翻转
>
> EASY ALTERNATIVE / 简单方案:
> Use TextMeshPro with Unicode chess chars instead of sprites
> / 用TextMeshPro显示Unicode棋子字符，不需要图片
> White: U+2654 U+2655 U+2656 U+2657 U+2658 U+2659
> Black: U+265A U+265B U+265C U+265D U+265E U+265F

---

### Step 7: GameManager / 游戏流程控制器

**Prompt / 提示词:**

> Create Assets/Scripts/GameManager.cs
>
> Responsibilities / 职责:
> - Manages GameLogic instance / 管理GameLogic实例
> - Turn flow / 回合流程:
>   1. Player clicks piece -> highlight moves / 点击棋子->高亮
>   2. Player clicks target -> execute move / 点击目标->走棋
>   3. PvE + AI turn -> call Stockfish or built-in AI / 轮到AI时调用
>   4. AI returns -> update board / AI返回走法->更新棋盘
> - Check checkmate / king capture -> popup / 检测将死/吃王->弹窗
> - Move history, undo (max 3) / 走法历史，悔棋最多3步
> - PGN export / PGN导出
>
> Modes / 模式:
> - PvP: both human / 双方都是人
> - PvE: human=white, AI=black / 人白AI黑
> - Amusement: built-in AI, larger board / 内置AI+大棋盘

---

### Step 8: Animations + Effects / 动画 + 特效

**Prompt / 提示词:**

> Add to BoardRenderer:
> / 添加到 BoardRenderer：
>
> 1. Piece movement: DOTween or Coroutine+Lerp, 0.3s slide
>    / 棋子移动动画，0.3秒滑动
> 2. Check screen shake: Camera wobble 0.2s / 将军屏幕震动
> 3. Capture effect: fade out captured piece / 吃子淡出效果
> 4. Sound: AudioSource.Play from Resources/Sounds/ / 音效

---

### Step 9: Amusement Mode Features / 娱乐模式

**Prompt / 提示词:**

> Add to BoardRenderer or new Assets/Scripts/UI/AmusementUI.cs:
>
> 1. Fog of War: semi-transparent overlay, reveal 2-cell radius
>    / 战争迷雾：半透明遮罩，只显示选中棋子周围2格
> 2. Large board: 16x16 and 32x32 (use built-in AI, not Stockfish)
>    / 大棋盘：16x16和32x32（用内置AI）
> 3. Fog toggle: UI Toggle / 迷雾开关

---

### Step 10: Chess Timer / 计时器模式

**Prompt / 提示词:**

> Create Assets/Scripts/ChessTimer.cs
>
> - Show remaining time for white and black / 显示双方剩余时间
> - Opponent timer counts down after each move / 每走一步对方倒计时
> - Timeout -> OnTimeOut(isWhite) event / 超时触发事件
> - Presets: 3min, 5min, 10min / 预设时间
> - Display MM:SS with TextMeshPro

---

### Step 11: Replay System / 回放系统

**Prompt / 提示词:**

> Create Assets/Scripts/ReplaySystem.cs
>
> - Records every Move / 记录每一步
> - Previous/Next step buttons / 上一步/下一步按钮
> - Reset to start / 重置到开局
> - Disable player interaction during replay / 回放时禁用玩家交互
> - Show current step / total steps / 显示当前步数/总步数

---

### Step 12: Wire Everything Together / 串联所有界面

**Prompt / 提示词:**

> Create Assets/Scripts/GameEntry.cs
>
> Flow / 流程:
> MainMenu -> DifficultySelect -> Game (PvE)
> MainMenu -> Game (PvP)
> MainMenu -> AmusementSelect -> Game (Amusement)
> Game -> game over -> back to main menu / 结束回主菜单
>
> One scene, toggle panels with SetActive() / 同一场景切换面板

---

## 3. Claude Code Rescue Tips / 救命技巧

### When stuck / 卡住了:

```
"Explain what [method] in [filename] does"
"解释一下 [文件名] 里 [xxx] 这个方法的作用"
```

```
"I got this error: [error]. How to fix?"
"我遇到这个报错: [报错信息]，怎么修？"
```

```
"Refactor [filename] - extract [logic] into its own class"
"重构 [文件名]，把 [某段逻辑] 抽出来成一个类"
```

### When AI goes too long / AI写太长了:

```
"Stop. Give me an outline of [filename] with all public methods first."
"停，先给我 [文件名] 的大纲，列出所有 public 方法"
```

### For assets / 图片资源:

```
"Generate chess piece PNGs, 72x72px, transparent bg, save to Assets/Resources/"
"生成国际象棋棋子PNG图片，72x72，透明背景，存到 Assets/Resources/"
```

### Or skip images entirely / 或跳过图片:

```
"Don't use images. Use TextMeshPro with Unicode chess chars instead."
"不要图片，用 TextMeshPro 显示 Unicode 棋子字符代替"
```

---

## 4. File Structure / 最终文件结构

```
Assets/
  Scripts/
    Core/                    (pure C#, no Unity deps / 纯C#不依赖Unity)
      PieceType.cs
      Piece.cs
      Move.cs
      GameLogic.cs
      StockfishUCI.cs
      AmusementChessAI.cs
      PGNFormatter.cs
    UI/                      (Unity-dependent / 依赖Unity的UI代码)
      MainMenu.cs
      DifficultyPanel.cs
      BoardRenderer.cs
      AmusementUI.cs
      GameOverPanel.cs
    GameManager.cs
    ChessTimer.cs
    ReplaySystem.cs
    GameEntry.cs
  Resources/
    player.png
    ai_easy.png
    ai_medium.png
    ai_hard.png
    w_pawn.png  (or skip, use Unicode chars / 或用Unicode字符代替)
    b_pawn.png
    ... (12 piece images / 12个棋子图片)
    Sounds/
      move.wav
      capture.wav
      check.wav
  Scenes/
    Main.unity
  Packages/
```

---

## 5. Ready-to-use First Prompt / 明天直接复制这第一条

Copy this to Claude Code to start / 复制给Claude Code开始干活：

```
IMPORTANT: Migrate my Java ChessGame to Unity.

Java source: https://github.com/jame100101/ModernChess

Step 1: Create pure logic layer under Assets/Scripts/Core/.
Files, namespace ModernChess.Core, NO UnityEngine:

1. PieceType.cs - enum PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING
2. Piece.cs - class Piece { PieceType type; bool isWhite; bool hasMoved; }
3. Move.cs - struct Move { int sr, sc, tr, tc; }
4. GameLogic.cs - full board class, variable boardSize
5. StockfishUCI.cs - Process, UCI, async, 30s timeout, cross-platform
6. AmusementChessAI.cs - minimax + alpha-beta

When done, proceed to UI layer: Assets/Scripts/UI/MainMenu.cs
```

---

_Generated 2026-05-29 / 生成于 2026-05-29_
