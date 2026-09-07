/* 模板注册表：后续新增模板/风格时在此注册即可自动出现在下拉框中
 *
 * 模板接口约定：
 * {
 *   id:    'classic',
 *   name:  '经典白 · Classic',
 *   width: 970, height: 1620,          // 逻辑画布尺寸
 *   render(ctx, data)                   // 纯绘制函数，data 为全局状态（含图片 HTMLImageElement）
 * }
 */
'use strict';

var TemplateRegistry = {
  _templates: {},
  register: function (t) {
    if (!t || !t.id || typeof t.render !== 'function') {
      throw new Error('模板缺少 id 或 render');
    }
    this._templates[t.id] = t;
  },
  get: function (id) { return this._templates[id] || null; },
  list: function () { return Object.keys(this._templates).map(k => this._templates[k]); },
};
