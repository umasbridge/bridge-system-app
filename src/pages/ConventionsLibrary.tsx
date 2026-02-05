/**
 * Conventions Library Page
 * Displays all library conventions, allows viewing (and editing for admin)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Eye, Pencil } from 'lucide-react';

interface Convention {
  id: string;
  title: string;
  slug: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export function ConventionsLibrary() {
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.email === 'umasbridge@gmail.com';

  useEffect(() => {
    loadConventions();
  }, []);

  async function loadConventions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, title, slug, type, created_at, updated_at')
      .eq('type', 'bidding_convention')
      .is('deleted_at', null)
      .order('title');

    if (error) {
      console.error('Error loading conventions:', error);
    } else {
      setConventions(data || []);
    }
    setLoading(false);
  }

  function handleView(convention: Convention) {
    // Navigate to workspace view mode
    navigate(`/workspace/${convention.id}?mode=view`);
  }

  function handleEdit(convention: Convention) {
    // Navigate to workspace edit mode (admin only)
    navigate(`/workspace/${convention.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading conventions...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="w-8 h-8" />
          Conventions Library
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse standard bridge conventions. {isAdmin && '(Admin: you can edit these)'}
        </p>
      </div>

      {conventions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No conventions in library yet.</p>
            {isAdmin && (
              <p className="text-sm mt-2">
                Create conventions by setting workspace type to 'bidding_convention'.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conventions.map((convention) => (
            <Card key={convention.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{convention.title}</CardTitle>
                {convention.slug && (
                  <CardDescription>
                    {convention.slug}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(convention)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleEdit(convention)}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
