# ncmgit

用 Git 管理网易云音乐歌单。

ncmgit 将网易云音乐歌单视为 Git 仓库，将歌单中的歌曲视为可被版本控制的文件。你可以在本地以 JSON 文件的形式编辑歌曲信息，然后像 `git push` 一样推送到网易云音乐。

---

## 概念映射

| Git 概念 | ncmgit 对应 |
|---------|------------|
| 仓库 (repo) | 网易云歌单 |
| 远程仓库 (remote) | 歌单 ID |
| 文件 (file) | 歌曲 (JSON 文件) |
| `git add` | 暂存歌曲变更 |
| `git commit` | 记录本地歌曲快照 |
| `git push` | 将歌曲变更同步到网易云歌单 |
| `git pull` | 从网易云歌单拉取歌曲列表 |
| `git clone` | 克隆网易云歌单到本地 |

## 项目结构

```
my-playlist/          # 一个 ncmgit 仓库
├── .ncmgit/          # 仓库元数据 (类似 .git/)
│   ├── HEAD          # 当前歌单 ID
│   ├── config        # 仓库配置 (remote, 登录凭证)
│   ├── index         # 暂存区 (歌曲 ID 列表)
│   └── objects/      # 歌曲对象 (JSON, 按 hash 存储)
├── 歌曲名.json        # 歌曲文件
├── 另一首歌.json
└── ...
```

## 歌曲文件格式

每个歌曲文件是一个 JSON 文件，文件名推荐为 `歌曲名 - 歌手.json`：

```json
{
  "type": "netease",
  "nid": 123456,
  "name": "晴天",
  "artists": ["周杰伦"],
  "album": "叶惠美",
  "duration": 269000,
  "local_path": null
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `"netease"` 表示网易云歌曲，`"local"` 表示本地文件 |
| `nid` | number | 网易云歌曲 ID (type=netease 时必填) |
| `name` | string | 歌曲名 |
| `artists` | string[] | 歌手列表 |
| `album` | string | 专辑名 |
| `duration` | number | 时长 (毫秒) |
| `local_path` | string\|null | 本地音频文件路径 (type=local 时使用) |

## 安装

```bash
git clone https://github.com/your/ncmgit.git && cd ncmgit
npm install && npm link
```

依赖 [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/neteasecloudmusicapienhanced/api-enhanced) 作为后端。你需要先启动该 API 服务：

```bash
git clone https://github.com/neteasecloudmusicapienhanced/api-enhanced.git
cd api-enhanced
pnpm i
node app.js   # 默认 http://localhost:3000
```

### 配置 API 地址

```bash
ncmgit config apiBase http://localhost:3000
```

### 解决"登录环境异常"

如果你在境外，可配置一个中国代理：

```bash
ncmgit config proxy http://your-proxy:port
```

也可手动指定 realIP：

```bash
ncmgit config realIP 116.1.2.3
```

境内用户一般不需要额外配置。

## 使用

### 登录

```bash
ncmgit auth login       # 扫码 / 验证码 / 手机号 / 邮箱
ncmgit auth status      # 查看登录状态
ncmgit auth logout      # 登出
```

登录信息存储在 `~/.config/ncmgit/auth.json`，所有仓库共享。

### 初始化仓库 / 克隆歌单

```bash
# 创建一个空仓库 (同时创建空白歌单)
ncmgit init my-playlist

# 克隆已有歌单
ncmgit clone <playlist-id>
# 例如: ncmgit clone 123456789
```

### 查看状态

```bash
ncmgit status
```

### 添加歌曲

```bash
# 从网易云搜索并添加歌曲到暂存区
ncmgit add --search "周杰伦 晴天"

# 手动编写歌曲 JSON 文件后，暂存
ncmgit add 晴天\ -\ 周杰伦.json

# 暂存所有变更
ncmgit add .
```

### 提交

```bash
ncmgit commit -m "添加周杰伦的晴天"
```

### 推送到网易云

```bash
ncmgit push
```

### 拉取最新歌单

```bash
ncmgit pull
```

### 管理远程歌单

```bash
ncmgit remote                    # 查看远程歌单配置
ncmgit remote set <playlist-id>  # 修改远程歌单
```

## 工作流示例

```bash
# 1. 登录
ncmgit auth login

# 2. 克隆一个已有的网易云歌单
ncmgit clone 987654321
cd 987654321/

# 3. 查看歌单里的歌曲 (就是 JSON 文件)
ls

# 4. 编辑/新增歌曲文件，然后暂存
ncmgit add 新歌.json

# 5. 提交
ncmgit commit -m "添加新歌"

# 6. 推送
ncmgit push

# 7. 如果别人修改了歌单，拉取更新
ncmgit pull
```

## 技术架构

```
ncmgit (CLI)
    │
    ├── src/commands/    命令行命令实现
    ├── src/core/        核心逻辑
    │   ├── repo.js      仓库管理 (init, clone, HEAD, config, index)
    │   ├── ncm-client.js 封装 ncmapi, 处理登录态、请求
    │   └── tracker.js   文件变更追踪 (diff, 暂存)
    └── src/utils/       工具函数
```

## License

MIT
