'use strict';

/**
 * hexo-noindex 核心过滤器。
 *
 * 处理流程：
 * 1. 仅在最终 HTML 页面渲染完成，且页面类型为 Post 或 Page 时继续；
 * 2. 读取 _config.yml 中的插件配置，enable 为 false 时直接跳过；
 * 3. 读取 Front Matter 的 noindex，严格等于布尔值 true 才注入标签；
 * 4. follow 由 _config.yml 控制，在第一个 </head> 前插入对应的 robots meta。
 */

// 插件在 Hexo _config.yml 中使用的配置键。
const PLUGIN_CONFIG_KEY = 'hexo-noindex';

// 匹配 </head>，兼容大小写以及 </HEAD > 这类空白写法。
const CLOSING_HEAD_RE = /<\/head\s*>/i;

// 一次性提取 HTML 中的所有 meta 标签，用于检查是否已经存在目标标签。
const META_TAG_RE = /<meta\b[^>]*>/gi;

// 判断 meta 标签的 name 属性是否为 robots，兼容双引号、单引号和无引号。
const ROBOTS_NAME_RE = /\bname\s*=\s*(?:"robots"|'robots'|robots(?=[\s/>]))/i;

// 提取 meta 标签的 content 属性值，同样兼容三种引号写法。
const CONTENT_RE = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * 读取 robots meta 标签的 content 属性值。
 *
 * @param {string} tag 单个 meta 标签的 HTML 字符串
 * @returns {string|null} content 值；不是 robots 标签或没有 content 时返回 null
 */
function getRobotsContent(tag) {
  if (!ROBOTS_NAME_RE.test(tag)) return null;

  const match = tag.match(CONTENT_RE);

  if (!match) return null;

  return match[1] != null ? match[1] : (match[2] != null ? match[2] : match[3]);
}

/**
 * 判断 HTML 中是否已经存在符合当前 follow 配置的 robots 标签。
 *
 * 目标条件：
 * - 标签必须包含 noindex；
 * - follow 为 true 时，必须包含 follow，且不能包含 nofollow；
 * - follow 为 false 时，必须包含 nofollow。
 *
 * 如果已有标签的 follow 模式与当前配置不同，则返回 false，
 * 由调用方插入一条符合当前配置的目标标签。
 *
 * @param {string} html 渲染后的 HTML
 * @param {boolean} follow 是否允许搜索引擎跟随页面链接
 * @returns {boolean} 是否已存在目标标签
 */
function hasTargetRobots(html, follow) {
  const tags = html.match(META_TAG_RE);

  if (!tags) return false;

  return tags.some(tag => {
    const content = getRobotsContent(tag);

    if (content == null || !/\bnoindex\b/i.test(content)) return false;

    if (follow) {
      return /\bfollow\b/i.test(content) && !/\bnofollow\b/i.test(content);
    }

    return /\bnofollow\b/i.test(content);
  });
}

/**
 * 根据 follow 值生成对应的 robots meta 标签。
 *
 * @param {boolean} follow 是否允许搜索引擎跟随页面链接
 * @returns {string} 完整的 meta 标签
 */
function buildMetaTag(follow) {
  return `<meta name="robots" content="noindex, ${follow ? 'follow' : 'nofollow'}">`;
}

/**
 * 将 robots meta 标签插入到 HTML 的 </head> 之前。
 *
 * 以下情况会直接返回原 HTML：
 * - html 不是字符串；
 * - 页面中已经存在符合当前 follow 配置的目标标签；
 * - 页面中没有 </head>，例如 layout: false 或非完整 HTML 文档。
 *
 * @param {string} html 渲染后的 HTML
 * @param {boolean} [follow=false] 是否允许搜索引擎跟随页面链接
 * @returns {string} 插入标签后的 HTML，或原 HTML
 */
function injectMeta(html, follow = false) {
  if (typeof html !== 'string' || hasTargetRobots(html, follow)) return html;

  const match = CLOSING_HEAD_RE.exec(html);

  if (!match) return html;

  return html.slice(0, match.index) + buildMetaTag(follow) + html.slice(match.index);
}

/**
 * 读取 _config.yml 中的插件配置。
 *
 * 配置结构：
 * hexo-noindex:
 *   enable: true
 *   follow: false
 *
 * 默认值：
 * - enable: true，未配置时保持插件启用；
 * - follow: false，默认输出 nofollow。
 *
 * 仅接受布尔配置值：
 * - enable 只有显式设置为 false 时才关闭；
 * - follow 只有显式为 true 时才启用 follow。
 *
 * @param {object} ctx Hexo 上下文，即过滤器函数中的 this
 * @returns {{enable: boolean, follow: boolean}} 规范化后的插件配置
 */
function getConfig(ctx) {
  const rawConfig = ctx && ctx.config ? ctx.config[PLUGIN_CONFIG_KEY] : null;
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};

  return {
    enable: config.enable !== false,
    follow: config.follow === true
  };
}

/**
 * Hexo after_render:html 过滤器入口。
 *
 * @param {string} html 渲染后的 HTML
 * @param {object} data Hexo 渲染时传入的 locals
 * @param {object} [data.page] 当前页面数据；主题布局片段渲染时不存在
 * @returns {string|undefined} 需要修改时返回新 HTML；无需处理时返回 undefined，Hexo 会保留原值
 */
function noindexFilter(html, data) {
  // 主题布局片段渲染时没有 data.page，只处理最终页面，避免中间结果被修改。
  if (!data || !data.page) return;

  const { enable, follow } = getConfig(this);

  // enable: false 时完全关闭注入行为，便于在 _config.yml 中临时停用插件。
  if (!enable) return;

  const { page } = data;

  // Hexo 的 post/page generator 会设置 __post 或 __page 内部标记。
  // 这里只处理 Post 和 Page，避免影响索引页、归档页等其他生成页面。
  if (!page.__post && !page.__page) return;

  // noindex 采用严格布尔判断：只有 true 才注入标签。
  // 字符串 "true"、数字 1、false 以及未配置都不会触发。
  if (page.noindex !== true) return;

  // follow 只从 _config.yml 读取，不读取 Front Matter 的同名配置。
  return injectMeta(html, follow);
}

module.exports = noindexFilter;

// 导出辅助函数，便于独立调试和复用；插件运行时只会用到默认导出的过滤器。
module.exports.buildMetaTag = buildMetaTag;
module.exports.injectMeta = injectMeta;
module.exports.hasTargetRobots = hasTargetRobots;
