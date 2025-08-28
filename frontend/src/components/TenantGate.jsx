import React from 'react';
import { useTenant } from '../context/TenantContext';
import TenantSwitcher from './TenantSwitcher';

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
};
const cardStyle = {
  background: 'white', padding: '2rem', borderRadius: '12px', width: 'min(90vw, 480px)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
};

export default function TenantGate({ children }) {
  const { tenantId } = useTenant();

  if (!tenantId) {
    return (
      <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Tenant auswählen">
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Mandant auswählen</h2>
          <p>Bitte wähle zuerst einen Mandanten. Danach werden nur noch Daten dieses Mandanten geladen.</p>
          <TenantSwitcher requireSelection />
        </div>
      </div>
    );
  }
  return children;
}
