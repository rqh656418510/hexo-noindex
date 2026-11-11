# hexo-noindex

## 用途

用于告诉 Google 等搜索引擎不要索引页面内容，并可按需配置是否跟随页面中的链接。当 Markdown 文件的 Front Matter 中把 `noindex` 明确设为布尔值 `true` 时，在渲染完成的 **Post** 和 **Page** HTML 的 `</head>` 前插入：

```html
<meta name="robots" content="noindex, nofollow">
```

> **规则说明**：只有 `noindex` 的布尔值设置为 `true` 才会触发标签插入；`noindex: false`、未填写 `noindex`、以及字符串 `noindex: "true"` 都不会触发。

## 安装

```bash
npm install hexo-noindex --save
```

Hexo 会自动加载 `package.json` 中名称以 `hexo-` 开头的依赖。基础使用不需要额外配置：`enable` 默认 `true`，`follow` 默认 `false`；需要调整时再按下方说明配置插件。

## 使用

在任意 Post 或 Page 的 Markdown Front Matter 中加入：

```yaml
---
title: C++ 对象模型深入探索
date: 2026-01-01 00:00:00
noindex: true
---
```

生成后的 HTML 会包含：

```html
<head>
  <!-- ... -->
  <meta name="robots" content="noindex, nofollow">
</head>
```

## 插件配置

插件配置写在 Hexo 博客根目录的 `_config.yml` 中，配置键为 `hexo-noindex`：

```yaml
hexo-noindex:
  enable: true
  follow: false
```

### enable

`enable` 控制插件是否启用，默认值为 `true`。不写 `hexo-noindex` 配置段，或省略 `enable`，插件默认会保持启用。

需要关闭插件时：

```yaml
hexo-noindex:
  enable: false
```

关闭后，即使页面的 Front Matter 中写了 `noindex: true`，也不会注入任何标签。

### follow

`follow` 控制标签中的链接跟随策略，默认值为 `false`：

```yaml
hexo-noindex:
  enable: true
  follow: false
```

输出：

```html
<meta name="robots" content="noindex, nofollow">
```

`follow` 设置为 `true` 时：

```yaml
hexo-noindex:
  enable: true
  follow: true
```

输出：

```html
<meta name="robots" content="noindex, follow">
```

`follow` 只在 `_config.yml` 中配置，Post / Page 的 Front Matter 中不需要、也不会读取同名配置。

### 行为细节

- 只处理 Hexo 的 **Post** 和 **Page** 文档，不会影响由其他 generator 生成的索引页、归档页等。
- 标签插入到第一个 `</head>` 之前，匹配时忽略大小写和 `</head >` 中的空白。
- 如果页面中已经存在包含 `noindex` 和当前目标 `follow` / `nofollow` 的 `robots` meta 标签，则不会重复添加。
- 如果只存在 `noindex`，插件会再添加一条完整的目标标签。
- 对于 `layout: false`，或主题输出中没有 `</head>` 的页面，因为不存在可插入的 `<head>`，插件会保持原样。

## 插件兼容性

| 项目              | 版本       |
|-------------------|------------|
| Hexo              | >= 5.4.0   |
| Node.js（运行时） | >= 10.13.0 |

插件使用 Hexo 的 `after_render:html` 过滤器，并从该阶段提供的页面 locals 中读取 Front Matter。只有完整页面渲染结束时才会拿到 `data.page`，因此不会误改主题布局片段的中间结果。

## SEO 提示

- 搜索引擎需要能够抓取页面，才能看到 `noindex`。不要同时在 `robots.txt` 中用 `Disallow` 完全阻止抓取该页面，否则爬虫可能看不到这个标签。
- `noindex` 是「建议不再展示」，已有索引需要等搜索引擎重新抓取后才会逐步移除。
- `follow: true` 表示只禁止索引页面，仍允许搜索引擎跟随页面中的链接。
- `follow: false` 会输出 `nofollow`，表示不跟随页面中的链接，但它不是安全边界，敏感内容仍应通过权限控制保护。

## License

MIT
