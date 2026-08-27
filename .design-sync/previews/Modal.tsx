import React from 'react';
import { Modal, Button } from '@everypaw/design-system';

export function WithTitle() {
  return (
    <div style={{ position: 'relative', width: 480, height: 420, transform: 'translateZ(0)' }}>
      <Modal open onClose={() => {}} title="Order confirmed">
        <p>Your pet's book is on its way to print.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button variant="primary">Track order</Button>
          <Button variant="outline">Close</Button>
        </div>
      </Modal>
    </div>
  );
}
