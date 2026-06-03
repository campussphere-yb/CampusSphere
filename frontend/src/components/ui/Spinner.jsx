export default function Spinner({ size = 'md', className = '' }) {
  const dim =
    size === 'sm' ? 'w-4 h-4 border-2'
    : size === 'lg' ? 'w-8 h-8 border-[3px]'
    : 'w-6 h-6 border-2'
  return (
    <div
      className={`${dim} border-indigo-200 border-t-indigo-600 rounded-full animate-spin ${className}`}
    />
  )
}
