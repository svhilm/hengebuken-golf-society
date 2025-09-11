// GitHub Pages 404 Fix - Suppress error popups
console.log('🔧 404 Fix script loaded');

// Override window.onerror to suppress 404 popups
window.addEventListener('error', function(event) {
  // Suppress 404 errors for common missing assets
  if (event.message && (
    event.message.includes('404') || 
    event.message.includes('Not Found') ||
    event.filename && (
      event.filename.includes('favicon.ico') ||
      event.filename.includes('logo.png') ||
      event.filename.includes('.ico') ||
      event.filename.includes('.png')
    )
  )) {
    console.log('🔇 Suppressed 404 error:', event.message);
    event.preventDefault();
    return true; // Prevent default error handling
  }
});

// Override fetch to catch 404s silently
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  return originalFetch.apply(this, arguments)
    .catch(error => {
      if (error.message.includes('404')) {
        console.log('🔇 Suppressed fetch 404:', url);
        return { ok: false, status: 404 }; // Return dummy response
      }
      throw error; // Re-throw other errors
    });
};

console.log('✅ 404 error suppression active');