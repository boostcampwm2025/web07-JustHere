export const generateOgHtml = (title: string, description: string, imageUrl: string, redirectUrl: string) => {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const safeImageUrl = escapeHtml(imageUrl)
  const safeRedirectUrl = escapeHtml(redirectUrl)

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${safeTitle}</title>
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:url" content="${safeRedirectUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="딱! 여기" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    
    <meta http-equiv="refresh" content="0;url=${safeRedirectUrl}">
    <script>window.location.href = ${JSON.stringify(redirectUrl)};</script>
</head>
<body>
    <p>리다이렉트 중... <a href="${safeRedirectUrl}">이동하지 않으면 클릭하세요</a></p>
</body>
</html>`
}

const escapeHtml = (value: string) => {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
