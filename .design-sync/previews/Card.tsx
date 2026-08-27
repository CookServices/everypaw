import React from 'react';
import { Card, Badge } from '@everypaw/design-system';

export function Medium() {
  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Biscuit's Book 2026</h3>
      <p style={{ margin: '0 0 12px' }}>28 pages · 6 chapters</p>
      <Badge variant="ship">Shipped</Badge>
    </Card>
  );
}

export function Small() {
  return (
    <Card padding="sm">
      <p style={{ margin: 0 }}>Compact card content</p>
    </Card>
  );
}
