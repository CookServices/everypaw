import React from 'react';
import { NavItem } from '@everypaw/design-system';

export function Default() {
  return <NavItem href="/dashboard/pets/1?tab=journal" label="Journal" />;
}

export function Active() {
  return <NavItem href="/dashboard/pets/1?tab=stories" label="Histoires IA" active />;
}
