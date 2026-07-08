import { getMemberNameStyle } from '../utils/cosmetics';

export default function MemberName({
  member,
  shopItems = [],
  as: Tag = 'span',
  className = '',
  fallback = 'Anggota'
}) {
  const name = String(member?.name || member?.displayName || fallback).trim() || fallback;
  const style = getMemberNameStyle(member || {}, shopItems);
  const classNames = ['member-name', style ? 'member-name--colored' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classNames} style={style}>
      {name}
    </Tag>
  );
}
