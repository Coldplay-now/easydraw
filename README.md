# 🎨 EasyDraw - 美式漫画生成器

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![豆包AI](https://img.shields.io/badge/豆包AI-Seedream4.0-orange.svg)](https://www.doubao.com/)

一个基于豆包AI Seedream 4.0模型的现代化美式漫画风格图片生成器，支持单图生成、批量生成、多种图片尺寸选择和PDF导出功能，提供简洁易用的Web界面。

![项目交互界面](/public/assets/20251018-175453.jpeg)

## ✨ 功能特性

- 🎨 **美式漫画风格图片生成** - 基于豆包AI Seedream 4.0模型
- 🖼️ **多种图片尺寸** - 支持4:3 (2304x1728) 和 3:4 (1728x2304) 比例
- 📚 **单图生成** - 快速生成单张图片，支持实时预览
- 🔄 **批量生成** - 支持故事分镜批量生成，实时进度显示
- 📄 **PDF导出** - 将生成的图片批量导出为PDF文档
- 📱 **响应式设计** - 完美支持桌面端和移动端
- ⚡ **统一进度效果** - 单图和批量生成具有一致的等待动画
- 🎯 **现代化UI** - 玻璃态效果和平滑动画

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express.js
- **AI服务**: 豆包AI Seedream 4.0 模型
- **PDF处理**: PDFKit
- **样式**: 现代化CSS渐变、玻璃态效果和动画

## 🚀 快速开始

### 前置要求

- Node.js 18.0 或更高版本
- 豆包AI API密钥

### 安装步骤

1. **克隆项目**
```bash
git clone git@github.com:Coldplay-now/easydraw.git
cd easydraw
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的豆包API密钥：
```env
DOUBAO_API_KEY=你的豆包API密钥
```

4. **启动服务**
```bash
npm start
```

5. **访问应用**
打开浏览器访问 `http://localhost:3000`

## 📖 使用说明

### 单图生成
1. 在输入框中描述你想要生成的图片内容
2. 选择图片尺寸（4:3 或 3:4）
3. 点击"生成图片"按钮
4. 等待图片生成完成并查看结果

### 批量生成
1. 选择预设的故事模板或上传自定义JSON文件
2. 系统将自动解析故事分镜
3. 点击"批量生成"开始生成所有分镜
4. 实时查看生成进度和结果
5. 生成完成后可导出为PDF

## 📁 项目结构

```
easydraw/
├── book/                    # 故事模板文件
│   ├── 孙悟空拉斯维加斯奇遇记.json
│   ├── 猪八戒勇闯拉斯维加斯.json
│   ├── 美国西部废土牛仔绝处逢生.json
│   └── 迈阿密沙滩浪漫故事.json
├── public/                  # 静态资源文件
│   ├── assets/             # 图片等资源
│   ├── index.html          # 主页面
│   ├── script.js           # 前端逻辑
│   └── style.css           # 样式文件
├── images/                  # 生成的图片存储目录
├── temp/                    # 临时文件目录
├── .env.example            # 环境变量示例
├── .gitignore              # Git忽略文件
├── server.js               # Express服务器主文件
├── images_to_pdf.py        # Python PDF处理脚本
├── package.json            # 项目依赖配置
├── system_prompt.md        # AI系统提示词
└── README.md               # 项目说明文档
```

## 🔌 API接口

### 生成单张图片

**POST** `/generate-image`

**请求体**:
```json
{
  "prompt": "一个勇敢的牛仔在沙漠中骑马",
  "size": "4:3"
}
```

**响应**:
```json
{
  "success": true,
  "imagePath": "/temp/session-id/timestamp.png",
  "sessionId": "unique-session-id"
}
```

### 批量生成图片

**POST** `/generate-batch`

**请求体**:
```json
{
  "storyData": {
    "title": "故事标题",
    "panels": [
      {
        "panel_number": 1,
        "description": "分镜描述"
      }
    ]
  },
  "size": "4:3"
}
```

### 导出PDF

**POST** `/export-pdf`

**请求体**:
```json
{
  "sessionId": "session-id",
  "title": "文档标题"
}
```

## ⚙️ 环境变量

| 变量名 | 描述 | 必填 | 默认值 |
|--------|------|------|--------|
| `DOUBAO_API_KEY` | 豆包AI API密钥 | ✅ | - |
| `PORT` | 服务器端口 | ❌ | 3000 |

## 🎨 特色功能

### 智能图片尺寸适配
- **4:3 比例** (2304x1728): 适合横向展示的场景
- **3:4 比例** (1728x2304): 适合竖向展示的场景
- PDF导出时自动选择最佳页面方向

### 统一的用户体验
- 单图和批量生成使用相同的加载动画
- 实时进度显示和状态更新
- 一致的视觉反馈和交互体验

### 高效的批量处理
- 支持大量分镜的批量生成
- 实时显示生成进度和统计信息
- 错误处理和重试机制

## 🔧 开发说明

### 自定义样式
项目使用现代化的CSS特性：
- CSS渐变背景和玻璃态效果
- 平滑的动画过渡效果
- 响应式布局设计
- 统一的加载动画组件

### 扩展功能
可以轻松扩展以下功能：
- 添加更多图片尺寸选项
- 支持更多AI模型
- 添加用户账户系统
- 实现图片编辑功能
- 添加历史记录和收藏功能

### 故事模板格式
```json
{
  "title": "故事标题",
  "description": "故事描述",
  "panels": [
    {
      "panel_number": 1,
      "description": "分镜描述",
      "characters": ["角色列表"],
      "setting": "场景设置"
    }
  ]
}
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持与反馈

- 🐛 **Bug报告**: [提交Issue](https://github.com/Coldplay-now/easydraw/issues)
- 💡 **功能建议**: [功能请求](https://github.com/Coldplay-now/easydraw/issues)
- 📧 **联系我们**: 通过GitHub Issues联系开发团队

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！