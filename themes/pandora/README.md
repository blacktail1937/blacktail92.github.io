# 🗝️ Pandora Theme

基于 Hugo + Tailwind CSS 的简洁博客主题，支持明暗切换和本地搜索。

## 特性

- ✨ 简洁优雅的 Timeline 时间线首页
- 🌗 明暗主题切换（带 localStorage 持久化）
- 🔍 本地全文搜索（Fuse.js）
- 📖 自动目录（TOC），支持滚动跟随
- ⏱ 阅读时间与字数统计
- 🏷️ 标签和分类支持
- 🎨 使用 Maple Mono NF CN 字体
- 📱 完全响应式
- 🚀 基于 Tailwind CSS v4

## 快速开始

```bash
# 安装依赖并构建 CSS
cd themes/pandora
npm install && npm run build:css

# 回到站点根目录
cd ../..
hugo server -D
```

## 字体

主题默认使用 **Maple Mono NF CN** 字体（WOFF2 格式，~6MB/weight）。

如需更换字体，编辑 `assets/css/main.css` 中的 `@font-face` 部分即可。

## 配置

参考 `hugo.toml`：

```toml
baseURL = "https://example.com"
title = "枫林驿站"
theme = "pandora"

[params]
  description = "站点描述"
  author = "你的名字"
  avatar = "/images/avatar.jpg"
```

## 自定义

编辑 `assets/css/main.css` 中的 CSS 变量来改变配色方案：

```css
:root {
  --accent: #49b1f5;   /* 主题色 */
  --bg: #ffffff;        /* 背景色 */
  --text: #2c2c2c;      /* 文字颜色 */
}
```

修改后重新构建：

```bash
cd themes/pandora && npm run build:css
```
