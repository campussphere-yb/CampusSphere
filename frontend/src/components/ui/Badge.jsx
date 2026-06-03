/**
 * Badge — colour-coded pill for enums across the whole app.
 *
 * Pass the raw enum string as `value` and it will be auto-coloured:
 *   <Badge value="critical" />   → red
 *   <Badge value="positive" />   → green
 *   <Badge value="new" />        → blue
 */

const COLOUR = {
  // Risk level
  low:          'bg-green-100 text-green-800',
  medium:       'bg-amber-100 text-amber-800',
  high:         'bg-orange-100 text-orange-800',
  critical:     'bg-red-100  text-red-800',
  // Sentiment
  positive:     'bg-green-100 text-green-700',
  neutral:      'bg-slate-100 text-slate-600',
  negative:     'bg-red-100  text-red-700',
  // Mention status
  new:          'bg-blue-100  text-blue-700',
  reviewed:     'bg-slate-100 text-slate-600',
  escalated:    'bg-orange-100 text-orange-700',
  resolved:     'bg-green-100 text-green-700',
  ignored:      'bg-gray-100  text-gray-500',
  // Alert severity / status
  info:         'bg-blue-100  text-blue-700',
  warning:      'bg-amber-100 text-amber-800',
  open:         'bg-red-100  text-red-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  // Connector status
  active:       'bg-green-100 text-green-700',
  paused:       'bg-amber-100 text-amber-700',
  error:        'bg-red-100  text-red-700',
  // Response status
  draft:        'bg-blue-100  text-blue-700',
  approved:     'bg-green-100 text-green-700',
  sent:         'bg-teal-100  text-teal-700',
  rejected:     'bg-red-100  text-red-700',
}

export default function Badge({ value, className = '' }) {
  const key = (value ?? '').toLowerCase()
  const colours = COLOUR[key] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colours} ${className}`}
    >
      {value}
    </span>
  )
}
