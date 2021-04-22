module.exports = function ({ title, body }) {
  return `<!doctype html>
    <meta charset=utf-8>
    <title>${title}</title>
    <div style="margin:0 auto; width: 100%; max-width: 1024px; text-align: center;">
      ${body}
    </div>
  `
}
