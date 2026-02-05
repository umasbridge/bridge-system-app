import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';

// Types
interface QueryResult {
  id: string;
  bid: string;
  meaning: string;
  auction_path: string;
  workspace_title: string;
}

interface SystemOption {
  id: string;
  title: string;
  type: string;
}

type QueryType = 'bid-to-meaning' | 'meaning-to-bid' | 'keyword';

export function BiddingPractice() {
  const navigate = useNavigate();

  // System selection
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Query state
  const [queryType, setQueryType] = useState<QueryType>('bid-to-meaning');
  const [queryInput, setQueryInput] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load systems/conventions that have bid_rules data (directly or in child workspaces)
  useEffect(() => {
    async function loadSystems() {
      // Step 1: Get systems that directly have bid_rules
      const { data: directSystems } = await supabase
        .from('workspaces')
        .select(`
          id,
          title,
          type,
          elements!inner(
            bid_rules!inner(id)
          )
        `)
        .in('type', ['bidding_system', 'bidding_convention'])
        .is('deleted_at', null)
        .order('type')
        .order('title');

      // Step 2: Get systems whose child workspaces have bid_rules
      const { data: parentSystems } = await supabase
        .from('workspaces')
        .select('id, title, type')
        .in('type', ['bidding_system', 'bidding_convention'])
        .is('deleted_at', null)
        .order('type')
        .order('title');

      // For parent systems, check which ones have child workspaces with bid_rules
      const parentIds = (parentSystems || []).map(s => s.id);
      let systemsWithChildRules: string[] = [];
      if (parentIds.length > 0) {
        const { data: childData } = await supabase
          .from('workspaces')
          .select(`
            parent_workspace_id,
            elements!inner(
              bid_rules!inner(id)
            )
          `)
          .in('parent_workspace_id', parentIds)
          .is('deleted_at', null);
        systemsWithChildRules = [...new Set((childData || []).map(c => c.parent_workspace_id).filter(Boolean))] as string[];
      }

      // Merge both lists
      const allSystems = [...(directSystems || []), ...(parentSystems || [])];
      const directIds = new Set((directSystems || []).map(s => s.id));
      const childRuleIds = new Set(systemsWithChildRules);

      const uniqueSystems = allSystems.reduce((acc: SystemOption[], curr) => {
        if (!acc.find(s => s.id === curr.id) && (directIds.has(curr.id) || childRuleIds.has(curr.id))) {
          acc.push({ id: curr.id, title: curr.title, type: curr.type });
        }
        return acc;
      }, []);

      setSystems(uniqueSystems);
      if (uniqueSystems.length > 0) {
        setSelectedSystem(uniqueSystems[0].id);
      }
      setLoading(false);
    }
    loadSystems();
  }, []);

  // Execute query
  const handleQuery = async () => {
    if (!queryInput.trim() || !selectedSystem) return;

    setSearching(true);
    setError(null);
    setResults([]);

    try {
      const selectedWorkspace = systems.find(s => s.id === selectedSystem);

      // Get child workspace IDs (for systems with tables in linked workspaces)
      const { data: childWorkspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('parent_workspace_id', selectedSystem)
        .is('deleted_at', null);
      const allWorkspaceIds = [selectedSystem, ...(childWorkspaces?.map(w => w.id) || [])];

      if (queryType === 'bid-to-meaning') {
        // Query by auction path - normalize input into bid tokens joined by -(p)-
        const cleaned = queryInput
          .toLowerCase()
          .replace(/nt/g, 'n')   // Normalize NT
          .replace(/pass/g, 'p')
          .trim();

        // Split by common separators (dash, space, comma)
        let tokens = cleaned.split(/[\s,\-]+/).filter(t => t.length > 0);

        // If single token with no separators, try to parse bid boundaries
        // e.g., "1n2c" → ["1n", "2c"]
        if (tokens.length === 1 && tokens[0].length > 2) {
          const parsed = tokens[0].match(/\d[cdhsnp]/g);
          if (parsed && parsed.length > 1) {
            tokens = parsed;
          }
        }

        // Join with -(p)- to match auction_path format in database
        const normalizedPath = tokens.join('-(p)-');

        const { data, error } = await supabase
          .from('bid_rules')
          .select(`
            id,
            bid,
            meaning,
            auction_path,
            elements!inner(workspace_id, workspaces!inner(title))
          `)
          .in('elements.workspace_id', allWorkspaceIds)
          .ilike('auction_path', `%${normalizedPath}%`)
          .limit(20);

        if (error) throw error;

        setResults((data || []).map(r => ({
          id: r.id,
          bid: r.bid,
          meaning: r.meaning || '',
          auction_path: r.auction_path || '',
          workspace_title: (r.elements as any)?.workspaces?.title || selectedWorkspace?.title || ''
        })));

      } else if (queryType === 'meaning-to-bid') {
        // Query by meaning - find bids that match the description
        const { data, error } = await supabase
          .from('bid_rules')
          .select(`
            id,
            bid,
            meaning,
            auction_path,
            elements!inner(workspace_id, workspaces!inner(title))
          `)
          .in('elements.workspace_id', allWorkspaceIds)
          .ilike('meaning', `%${queryInput}%`)
          .limit(20);

        if (error) throw error;

        setResults((data || []).map(r => ({
          id: r.id,
          bid: r.bid,
          meaning: r.meaning || '',
          auction_path: r.auction_path || '',
          workspace_title: (r.elements as any)?.workspaces?.title || selectedWorkspace?.title || ''
        })));

      } else if (queryType === 'keyword') {
        // Full keyword search across bid and meaning
        const searchTerm = queryInput.toLowerCase();

        const { data, error } = await supabase
          .from('bid_rules')
          .select(`
            id,
            bid,
            meaning,
            auction_path,
            elements!inner(workspace_id, workspaces!inner(title))
          `)
          .in('elements.workspace_id', allWorkspaceIds)
          .or(`bid.ilike.%${searchTerm}%,meaning.ilike.%${searchTerm}%`)
          .limit(30);

        if (error) throw error;

        setResults((data || []).map(r => ({
          id: r.id,
          bid: r.bid,
          meaning: r.meaning || '',
          auction_path: r.auction_path || '',
          workspace_title: (r.elements as any)?.workspaces?.title || selectedWorkspace?.title || ''
        })));
      }
    } catch (err: any) {
      console.error('Query error:', err);
      setError(err.message || 'Query failed');
    } finally {
      setSearching(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  };

  // Format auction path for display
  const formatAuctionPath = (path: string): string => {
    if (!path) return '';
    return path
      .replace(/c/gi, '♣')
      .replace(/d/gi, '♦')
      .replace(/h/gi, '♥')
      .replace(/s/gi, '♠')
      .replace(/n/gi, 'NT')
      .replace(/\(/g, '-(')
      .replace(/\)/g, ')-');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-lg font-semibold">System Query</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* System Selection */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select System or Convention
          </label>
          <select
            value={selectedSystem}
            onChange={(e) => {
              setSelectedSystem(e.target.value);
              setResults([]);
            }}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Bidding Systems">
              {systems.filter(s => s.type === 'bidding_system').map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </optgroup>
            <optgroup label="Conventions">
              {systems.filter(s => s.type === 'bidding_convention').map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Query Type Selection */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Query Type
          </label>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={queryType === 'bid-to-meaning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setQueryType('bid-to-meaning');
                setQueryInput('');
                setResults([]);
              }}
            >
              Bid → Meaning
            </Button>
            <Button
              variant={queryType === 'meaning-to-bid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setQueryType('meaning-to-bid');
                setQueryInput('');
                setResults([]);
              }}
            >
              Meaning → Bid
            </Button>
            <Button
              variant={queryType === 'keyword' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setQueryType('keyword');
                setQueryInput('');
                setResults([]);
              }}
            >
              Keyword Search
            </Button>
          </div>
        </div>

        {/* Query Input */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {queryType === 'bid-to-meaning' && 'Enter auction sequence (e.g., 1n-2c-2d or 1NT 2C 2D)'}
            {queryType === 'meaning-to-bid' && 'Describe what you want to bid (e.g., "game forcing" or "4 hearts")'}
            {queryType === 'keyword' && 'Enter keyword to search (e.g., "stayman" or "transfer")'}
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                queryType === 'bid-to-meaning' ? '1n-2c-2d' :
                queryType === 'meaning-to-bid' ? 'game forcing with 4 hearts' :
                'stayman'
              }
              className="flex-1"
            />
            <Button onClick={handleQuery} disabled={searching || !queryInput.trim()}>
              <Search className="w-4 h-4 mr-1" />
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Help text */}
          <div className="mt-2 text-xs text-gray-500 flex items-start gap-1">
            <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              {queryType === 'bid-to-meaning' && 'Use c/d/h/s/n for suits, numbers for levels. Spaces, dashes optional.'}
              {queryType === 'meaning-to-bid' && 'Search by description - finds bids whose meaning contains your text.'}
              {queryType === 'keyword' && 'Searches both bid names and meanings for your keyword.'}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <span className="text-sm font-medium text-gray-700">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="divide-y">
              {results.map((result) => (
                <div key={result.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium text-blue-600 mb-1">
                        {result.bid && <span className="mr-2">{result.bid}</span>}
                        {result.auction_path && (
                          <span className="text-gray-400 text-xs">
                            ({formatAuctionPath(result.auction_path)})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">
                        {result.meaning || <span className="text-gray-400 italic">No meaning specified</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {!searching && queryInput && results.length === 0 && !error && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No results found for "{queryInput}"</p>
            <p className="text-sm mt-1">Try a different search term or check your spelling</p>
          </div>
        )}

        {/* Initial state */}
        {!queryInput && results.length === 0 && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Enter a query above to search your bidding system</p>
          </div>
        )}
      </main>
    </div>
  );
}
