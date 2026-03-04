'use client';

import { useState, useCallback } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { useZones } from '@/hooks/useZones';
import { DeviceGrid } from '@/components/dashboard/DeviceGrid';
import { ZoneGrid } from '@/components/dashboard/ZoneGrid';
import { Button } from '@/components/ui/Button';
import { updateZone } from '@/lib/zones';
import { wsManager } from '@/lib/wsManager';

export default function DashboardPage() {
  const { devices, loading, error, fetchDevices, updateDeviceMode, updateDeviceName } =
    useDevices();
  const { zones, addZone, renameZone, removeZone, setZoneDevices, setZoneSchedule } = useZones();
  const [refreshed, setRefreshed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRenameZone = (id: string, name: string) => {
    renameZone(id, name);
  };

  const handleUpdateZoneDevices = (id: string, deviceIds: string[]) => {
    setZoneDevices(id, deviceIds);
  };

  const handleRefresh = useCallback(async () => {
    await fetchDevices();
    setRefreshKey((k) => k + 1);
    // Request real-time state from all devices via WebSocket.
    // The s2c_noti responses (tagged _source='ws') will override any stale
    // mode values that the REST API may have returned.
    wsManager?.requestRead();
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
  }, [fetchDevices]);

  return (
    <div className="space-y-10">
      {/* Devices section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Appareils
            {!loading && devices.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({devices.length})
              </span>
            )}
          </h2>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? '…' : refreshed ? '✓ À jour' : '↺ Actualiser'}
          </Button>
        </div>
        <DeviceGrid
          devices={devices}
          loading={loading}
          error={error}
          refreshKey={refreshKey}
          onModeUpdate={updateDeviceMode}
          onNameUpdate={updateDeviceName}
        />
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Zones section */}
      <section>
        <ZoneGrid
          zones={zones}
          devices={devices}
          onAddZone={addZone}
          onRenameZone={handleRenameZone}
          onUpdateZoneDevices={handleUpdateZoneDevices}
          onDeleteZone={removeZone}
          onSaveZoneSchedule={setZoneSchedule}
        />
      </section>
    </div>
  );
}
