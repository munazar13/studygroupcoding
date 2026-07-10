import { useMemo, useState } from 'react';

function createPreviewSource({ html = '', css = '', js = '' }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: Arial, sans-serif; padding: 16px; line-height: 1.5; color: #111827; }
  button, input, textarea, select { font: inherit; margin: 4px 0; }
  .preview-note { padding: 10px 12px; border-radius: 10px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; }
  ${css}
</style>
</head>
<body>
${html || '<div class="preview-note">Tulis HTML di editor, lalu klik Jalankan.</div>'}
<script>
  try {
    ${js}
  } catch (error) {
    document.body.insertAdjacentHTML('beforeend', '<pre style="white-space:pre-wrap;color:#b91c1c;background:#fee2e2;padding:10px;border-radius:8px;">' + error.message + '</pre>');
  }
</script>
</body>
</html>`;
}

function normalizeInitialCode(initialCode = {}) {
  if (typeof initialCode === 'string') {
    return {
      html: initialCode,
      css: '',
      js: ''
    };
  }

  return {
    html: String(initialCode.html || ''),
    css: String(initialCode.css || ''),
    js: String(initialCode.js || initialCode.javascript || '')
  };
}

export default function CodePlayground({
  title = 'Playground Kode',
  description = 'Coba ubah kode, jalankan, lalu lihat hasilnya.',
  initialCode = {},
  compact = false
}) {
  const normalizedInitial = useMemo(() => normalizeInitialCode(initialCode), [initialCode]);
  const [html, setHtml] = useState(normalizedInitial.html);
  const [css, setCss] = useState(normalizedInitial.css);
  const [js, setJs] = useState(normalizedInitial.js);
  const [previewCode, setPreviewCode] = useState(normalizedInitial);
  const [activeTab, setActiveTab] = useState('html');
  const [mobilePanel, setMobilePanel] = useState('code');
  const [copied, setCopied] = useState(false);

  const previewSource = useMemo(() => createPreviewSource({ html, css, js }), [html, css, js]);

  function runPreview() {
    setMobilePanel('preview');
  }

  function resetCode() {
    setHtml(normalizedInitial.html);
    setCss(normalizedInitial.css);
    setJs(normalizedInitial.js);
    setPreviewCode(normalizedInitial);
    setActiveTab('html');
  }

  async function copyAllCode() {
    const text = `<!-- HTML -->\n${html}\n\n/* CSS */\n${css}\n\n// JavaScript\n${js}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn('Gagal menyalin playground:', error);
    }
  }

  const editorValue = activeTab === 'css' ? css : activeTab === 'js' ? js : html;
  const editorSetter = activeTab === 'css' ? setCss : activeTab === 'js' ? setJs : setHtml;

  return (
    <section className={`code-playground ${compact ? 'compact' : ''}`.trim()}>
      <div className="code-playground-head">
        <div>
          <p className="eyebrow">Output Coding</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="code-playground-actions">
          <button type="button" onClick={runPreview}>Lihat Preview</button>
          <button type="button" onClick={resetCode}>Reset</button>
          <button type="button" onClick={copyAllCode}>{copied ? 'Tersalin' : 'Salin semua'}</button>
        </div>
      </div>

      <div className="playground-mobile-switch" aria-label="Pilih panel playground">
        <button className={mobilePanel === 'code' ? 'active' : ''} type="button" onClick={() => setMobilePanel('code')}>Kode</button>
        <button className={mobilePanel === 'preview' ? 'active' : ''} type="button" onClick={() => setMobilePanel('preview')}>Preview</button>
      </div>

      <div className="code-playground-grid">
        <div className={`code-playground-editor ${mobilePanel === 'code' ? 'active-mobile' : ''}`.trim()}>
          <div className="code-editor-tabs">
            {['html', 'css', 'js'].map((tab) => (
              <button
                className={activeTab === tab ? 'active' : ''}
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          <textarea
            spellCheck="false"
            value={editorValue}
            onChange={(event) => editorSetter(event.target.value)}
            aria-label={`Editor ${activeTab}`}
          />
          <p className="playground-help">Ubah kode pelan-pelan, output akan langsung mengikuti perubahan. Tombol Lihat Preview membantu pindah ke panel preview di layar kecil.</p>
        </div>

        <div className={`code-playground-preview ${mobilePanel === 'preview' ? 'active-mobile' : ''}`.trim()}>
          <div className="preview-browser-bar">
            <span />
            <span />
            <span />
            <strong>Preview</strong>
          </div>
          <iframe title={`${title} preview`} srcDoc={previewSource} sandbox="allow-scripts" />
        </div>
      </div>
    </section>
  );
}
