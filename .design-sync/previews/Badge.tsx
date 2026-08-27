import React from 'react';
import { Badge } from '@everypaw/design-system';

export function AllVariants() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Badge variant="print">In print</Badge>
      <Badge variant="ship">Shipped</Badge>
      <Badge variant="memorial">In memoriam</Badge>
    </div>
  );
}
