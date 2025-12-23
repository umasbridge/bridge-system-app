import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { getLastBackupForSystem, LastBackupInfo } from '../../lib/backup-operations';

interface BackupConfirmDialogProps {
  workspaceId: string;
  workspaceName: string;
  onBackupAndClose: () => void;
  onCloseWithoutBackup: () => void;
  onCancel: () => void;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${month} ${day} at ${hours}:${minutes}${ampm}`;
}

export function BackupConfirmDialog({
  workspaceId,
  workspaceName,
  onBackupAndClose,
  onCloseWithoutBackup,
  onCancel,
}: BackupConfirmDialogProps) {
  const [lastBackup, setLastBackup] = useState<LastBackupInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastBackup = async () => {
      setLoading(true);
      const backup = await getLastBackupForSystem(workspaceId);
      setLastBackup(backup);
      setLoading(false);
    };
    fetchLastBackup();
  }, [workspaceId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Close {workspaceName || 'Workspace'}</h2>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          <p className="text-gray-700 mb-4">
            Would you like to create a backup before closing?
          </p>

          {/* Last backup info */}
          {loading ? (
            <p className="text-sm text-gray-500">Loading backup info...</p>
          ) : lastBackup ? (
            <p className="text-sm text-gray-500">
              Last backup: {formatDate(lastBackup.createdAt)}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              No previous backups found for this system.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button
            onClick={onCloseWithoutBackup}
            variant="outline"
            className="flex-1"
          >
            Close without Backup
          </Button>
          <Button
            onClick={onBackupAndClose}
            variant="default"
            className="flex-1"
          >
            Backup and Close
          </Button>
        </div>
      </div>
    </div>
  );
}
