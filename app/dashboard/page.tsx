'use client';

import { useDevices } from '@/hooks/useDevices';
import { useZones } from '@/hooks/useZones';
import { DeviceGrid } from '@/components/dashboard/DeviceGrid';
import { ZoneGrid } from '@/components/dashboard/ZoneGrid';
import { Button } from '@/components/ui/Button';
import { updateZone } from '@/lib/zones';

export default function DashboardPage() {
  const { devices, loading, error, fetchDevices, updateDeviceMode, updateDeviceName } =
    useDevices();
  const { zones, addZone, renameZone, removeZone, setZoneDevices, setZoneSchedule } = useZones();

  const handleRenameZone = (id: string, name: string) => {
    renameZone(id, name);
  };

  const handleUpdateZoneDevices = (id: string, deviceIds: string[]) => {
    setZoneDevices(id, deviceIds);
  };

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
          <Button variant="secondary" size="sm" onClick={fetchDevices} disabled={loading}>
            ↺ Actualiser
          </Button>
        </div>
        <DeviceGrid
          devices={devices}
          loading={loading}
          error={error}
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
