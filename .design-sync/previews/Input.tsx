import React from 'react';
import { Input } from '@everypaw/design-system';

export function Default() {
  return <Input label="Pet's name" placeholder="Biscuit" />;
}

export function WithError() {
  return (
    <Input
      label="Email"
      defaultValue="not-an-email"
      error
      placeholder="you@example.com"
    />
  );
}

export function NoLabel() {
  return <Input placeholder="Search entries..." />;
}
