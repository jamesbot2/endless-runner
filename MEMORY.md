# MEMORY.md - Long-Term Memory

## GitHub Repos

### jamesbot2/neo-creations
- **远程名**: `origin`
- **URL**: `https://github.com/jamesbot2/neo-creations.git`
- **Token**: 存在 `~/.openclaw/workspace/.github/github-token`
- **分支**: main
- **内容**: 整个工作区（AGENTS.md、SOUL.md、USER.md、TOOLS.md、子项目等）
- **根目录 README**: "Things Neo made 🤖"

### jamesbot2/subway-surfer
- **远程名**: `gh-pages`
- **URL**: `https://github.com/jamesbot2/subway-surfer.git`
- **分支**: main
- **内容**: 仅 subway-surfer 游戏文件
  - README.md / game/ / server/ / game.js / index.html / signin.html / game.html / style.css / start-servers.sh
- **注意**: 这是单独的游戏仓库，不要推整个工作区进去

## Subway Surfer 游戏
- 3D 无限跑酷，Three.js + Node.js
- 完整账号系统（注册/登录/邮箱验证/云存档）
- 服务器跑在 GCP 机器上（:3000 游戏，:8080 静态）
- 本地路径: `~/workspace/subway-surfer/`

## GCP 云主机
- Debian 13 (trixie)
- 公网 IP: 35.212.200.85
- 内网 IP: 10.138.0.2
- Tailscale IP: 100.112.240.25
- 用户: ejimm363

### 游戏功能
- 主菜单有排行榜（🏆 LEADERBOARD）：显示各难度最远距离 + 装备技能
- 祖国人模式下距离/金币/credit 不计入记录
- 返回到主菜单自动退出祖国人模式
- 刷新页面自动回到普通模式

### 防火墙（已收紧）
- `allow-game-server` — TCP 3000, 8080
- `allow-shadowsocks` — TCP+UDP 8388
- `default-allow-ssh` — TCP 22
- 其他端口全部封锁
- `abc` 规则（0.0.0.0/0 全放行）已删除

### SSH
- 密钥登录 ✅ / 禁 root ✅ / 自动安全更新 ✅

### Shadowsocks 翻墙
- 端口 8388 (TCP+UDP)
- 加密: chacha20-ietf-poly1305
- 密码: rKbJDTiZZWM3PzVVQvNdQ==
- systemd 开机自启
- Clash Verge 客户端已配好

### OpenClaw Dashboard
- 只能通过 Tailscale 访问: http://100.112.240.25:18789
- 仍有更新可用（2026.5.28）
