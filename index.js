'use strict';

const noindexFilter = require('./lib/filter');

/**
 * 向 Hexo 注册 noindex 过滤器。
 *
 * Hexo 5.x 加载插件时，会把 Hexo 实例作为 `hexo` 参数注入插件文件。
 * 同时导出该函数，方便在普通 require() 场景下手动注册。
 *
 * @param {object} hexo Hexo 实例
 * @returns {void}
 * @throws {TypeError} 传入对象不是有效的 Hexo 实例时抛出
 */
function register(hexo) {
  if (!hexo || !hexo.extend || !hexo.extend.filter) {
    throw new TypeError('hexo-noindex must be registered with a Hexo instance');
  }

  // after_render:html 会在主题布局片段和最终页面渲染后触发。
  // lib/filter.js 会通过 data.page 判断是否为最终页面，避免处理中间片段。
  hexo.extend.filter.register('after_render:html', noindexFilter);
}

// Hexo 的插件加载器会把插件源码包进一个带 `hexo` 参数的函数中执行。
// 直接 require 时不存在该变量，因此只导出 register，由调用方显式注册。
if (typeof hexo !== 'undefined') {
  register(hexo);
}

module.exports = register;
