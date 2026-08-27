import React from 'react';

export interface NavItemProps {
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
  href: string;
}

export function NavItem({ active, icon, label, href }: NavItemProps) {
  return (
    <a
      href={href}
      className={`ep-nav-item${active ? ' ep-nav-item--active' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
