const TAG_REGEX = /<[^>]*>/g;
const HEADING_REGEX = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i;
const IMAGE_SRC_REGEX = /<img[^>]+src="([^">]+)"/i;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function stripHtmlToText(html: string): string {
  return normalizeWhitespace(
    html
      .replace(/&nbsp;/g, " ")
      .replace(TAG_REGEX, " ")
  );
}

export function extractTitleFromHtml(html: string): string {
  const headingMatch = html.match(HEADING_REGEX);
  if (headingMatch?.[1]) {
    const headingText = stripHtmlToText(headingMatch[1]);
    if (headingText) return headingText;
  }

  const firstLine = stripHtmlToText(html).split("\n")[0] ?? "";
  return normalizeWhitespace(firstLine);
}

export function extractFirstImageSrc(html: string): string | null {
  const imgMatch = html.match(IMAGE_SRC_REGEX);
  return imgMatch ? imgMatch[1] : null;
}
