# 🎨 EasyDraw - 美式漫画生成器

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![豆包AI](https://img.shields.io/badge/豆包AI-Seedream4.0-orange.svg)](https://www.doubao.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Coldplay--now/easydraw-brightgreen.svg)](https://github.com/Coldplay-now/easydraw)

一个基于豆包AI Seedream 4.0模型的现代化美式漫画风格图片生成器，支持多种图片尺寸选择，提供简洁易用的Web界面。

![项目预览](/public/assets/hero-image.png)

## 功能特性

## 功能特性

- 🎨 美式漫画风格图片生成
- 📱 响应式设计，支持移动端
- 🖼️ 多种图片尺寸选择（16:9 和 9:16）
- ⚡ 实时生成预览
- 🎯 简洁易用的界面

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express.js
- **AI服务**: 豆包AI Seedream 4.0 模型
- **样式**: 现代化CSS渐变和动画效果

## 安装和运行

### 前置要求

- Node.js 14.0 或更高版本
- 豆包AI API密钥

### 安装步骤

1. 克隆项目
```bash
git clone git@github.com:Coldplay-now/easydraw.git
cd easydraw
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的豆包API密钥：
```
DOUBAO_API_KEY=你的豆包API密钥
```

4. 启动服务
```bash
npm start
```

5. 打开浏览器访问 `http://localhost:3000`

## 使用说明

1. 在输入框中描述你想要生成的图片内容
2. 选择图片尺寸（16:9 或 9:16）
3. 点击"生成图片"按钮
4. 等待图片生成完成
5. 查看生成的图片结果

## 📁 项目结构

```
easydraw/
├── public/           # 静态资源文件
│   ├── assets/       # 图片等资源
│   └── styles/       # CSS样式文件
├── routes/           # 路由文件
│   └── api.js        # API路由
├── utils/            # 工具函数
│   └── doubao.js     # 豆包AI接口封装
├── .env.example      # 环境变量示例
├── .gitignore        # Git忽略文件
├── app.js            # Express应用主文件
├── package.json      # 项目依赖配置
├── README.md         # 项目说明文档
├── system_prompt.md  # AI系统提示词
└── LICENSE           # MIT许可证文件
```

## API接口

### 生成图片

- **端点**: `POST /generate-image`
- **请求体**:
```json
{
  "prompt": "图片描述",
  "size": "图片尺寸"
}
```

- **响应**:
```json
{
  "imagePath": "/images/时间戳.png"
}
```

## 环境变量

| 变量名 | 描述 | 必填 |
|--------|------|------|
| `DOUBAO_API_KEY` | 豆包AI API密钥 | 是 |

## 开发说明

### 自定义样式

项目使用现代化的CSS特性，包括：
- CSS渐变背景
- 玻璃态效果 (glassmorphism)
- 平滑动画过渡
- 响应式布局

### 扩展功能

可以轻松扩展以下功能：
- 添加更多图片尺寸选项
- 实现图片下载功能
- 添加历史记录功能
- 支持多种AI模型

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如有问题或建议，请提交 Issue 或联系开发团队。