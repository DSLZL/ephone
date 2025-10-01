// style helpers
if (typeof window.applyScopedCss !== 'function') {
  window.applyScopedCss = function(cssString, scopeId, styleTagId) {
    try {
      var styleTag = document.getElementById(styleTagId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleTagId;
        document.head.appendChild(styleTag);
      }
      var scopedCss = cssString.replace(/(^|\})\s*([^@\s][^{]+)\s*\{/g, function(match, p1, selector){
        var selectors = selector.split(',').map(function(sel){ return scopeId + ' ' + sel.trim(); });
        return (p1 || '') + ' ' + selectors.join(', ') + ' {';
      });
      styleTag.textContent = scopedCss;
    } catch (e) { /* no-op */ }
  };
}
