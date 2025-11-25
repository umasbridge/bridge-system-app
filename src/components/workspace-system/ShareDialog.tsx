import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, UserPlus, Mail } from 'lucide-react';

interface ShareDialogProps {
  workspaceName: string;
  onClose: () => void;
}

interface Partner {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
}

export function ShareDialog({ workspaceName, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleAddPartner = () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if partner already exists
    if (partners.some(p => p.email === email)) {
      setError('This partner has already been added');
      return;
    }

    // Add partner
    const newPartner: Partner = {
      id: Math.random().toString(36).substring(7),
      email,
      status: 'pending'
    };

    setPartners([...partners, newPartner]);
    setEmail('');
  };

  const handleRemovePartner = (id: string) => {
    setPartners(partners.filter(p => p.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPartner();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Workspace</h2>
            <p className="text-sm text-gray-500 mt-1">{workspaceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add Partner Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Add partners who can view this workspace
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleAddPartner} className="gap-2 flex-shrink-0">
                <UserPlus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Partners List */}
          {partners.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Shared with ({partners.length})
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {partner.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{partner.email}</p>
                        <p className="text-xs text-gray-500">
                          {partner.status === 'pending' ? 'Invitation pending' : 'Active'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePartner(partner.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove partner"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {partners.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                <UserPlus className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No partners added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add partners to share this workspace</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={onClose} variant="default">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
