import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

export default function Card({
  title,
  value,
  icon,
  description,
  footer,
  color = 'primary',
  link,
  linkText = 'View Details',
  className = '',
  loading = false
}) {
  // Color variants
  const colorVariants = {
    primary: 'bg-primary text-white',
    secondary: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
    light: 'bg-white text-gray-800 border border-gray-200',
  };

  const colorClass = colorVariants[color] || colorVariants.primary;

  if (loading) {
    return (
      <div className={`rounded-lg shadow-md overflow-hidden ${className}`}>
        <div className="p-5 bg-gray-100 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className={`p-5 ${colorClass}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <div className="text-3xl font-bold mb-2">{value}</div>
            {description && <p className="text-sm opacity-90">{description}</p>}
          </div>
          {icon && <div className="text-3xl opacity-80">{icon}</div>}
        </div>
      </div>

      {(footer || link) && (
        <div className="bg-white px-5 py-3 border-t">
          {footer ? (
            footer
          ) : link ? (
            <Link href={link} className="text-sm text-primary hover:text-primary-dark flex items-center">
              {linkText} <FiArrowRight className="ml-1" />
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Stats card variant
export function StatsCard({
  title,
  value,
  change,
  changeType = 'increase',
  icon,
  color = 'light',
  loading = false,
  ...props
}) {
  const changeColors = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600'
  };

  const changeColor = changeColors[changeType] || changeColors.neutral;

  if (loading) {
    return (
      <Card
        loading={true}
        className="h-full"
        {...props}
      />
    );
  }

  return (
    <Card
      title={title}
      value={value}
      icon={icon}
      color={color}
      className="h-full"
      footer={
        change !== undefined && (
          <div className={`text-sm ${changeColor} flex items-center`}>
            {changeType === 'increase' ? '↑' : changeType === 'decrease' ? '↓' : '•'} {change}
          </div>
        )
      }
      {...props}
    />
  );
}