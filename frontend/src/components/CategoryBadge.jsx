export default function CategoryBadge({ category, size = 'sm' }) {
  if (!category) return null

  const style = {
    backgroundColor: `${category.color}20`,
    color: category.color,
    borderColor: `${category.color}40`,
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      }`}
      style={style}
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </span>
  )
}
