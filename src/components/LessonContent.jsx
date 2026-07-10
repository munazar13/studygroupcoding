import { useMemo, useState } from 'react';
import CodePlayground from './CodePlayground';

const KNOWN_LANGUAGES = ['php', 'html', 'css', 'js', 'javascript', 'txt', 'text', 'sql', 'json'];
const PREVIEW_LANGUAGES = new Set(['html', 'css', 'js', 'javascript']);

function normalizeCodeBlock(rawBlock = '') {
  const cleanBlock = String(rawBlock || '').replace(/^\n/, '').trimEnd();
  const lines = cleanBlock.split('\n');
  const firstLine = lines[0]?.trim() || '';

  if (lines.length > 1 && KNOWN_LANGUAGES.includes(firstLine.toLowerCase())) {
    return {
      language: firstLine.toLowerCase(),
      code: lines.slice(1).join('\n').trimEnd()
    };
  }

  const oneLineMatch = cleanBlock.match(/^([a-zA-Z0-9_-]+)\s+([\s\S]*)$/);

  if (oneLineMatch && KNOWN_LANGUAGES.includes(oneLineMatch[1].toLowerCase())) {
    return {
      language: oneLineMatch[1].toLowerCase(),
      code: oneLineMatch[2].trimEnd()
    };
  }

  return {
    language: 'text',
    code: cleanBlock
  };
}

function createParagraphKey(prefix, index, blockIndex, lineIndex) {
  return `${prefix}-paragraph-${index}-${blockIndex}-${lineIndex}`;
}

