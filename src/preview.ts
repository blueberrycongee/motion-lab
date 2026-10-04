export function previewSource(source: string): string {
  // Gallery canvases only need one backing pixel per CSS pixel. Keep the original
  // work and its native animation timing intact for the detail view and copying.
  const bootstrap = '<script>Object.defineProperty(window,"devicePixelRatio",{value:Math.min(devicePixelRatio,1)});<\/script>';
  return source.replace(/<head(?:\s[^>]*)?>/i, (head) => head + bootstrap);
}
