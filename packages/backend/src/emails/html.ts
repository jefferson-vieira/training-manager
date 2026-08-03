// `.ai` is a real TLD, so "FIT.AI" passes the URL detectors in Gmail, Apple Mail
// and Outlook and turns into a link to a domain we do not own. Those detectors
// match the pattern within a single text node, so splitting the dot into its own
// element breaks the match without changing what the reader sees, selects or
// copies. The `<span>` deliberately carries no attributes: it inherits the
// surrounding typography, including the underline when the brand sits inside a
// link.
export const BRAND_HTML = 'FIT<span>.</span>AI';

// Companion for Apple Mail, which tags whatever it detects with
// `x-apple-data-detectors` and restyles it even when it stops short of linking.
export const DATA_DETECTORS_RESET = `<style type="text/css">
a[x-apple-data-detectors] {
  color: inherit !important;
  text-decoration: inherit !important;
  font-size: inherit !important;
  font-family: inherit !important;
  font-weight: inherit !important;
  line-height: inherit !important;
}
</style>`;

const ESCAPED_BY_CHARACTER: Record<string, string> = {
  "'": '&#39;',
  '"': '&quot;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

// Names and e-mail addresses come from user input and are interpolated into the
// message body, so a name containing `<` would otherwise break the markup.
export function escapeHtml(value: string) {
  return value.replace(/["&'<>]/g, (character) => {
    return ESCAPED_BY_CHARACTER[character];
  });
}
