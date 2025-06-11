import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiHome,
  FiFileText,
  FiLayers,
  FiSettings,
  FiUsers,
  FiDownload,
  FiActivity,
  FiChevronDown,
  FiChevronRight,
  FiList,
  FiAlertCircle,
  FiGlobe
} from 'react-icons/fi';

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({
    content: true,
    extraction: false,
    settings: false
  });

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
  }, []);

  const toggleMenu = (menu) => {
    setExpandedMenus({
      ...expandedMenus,
      [menu]: !expandedMenus[menu]
    });
  };

  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <FiHome className="h-5 w-5" />,
      path: '/admin',
      exact: true
    },
    {
      title: 'Content Management',
      icon: <FiFileText className="h-5 w-5" />,
      key: 'content',
      submenu: [
        {
          title: 'Articles',
          path: '/admin/articles'
        },
        {
          title: 'Sections',
          path: '/admin/sections'
        }
      ]
    },
    {
      title: 'External Sources',
      icon: <FiGlobe className="h-5 w-5" />,
      path: '/admin/external-sources'
    },
    {
      title: 'Extraction',
      icon: <FiDownload className="h-5 w-5" />,
      key: 'extraction',
      submenu: [
        {
          title: 'Status & Logs',
          path: '/admin/extraction'
        },
        {
          title: 'Trigger Extraction',
          path: '/admin/extraction/trigger'
        }
      ]
    },
    {
      title: 'Settings',
      icon: <FiSettings className="h-5 w-5" />,
      key: 'settings',
      submenu: [
        {
          title: 'System Settings',
          path: '/admin/settings'
        },
        {
          title: 'System Logs',
          path: '/admin/logs'
        }
      ]
    }
  ];

  // Only show user management for admins
  if (user?.role === 'admin') {
    menuItems.splice(3, 0, {
      title: 'User Management',
      icon: <FiUsers className="h-5 w-5" />,
      path: '/admin/users'
    });
  }

  return (
    <div className="h-full flex flex-col bg-primary text-white">
      <div className="p-4 border-b border-primary-dark">
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
          <span className="text-lg font-semibold">Admin Portal</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {menuItems.map((item) => (
            <div key={item.path || item.key}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      item.submenu.some(subItem => isActive(subItem.path))
                        ? 'bg-primary-dark text-white'
                        : 'text-white hover:bg-primary-dark'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span className="flex-1">{item.title}</span>
                    {expandedMenus[item.key] ? (
                      <FiChevronDown className="h-4 w-4" />
                    ) : (
                      <FiChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {expandedMenus[item.key] && (
                    <div className="mt-1 pl-10 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          className={`block px-3 py-2 text-sm font-medium rounded-md ${
                            isActive(subItem.path)
                              ? 'bg-primary-dark text-white'
                              : 'text-white hover:bg-primary-dark'
                          }`}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.path}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.path) && (item.exact ? router.pathname === item.path : true)
                      ? 'bg-primary-dark text-white'
                      : 'text-white hover:bg-primary-dark'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.title}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-primary-dark">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-white text-primary flex items-center justify-center">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-300 capitalize">{user?.role || 'Loading...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}