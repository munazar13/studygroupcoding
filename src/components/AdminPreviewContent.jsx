const KNOWN_LANGUAGES = [
  'php',
  'html',
  'css',
  'js',
  'javascript',
  'txt',
  'sql',
  'json'
];

function parseCodeBlock(part) {
  const cleanPart = String(part || '').replace(/^\n/, '').trimEnd();
  const lines = cleanPart.split('\n');

  let language = 'text';
  let code = cleanPart;

  const firstLine = lines[0]?.trim() || '';

  if (lines.length > 1 && KNOWN_LANGUAGES.includes(firstLine.toLowerCase())) {
    language = firstLine.toLowerCase();
    code = lines.slice(1).join('\n').trimEnd();
  } else {
    const oneLineMatch = cleanPart.match(/^([a-zA-Z0-9_-]+)\s+([\s\S]*)$/);

    if (
      oneLineMatch &&
      KNOWN_LANGUAGES.includes(oneLineMatch[1].toLowerCase())
    ) {
      language = oneLineMatch[1].toLowerCase();
      code = oneLineMatch[2].trimEnd();
    }
  }

  return {
    language,
    code
  };
}

export default function AdminPreviewContent({
  content,
  prefix = 'admin-preview'
}) {
  const rawContent = Array.isArray(content)
    ? content.join('\n\n')
    : String(content || '');

  if (!rawContent.trim()) {
    return <p className="preview-empty">Belum ada isi untuk dipreview.</p>;
  }

  const fence = String.fromCharCode(96).repeat(3);
  const parts = rawContent.split(fence);
  const result = [];

  parts.forEach((part, index) => {
    const isCodeBlock = index % 2 === 1;

    if (isCodeBlock) {
      const parsed = parseCodeBlock(part);

      result.push(
        <pre
          className={`lesson-code-block admin-preview-code language-${parsed.language}`}
          key={`${prefix}-code-${index}`}
        >
          <code>{parsed.code}</code>
        </pre>
      );

      return;
    }

    const blocks = part
      .split(/\n{2,}/g)
      .map((block) => block.trim())
      .filter(Boolean);

    blocks.forEach((block, blockIndex) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      lines.forEach((line, lineIndex) => {
        const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);

        if (imageMatch) {
          const altText = imageMatch[1] || 'Gambar preview';
          const imageUrl = imageMatch[2] || '';

          result.push(
            <figure
              className="lesson-image-block admin-preview-image"
              key={`${prefix}-image-${index}-${blockIndex}-${lineIndex}`}
            >
              <img src={imageUrl} alt={altText} loading="lazy" />
              <figcaption>{altText}</figcaption>
            </figure>
          );

          return;
        }

        result.push(
          <p key={`${prefix}-paragraph-${index}-${blockIndex}-${lineIndex}`}>
            {line}
          </p>
        );
      });
    });
  });

  return <div className="admin-preview-content">{result}</div>;
}