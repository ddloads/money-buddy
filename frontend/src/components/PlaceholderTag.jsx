// Small pill that marks a control as a placeholder — visible in the UI so
// it's obvious the button has no real logic behind it yet.
export default function PlaceholderTag({ className = '' }) {
  return (
    <span className={`ph-tag ${className}`} title="Placeholder — not functional yet">
      PH
    </span>
  )
}
