(function () {
  var isInIframe = window.self !== window.top;

  function applyThemeToDOM(theme) {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  if (isInIframe) {
    window.addEventListener('message', function (event) {
      if (event.data && typeof event.data.theme === 'string') {
        var theme = event.data.theme;
        if (theme === 'light' || theme === 'dark') {
          applyThemeToDOM(theme);
        }
      }
    });
  } else {
    applyThemeToDOM('light');
  }

  if (isInIframe) {
    var reported = {};
    window.addEventListener('error', function (event) {
      if (!event || !event.message) return;
      var key =
        event.message + '|' + (event.filename || '') + '|' + (event.lineno || 0);
      if (reported[key]) return;
      reported[key] = true;
      try {
        window.parent.postMessage(
          {
            type: 'sandbox-runtime-error',
            payload: {
              message: String(event.message).slice(0, 500),
              filename: event.filename || '',
              lineno: event.lineno || 0,
              colno: event.colno || 0,
              stack:
                event.error && event.error.stack
                  ? String(event.error.stack).slice(0, 2000)
                  : '',
            },
          },
          '*'
        );
      } catch (_err) {
        // Ignore cross-origin postMessage errors
      }
    });
  }
})();
