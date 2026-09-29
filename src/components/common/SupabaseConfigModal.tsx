import React, { useState } from 'react';
import { updateSupabaseConfig, clearSupabaseConfig, isSupabaseConfigured, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../../lib/supabase';
import { X, Database, CheckCircle2, Copy, AlertTriangle, ExternalLink } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(localStorage.getItem('app_supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const [key, setKey] = useState(localStorage.getItem('app_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(url, key);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload();
    }, 800);
  };

  const handleReset = () => {
    clearSupabaseConfig();
    setUrl('');
    setKey('');
    window.location.reload();
  };

  const copySqlSnippet = () => {
    navigator.clipboard.writeText(`-- View /database/schema.sql in the project root for complete schema & RLS policies.`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Supabase Database Connection</h3>
              <p className="text-xs text-slate-500">Live PostgreSQL Database & Authentication Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isConfigured 
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/60 border-amber-200 text-amber-900'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <span className="font-semibold block mb-0.5">
                {isConfigured ? 'Supabase Connected' : 'Running in Persistent Preview & Demo Store'}
              </span>
              <span>
                {isConfigured
                  ? 'Application is connected to your Supabase PostgreSQL database and auth engine with RLS.'
                  : 'All features (fixed seating matrix, CRUD, CSV export, live attendance) work immediately with real persistent storage. Connect your own Supabase project below whenever ready!'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Public Anon Key
              </label>
              <textarea
                required
                rows={3}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>SQL Schema & RLS Policies</span>
                <button
                  type="button"
                  onClick={copySqlSnippet}
                  className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-normal text-[11px]"
                >
                  <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy Reference'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Execute <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-slate-800">/database/schema.sql</code> in your Supabase SQL Editor to initialize all 6 tables, triggers, and Row Level Security.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Disconnect Credentials
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  {saved ? 'Saved!' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
