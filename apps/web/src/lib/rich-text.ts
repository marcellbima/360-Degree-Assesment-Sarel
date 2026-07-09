const allowedTags = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'a',
  'ol',
  'ul',
  'li',
  'br',
  'p',
  'div',
]);

export function sanitizeRichText(
  html: string,
): string {
  const template =
    document.createElement('template');

  template.innerHTML = html;

  const elements = Array.from(
    template.content.querySelectorAll('*'),
  );

  for (const element of elements) {
    const tag =
      element.tagName.toLowerCase();

    if (!allowedTags.has(tag)) {
      element.replaceWith(
        ...Array.from(element.childNodes),
      );
      continue;
    }

    for (
      const attribute of
      Array.from(element.attributes)
    ) {
      if (
        tag !== 'a' ||
        attribute.name !== 'href'
      ) {
        element.removeAttribute(
          attribute.name,
        );
      }
    }

    if (tag === 'a') {
      const href =
        element.getAttribute('href') ?? '';

      if (
        !/^(https?:\/\/|mailto:)/i.test(
          href,
        )
      ) {
        element.removeAttribute('href');
      } else {
        element.setAttribute(
          'target',
          '_blank',
        );
        element.setAttribute(
          'rel',
          'noreferrer',
        );
      }
    }
  }

  return template.innerHTML.trim();
}

export function richTextToPlainText(
  html: string,
): string {
  const element =
    document.createElement('div');

  element.innerHTML =
    sanitizeRichText(html);

  return (
    element.textContent ??
    element.innerText ??
    ''
  ).trim();
}
