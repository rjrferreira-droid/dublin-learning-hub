(async function () {
  const errorBox = (message) => {
    const el = document.getElementById('lessonView');
    if (el) {
      el.innerHTML = '<div class="notice warning"><strong>Erro ao carregar o conteúdo.</strong><br>' + message + '</div>';
    }
    console.error(message);
  };

  try {
    const response = await fetch('data.js?v=4', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível baixar data.js (' + response.status + ').');

    let source = await response.text();

    // The original content file was published with one extra closing brace at the end.
    // Preserve all lesson content and fix only that final syntax issue in memory.
    source = source.replace(/\n\};\s*$/, ';');

    (0, eval)(source);

    if (!window.DATA || !window.DATA.rafael || !window.DATA.viviane) {
      throw new Error('O arquivo de conteúdo foi lido, mas DATA não foi inicializado corretamente.');
    }

    const script = document.createElement('script');
    script.src = 'app.js?v=4';
    script.onload = () => console.log('Dublin Learning Hub loaded successfully.');
    script.onerror = () => errorBox('O conteúdo foi carregado, mas app.js não iniciou.');
    document.body.appendChild(script);
  } catch (err) {
    errorBox(err && err.message ? err.message : String(err));
  }
})();