// Security headers utility
export const setSecurityHeaders = () => {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://deno.land",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://kjdzrttanzlafyuwgiuo.supabase.co https://sheets.googleapis.com https://oauth2.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'"
  ].join('; ');

  // Set meta tags for security headers (these would ideally be set at server level)
  const addMetaTag = (httpEquiv: string, content: string) => {
    const existing = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
    if (!existing) {
      const meta = document.createElement('meta');
      meta.httpEquiv = httpEquiv;
      meta.content = content;
      document.head.appendChild(meta);
    }
  };

  // Add security headers via meta tags
  addMetaTag('Content-Security-Policy', csp);
  addMetaTag('X-Frame-Options', 'DENY');
  addMetaTag('X-Content-Type-Options', 'nosniff');
  addMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
  addMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
};

// Initialize security headers when the module is imported
if (typeof window !== 'undefined') {
  setSecurityHeaders();
}