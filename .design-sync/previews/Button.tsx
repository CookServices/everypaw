import React from 'react';
import { Button } from '@everypaw/design-system';

export function Primary() {
  return <Button variant="primary">Order your book</Button>;
}

export function Outline() {
  return <Button variant="outline">Save draft</Button>;
}

export function Disabled() {
  return (
    <Button variant="primary" disabled>
      Order your book
    </Button>
  );
}
