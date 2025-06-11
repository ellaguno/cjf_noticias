import { NextResponse } from 'next/server';

/**
 * Middleware for CJF Noticias
 * 
 * This middleware runs before each request and handles:
 * 1. Maintenance mode redirection
 * 2. Authentication checks for admin routes
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check for maintenance mode
  // Skip maintenance mode check for the maintenance page itself, static files, and admin routes
  if (
    !pathname.startsWith('/maintenance') && 
    !pathname.startsWith('/_next') && 
    !pathname.startsWith('/api') &&
    !pathname.includes('.') &&
    !pathname.startsWith('/admin')
  ) {
    try {
      // Fetch maintenance status from API
      const apiUrl = new URL('/api/status', request.url).toString();
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      // If maintenance mode is enabled, redirect to maintenance page
      if (data.maintenance_mode === true) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    } catch (error) {
      // If there's an error fetching the status, continue to the requested page
      console.error('Error checking maintenance mode:', error);
    }
  }
  
  // Check for authentication on admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // In client-side localStorage, we can't access it from middleware
    // Instead, we'll rely on client-side redirection in _app.js
    // This middleware will allow the request to continue
    
    // Note: For better security, consider implementing a proper
    // server-side authentication check using cookies or JWT
  }
  
  return NextResponse.next();
}

/**
 * Configure which paths should trigger this middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api (API routes)
     * 3. /static (static files)
     * 4. /_vercel (Vercel internals)
     * 5. All files in the public folder
     */
    '/((?!_next|api|static|_vercel|favicon.ico|robots.txt).*)',
  ],
};