import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiSave, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import FormField from '../../../components/admin/FormField';
import { userApi } from '../../../utils/adminApi';

export default function UserForm() {
  const router = useRouter();
  const { id } = router.query;
  const isNewUser = id === 'new';
  
  const [user, setUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'editor'
  });
  
  const [loading, setLoading] = useState(!isNewUser);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isNewUser && id) {
      fetchUser();
    }
  }, [id, isNewUser]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await userApi.getUser(id);
      setUser({
        ...data,
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user makes changes
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!user.username) {
      newErrors.username = 'Username is required';
    } else if (user.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (user.email && !/\S+@\S+\.\S+/.test(user.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (isNewUser && !user.password) {
      newErrors.password = 'Password is required for new users';
    } else if (user.password && user.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (user.password && user.password !== user.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!user.role) {
      newErrors.role = 'Role is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Remove confirmPassword before sending to API
      const userData = { ...user };
      delete userData.confirmPassword;
      
      // If password is empty and not a new user, remove it
      if (!isNewUser && !userData.password) {
        delete userData.password;
      }
      
      if (isNewUser) {
        await userApi.createUser(userData);
        setSuccess('User created successfully');
        
        // Reset form for new user
        setUser({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'editor'
        });
      } else {
        await userApi.updateUser(id, userData);
        setSuccess('User updated successfully');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.error || 'Failed to save user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={isNewUser ? 'Create User' : 'Edit User'}>
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-1" /> Back to Users
        </button>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isNewUser ? 'Create New User' : `Edit User: ${user.username}`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isNewUser
                ? 'Create a new user account with appropriate permissions'
                : 'Update user information and permissions'}
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 sm:px-6 bg-red-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="px-4 py-3 sm:px-6 bg-green-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{success}</h3>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                label="Username"
                name="username"
                value={user.username}
                onChange={handleChange}
                required
                error={errors.username}
                placeholder="Enter username"
                autoComplete="username"
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                value={user.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="Enter email address"
                autoComplete="email"
              />

              <FormField
                label="Password"
                name="password"
                type="password"
                value={user.password}
                onChange={handleChange}
                required={isNewUser}
                error={errors.password}
                placeholder={isNewUser ? "Enter password" : "Leave blank to keep current password"}
                autoComplete="new-password"
                helpText={isNewUser ? "Minimum 6 characters" : "Leave blank to keep current password"}
              />

              <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={user.confirmPassword}
                onChange={handleChange}
                required={isNewUser || user.password}
                error={errors.confirmPassword}
                placeholder="Confirm password"
                autoComplete="new-password"
              />

              <FormField
                label="Role"
                name="role"
                type="select"
                value={user.role}
                onChange={handleChange}
                required
                error={errors.role}
                options={[
                  { value: 'admin', label: 'Administrator' },
                  { value: 'editor', label: 'Editor' }
                ]}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/admin/users')}
                className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                  saving ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="-ml-1 mr-2 h-5 w-5" />
                    Save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}