function createPreviewDocument(code, language) {
  const cleanLanguage = language === 'javascript' ? 'js' : language;
  const safeCode = String(code || '');

  if (cleanLanguage === 'html') {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; padding: 16px; line-height: 1.5; color: #111827; }
  button, input, textarea, select { font: inherit; margin: 4px 0; }
</style>
</head>
<body>
${safeCode}
</body>
</html>`;
  }

  if (cleanLanguage === 'css') {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${safeCode}</style>
</head>
<body>
  <header>
    <h1>Preview CSS</h1>
    <p>Ini contoh elemen untuk melihat pengaruh CSS.</p>
  </header>
  <main>
    <section class="card">
      <h2>Card Contoh</h2>
      <p>Ubah CSS lalu lihat hasil visualnya di sini.</p>
      <button>Tombol Contoh</button>
    </section>
    <form>
      <label>Nama</label>
      <input placeholder="Input contoh" />
    </form>
  </main>
</body>
</html>`;
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; padding: 16px; line-height: 1.5; color: #111827; }
  .box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
</style>
</head>
<body>
  <div class="box">
    <h1>Preview JavaScript</h1>
    <p id="demo">Teks awal.</p>
    <button id="tombol">Klik contoh</button>
  </div>
  <script>
    try {
      ${safeCode}
    } catch (error) {
      document.body.insertAdjacentHTML('beforeend', '<pre style="color:red">' + error.message + '</pre>');
    }
  </script>
</body>
</html>`;
}

function splitInitialCodeForPlayground(code, language) {
  const cleanLanguage = language === 'javascript' ? 'js' : language;

  if (cleanLanguage === 'html') {
    return { html: code, css: '', js: '' };
  }

  if (cleanLanguage === 'css') {
    return { html: '<div class="card">\n  <h1>Preview CSS</h1>\n  <p>Ubah CSS lalu lihat hasilnya.</p>\n  <button>Tombol Contoh</button>\n</div>', css: code, js: '' };
  }

  if (cleanLanguage === 'js') {
    return {
      html: '<div class="box">\n  <h1>Preview JavaScript</h1>\n  <p id="demo">Teks awal.</p>\n  <button id="tombol">Klik contoh</button>\n</div>',
      css: '.box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }',
      js: code
    };
  }

  return { html: code, css: '', js: '' };
}

function LessonCodeBlock({ code, language, blockKey }) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const canPreview = PREVIEW_LANGUAGES.has(language);
  const previewDocument = useMemo(() => createPreviewDocument(code, language), [code, language]);
  const playgroundCode = useMemo(() => splitInitialCodeForPlayground(code, language), [code, language]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn('Gagal menyalin kode:', error);
    }
  }

  return (
    <div className={`lesson-code-frame language-${language}`} key={blockKey}>
      <div className="lesson-code-toolbar">
        <span>{language === 'txt' ? 'text' : language}</span>
        <div className="lesson-code-actions">
          {canPreview ? (
            <button type="button" onClick={() => setPreviewOpen((open) => !open)}>
              {previewOpen ? 'Tutup hasil' : 'Lihat hasil'}
            </button>
          ) : null}
          {canPreview ? (
            <button type="button" onClick={() => setPlaygroundOpen((open) => !open)}>
              {playgroundOpen ? 'Tutup playground' : 'Coba ubah kode'}
            </button>
          ) : null}
          <button type="button" onClick={copyCode}>{copied ? 'Tersalin' : 'Salin kode'}</button>
        </div>
      </div>
      <pre className="lesson-code-block"><code>{code}</code></pre>
      {canPreview && previewOpen ? (
        <div className="lesson-live-preview">
          <div className="lesson-preview-head">
            <strong>Preview hasil</strong>
            <span>Sandbox latihan, bukan hasil final website</span>
          </div>
          <iframe title={`preview-${blockKey}`} srcDoc={previewDocument} sandbox="allow-scripts" />
        </div>
      ) : null}
      {canPreview && playgroundOpen ? (
        <div className="lesson-code-playground-wrap">
          <CodePlayground
            compact
            title="Playground dari contoh kode"
            description="Ubah kode contoh ini, klik Jalankan, lalu lihat outputnya. Cocok untuk belajar dengan mencoba langsung."
            initialCode={playgroundCode}
          />
        </div>
      ) : null}
    </div>
  );
}

function renderInlineText(line) {
  return line;
}

function renderPlainBlock(block, index, keyPrefix) {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const detailsMatch = lines.join('\n').match(/^(Jawaban|Solusi|Petunjuk)\s*:\s*([\s\S]+)/i);
  if (detailsMatch && lines.length <= 4) {
    return [
      <details className="lesson-reveal" key={`${keyPrefix}-details-${index}`}>
        <summary>{detailsMatch[1]} tersembunyi</summary>
        <p>{detailsMatch[2]}</p>
      </details>
    ];
  }

  const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
  if (bulletLines.length === lines.length) {
    return [
      <ul className="lesson-list" key={`${keyPrefix}-ul-${index}`}>
        {bulletLines.map((line, lineIndex) => (
          <li key={`${keyPrefix}-ul-${index}-${lineIndex}`}>{renderInlineText(line.replace(/^[-*]\s+/, ''))}</li>
        ))}
      </ul>
    ];
  }

  const numberedLines = lines.filter((line) => /^\d+[.)]\s+/.test(line));
  if (numberedLines.length === lines.length) {
    return [
      <ol className="lesson-list" key={`${keyPrefix}-ol-${index}`}>
        {numberedLines.map((line, lineIndex) => (
          <li key={`${keyPrefix}-ol-${index}-${lineIndex}`}>{renderInlineText(line.replace(/^\d+[.)]\s+/, ''))}</li>
        ))}
      </ol>
    ];
  }

  return lines.map((line, lineIndex) => {
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);

    if (imageMatch) {
      const altText = imageMatch[1] || 'Gambar materi';
      const imageUrl = imageMatch[2] || '';

      return (
        <figure className="lesson-image-block" key={`${keyPrefix}-image-${index}-${lineIndex}`}>
          <img
            src={imageUrl}
            alt={altText}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <figcaption>{altText}</figcaption>
        </figure>
      );
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(4, headingMatch[1].length + 2);
      const HeadingTag = `h${level}`;

      return (
        <HeadingTag className="lesson-heading" key={`${keyPrefix}-heading-${index}-${lineIndex}`}>
          {headingMatch[2]}
        </HeadingTag>
      );
    }

    const calloutMatch = line.match(/^(Penting|Catatan|Tips|Ingat|Checkpoint|Latihan|Praktik)\s*:\s*(.+)$/i);
    if (calloutMatch) {
      return (
        <div className="lesson-callout" key={`${keyPrefix}-callout-${index}-${lineIndex}`}>
          <strong>{calloutMatch[1]}:</strong>
          <p>{calloutMatch[2]}</p>
        </div>
      );
    }

    if (/^>\s+/.test(line)) {
      return (
        <blockquote className="lesson-quote" key={`${keyPrefix}-quote-${index}-${lineIndex}`}>
          {line.replace(/^>\s+/, '')}
        </blockquote>
      );
    }

    return (
      <p key={createParagraphKey(keyPrefix, index, 0, lineIndex)}>
        {renderInlineText(line)}
      </p>
    );
  });
}

export default function LessonContent({ content, className = '', keyPrefix = 'lesson-content' }) {
  const rawContent = Array.isArray(content)
    ? content.join('\n\n')
    : String(content || '');

  if (!rawContent.trim()) {
    return null;
  }

  const parts = rawContent.split(/```/g);
  const children = parts.flatMap((part, index) => {
    const isCodeBlock = index % 2 === 1;

    if (isCodeBlock) {
      const { language, code } = normalizeCodeBlock(part);

      return [
        <LessonCodeBlock
          blockKey={`${keyPrefix}-code-${index}`}
          code={code}
          language={language}
          key={`${keyPrefix}-code-${index}`}
        />
      ];
    }

    const blocks = part
      .split(/\n{2,}/g)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks.flatMap((block, blockIndex) => renderPlainBlock(block, `${index}-${blockIndex}`, keyPrefix));
  });

  return <div className={`lesson-content ${className}`.trim()}>{children}</div>;
}
