export default function MemberName({ member, children }) {
  const color = member?.activeNameColor || '';
  return <span style={color ? { color } : undefined}>{children || member?.name || '-'}</span>;
}
