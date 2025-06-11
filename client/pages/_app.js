import '../styles/globals.css';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Client-side authentication check for admin routes
  useEffect(() => {
    // Skip for login page
    if (router.pathname.startsWith('/admin') && router.pathname !== '/admin/login') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
      }
    }
  }, [router.pathname]);
  
  // Check if the page has a custom layout
  if (Component.getLayout) {
    return Component.getLayout(<Component {...pageProps} />);
  }
  
  // Don't use the default layout for admin pages
  if (router.pathname.startsWith('/admin')) {
    return <Component {...pageProps} />;
  }
  
  // Use the default layout for all other pages
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;