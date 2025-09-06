import React, { useEffect, useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { getActiveTenants } from '../api/tenantApi';

export default function TenantSwitcher({ requireSelection = false }) {
  const { tenantId, setTenantId, clearTenantId } = useTenant();
  const [value, setValue] = useState(tenantId || '');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setValue(tenantId || ''); }, [tenantId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const tenants = await getActiveTenants();
        if (mounted) setList(tenants || []);
      } catch (e) {
        console.error('Tenant-Liste konnte nicht geladen werden:', e);
        if (mounted) setList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleApply = () => {
    if (!value) return;
    setTenantId(value);
  };

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <label>
        Tenant:&nbsp;
        <select
          value={list.some(t => t.tenantId === value) ? value : ''}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading || list.length === 0}
        >
          <option value="" disabled>{loading ? 'Lade…' : '– auswählen –'}</option>
          {list.map(t => (
            <option key={t.tenantId} value={t.tenantId}>
              {t.name} ({t.tenantId})
            </option>
          ))}
        </select>
      </label>

      <div>
        <small>Oder manuell eingeben:</small>
        <input
          type="text"
          placeholder="z. B. eurolab-01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleApply} disabled={!value}>Übernehmen</button>
        {!requireSelection && (
          <button onClick={clearTenantId} type="button">Löschen</button>
        )}
      </div>

      {tenantId && (
        <div style={{ padding: '0.5rem', background: '#f6f8fa', borderRadius: 8 }}>
          Aktiver Mandant: <strong>{tenantId}</strong>
        </div>
      )}
    </div>
  );
}
