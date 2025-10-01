// Lightweight, non-invasive performance hints
(function(){
  try {
    document.addEventListener('DOMContentLoaded', function(){
      var imgs = document.getElementsByTagName('img');
      for (var i = 0; i < imgs.length; i++) {
        if (!imgs[i].hasAttribute('decoding')) { imgs[i].decoding = 'async'; }
      }
    });
  } catch (e) { /* no-op */ }
})();
