


# Simple Weather API 
一个简单的天气与定位API。

集成了 OpenMeteo + 7Timer! + Wttr.in 三大天气源，支持自动轮询、缓存与抗封锁机制。几乎可以做到永不掉线。

## ✨ 核心特性
- ⚡ **双云双活架构**：可同时部署在 Cloudflare Pages 和 Vercel，互为容灾备份。
- 🌍 **智能 IP 定位**：
  - 自动识别 IPv4 / IPv6。
  - 中文城市映射：内置 cityMap.json 数据库，将国外 API 返回的英文城市名（如 "Hong Kong"）自动转换为中文（"香港"），并支持远程热更新。
- 🔁 **高可用天气轮询**：
   后端会自动按优先级尝试获取天气数据，一旦失败立即切换备选方案，前端无感知：
   - **Plan A (首选)**: [OpenMeteo](https://open-meteo.com) 数据最全、响应最快。
   - **Plan B (备选)**: [7Timer](http://www.7timer.info) 完全免费，无 Key 限制，基于 NOAA 数据。
   - **Plan C (兜底)**: [wttr.in](https://wttr.in) 终端风格天气，最后的防线。
- 🛡️ **抗封锁机制**：
  - Fake IP 伪装：自动生成随机家用宽带 IP ，绕过上游风控。
  - UA 伪装：伪装成标准浏览器请求。
  - 智能缓存：利用 CDN 边缘缓存，大幅降低上游请求频率。


## 🚀 API 接口文档
### 1. 定位接口 (Geo)
获取访问者的 IP、网络类型及地理位置信息。

- **Endpoint**: `/api/geo`
- **Method**: `GET`

**Response**:
```json
{
  "ip": "2401:b60:...",
  "type": "IPv6",           // 网络类型 (IPv4/IPv6)
  "city": "香港",           // 经过翻译的中文名
  "city_en": "Hong Kong",   // 原始英文名
  "country": "HK",
  "latitude": "22.2783",
  "longitude": "114.1747",
  "source": "My Private API"
}
```

### 2. 天气接口 (Weather)
获取实时天气数据（支持经纬度或城市名）。

- **Endpoint**: `/api/weather`
- **Method**: `GET`

**Query Parameters**:
- `lat`: 纬度 (可选，如 22.2783)
- `lon`: 经度 (可选，如 114.1747)
- `city`: 城市名 (可选，如 Beijing。如果没传经纬度，会优先用城市名去查坐标)

**Response**:
```json
{
  "status": "ok",
  "data": {
    "weather": "多云",       // 已统一映射为中文
    "temp": 25,             // 温度 (°C)
    "wind": "东南风 3级"     // 风向 + 风力等级
  },
  "source": "OpenMeteo",    // 数据来源 (OpenMeteo / 7Timer / Wttr.in)
  "debug_info": [...]       // (仅当发生降级时出现) 记录失败原因
}
```

## 🛠️ 部署指南
本项目采用 GitOps 工作流，代码即配置。

### ☁️ [Cloudflare Pages (推荐) ](https://pages.cloudflare.com)
1. Fork 本仓库。
2. 在 Cloudflare 创建 Pages 项目，连接你的 GitHub 仓库。
3. Build settings:
   - Framework preset: None (必须选 None)
   - Build command: (留空)
   - Output directory: (留空)
4. 点击 Deploy。

### ▲ [Vercel](https://vercel.com)
1. 在 Vercel Dashboard 导入你的 GitHub 仓库。
2. Framework Preset: 选择 Other。
3. 点击 Deploy。

## ⚙️ 配置与维护
### 更新城市映射表
项目根目录下的 `cityMap.json` 存储了英文到中文的城市映射关系。 如需添加新城市，只需在 GitHub 上编辑该文件并提交，所有部署环境会在几分钟内自动更新生效。

**示例**:
```json
{
  "Beijing": "北京市",
  "Shanghai": "上海市",
  "Tokyo": "东京",
  ...
}
```

### 调试模式
如果 source 显示为 Wttr.in，说明 OpenMeteo 和 7Timer 均请求失败。您可以查看返回 JSON 中的 debug_log 字段，里面记录了每一次尝试的 HTTP 状态码和错误信息。

## 📂 项目结构
```plaintext
.
├── api/                  # Vercel Serverless Functions
│   ├── geo.js            # Vercel 定位逻辑
│   └── weather.js        # Vercel 天气逻辑
├── functions/            # Cloudflare Pages Functions
│   └── api/
│       ├── geo.js        # CF 定位逻辑
│       └── weather.js    # CF 天气逻辑
├── cityMap.json          # 城市中英文映射数据库
├── index.html            # 前端演示页
└── README.md             # 说明文档
```


## ⚠️ 免责声明 

1.  **仅供学习**：本项目及其相关 API 服务仅供个人学习、研究和非商业用途使用。
2.  **数据来源**：
    * 天气数据来源于 [Open-Meteo](https://open-meteo.com)、[7Timer](http://www.7timer.info) 和 [wttr.in](https://wttr.in)。
    * IP 定位数据来源于 Cloudflare 及其他公共服务。
3.  **无担保**：不保证服务的稳定性、准确性或持续可用性。请勿将本项目用于关键业务系统。
4.  **版权**：所有第三方数据的版权归原服务提供商所有。如有侵权，请联系删除。