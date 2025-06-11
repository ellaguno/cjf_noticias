import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';

export default function AdminHeader({ toggleSidebar }) {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/admin/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('csrfToken');

      // Redirect to login page
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 lg:hidden hover:text-gray-900 focus:outline-none"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            <div className="ml-4 lg:ml-0">
              <Link href="/admin" className="flex items-center">
                <img
                  src="/logo-cjf.png"
                  alt="Logo CJF"
                  className="h-8 mr-2"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://www.cjf.gob.mx/resources/index/images/logo-cjf.png';
                  }}
                />
                <span className="text-lg font-semibold text-primary">Admin</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            {/* Notifications */}
            <div className="relative ml-3">
              <button
                className="p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none"
                aria-label="Notifications"
              >
                <FiBell className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </button>
            </div>

            {/* Profile dropdown */}
            <div className="relative ml-3" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none"
                id="user-menu"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <FiUser className="h-5 w-5" />
                </div>
                {user && (
                  <span className="ml-2 text-gray-700 hidden md:block">
                    {user.username}
                  </span>
                )}
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="px-4 py-2 text-xs text-gray-500">
                    {user?.role && (
                      <span className="block capitalize">{user.role}</span>
                    )}
                  </div>

                  <Link href="/admin/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <div className="flex items-center">
                      <FiUser className="mr-2 h-4 w-4" />
                      Profile
                    </div>
                  </Link>

                  <Link href="/admin/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <div className="flex items-center">
                      <FiSettings className="mr-2 h-4 w-4" />
                      Settings
                    </div>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <div className="flex items-center">
                      <FiLogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}