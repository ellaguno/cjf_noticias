import { useState } from 'react';
import { FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = null,
  disabled = false,
  className = '',
  options = [],
  rows = 3,
  helpText = null,
  min,
  max,
  step,
  pattern,
  autoComplete,
  onBlur
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const renderField = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            rows={rows}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 ${
              error ? 'border-red-500' : ''
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : undefined}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 ${
              error ? 'border-red-500' : ''
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
            required={required}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : undefined}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="mt-1 flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={value || false}
              onChange={onChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={`h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded ${
                error ? 'border-red-500' : ''
              } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
              required={required}
              disabled={disabled}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : undefined}
            />
            {label && (
              <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
                {label}
              </label>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="mt-1 space-y-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  id={`${name}-${option.value}`}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={onChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  className={`h-4 w-4 text-primary focus:ring-primary border-gray-300 ${
                    error ? 'border-red-500' : ''
                  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
                  required={required}
                  disabled={disabled}
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? `${name}-error` : undefined}
                />
                <label
                  htmlFor={`${name}-${option.value}`}
                  className="ml-2 block text-sm text-gray-900"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'password':
        return (
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id={name}
              name={name}
              type={showPassword ? 'text' : 'password'}
              value={value || ''}
              onChange={onChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={`block w-full pr-10 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 ${
                error ? 'border-red-500' : ''
              } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : undefined}
              autoComplete={autoComplete}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? (
                <FiEyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FiEye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 ${
              error ? 'border-red-500' : ''
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : undefined}
            autoComplete={autoComplete}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      {type !== 'checkbox' && label && (
        <label
          htmlFor={name}
          className={`block text-sm font-medium ${
            error ? 'text-red-500' : 'text-gray-700'
          } ${required ? 'required' : ''}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {renderField()}

      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}

      {error && (
        <div className="mt-1 flex items-center text-red-500 text-sm" id={`${name}-error`}>
          <FiAlertCircle className="h-4 w-4 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}