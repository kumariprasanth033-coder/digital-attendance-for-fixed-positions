import React, { useState, useRef } from 'react';
import { Classroom, Student, StudentGender } from '../../types';
import { api } from '../../services/api';
import { 
  CsvParserService, 
  ProcessedStudentRow, 
  ProcessedRosterSummary 
} from '../../services/csvParserService';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  X, 
  Download, 
  Sparkles, 
  Users, 
  Check, 
  RefreshCw,
  Maximize2
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Classroom;
  existingStudents: Student[];
  onImportComplete: () => Promise<void>;
  onExpandClassroom?: (newRows: number, newCols: number) => Promise<void>;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  classroom,
  existingStudents,
  onImportComplete,
  onExpandClassroom
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ProcessedStudentRow[]>([]);
  const [summary, setSummary] = useState<ProcessedRosterSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'review' | 'errors'>('all');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [customRows, setCustomRows] = useState(classroom.rows);
  const [customCols, setCustomCols] = useState(classroom.columns);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeClassroom: Classroom = {
    ...classroom,
    rows: customRows,
    columns: customCols,
    total_positions: customRows * customCols
  };

  const totalSeats = customRows * customCols;
  const occupiedCount = existingStudents.length;
  const availableSeats = Math.max(0, totalSeats - occupiedCount);

  // Process File Data (both CSV and XLSX)
  const processFileData = (fileData: ArrayBuffer | string, name: string) => {
    try {
      setProcessing(true);
      setFileName(name);

      const result = CsvParserService.processAndValidate(
        fileData,
        name,
        activeClassroom,
        existingStudents
      );

      setParsedRows(result.rows);
      setSummary(result.summary);
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown parsing error';
      setImportError(`Failed to parse file: ${msg}. Please ensure it is a valid CSV or Excel (.xlsx) file.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (data) {
        processFileData(data, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (data) {
        processFileData(data, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Allow faculty to manually resolve gender on Needs Review rows
  const handleUpdateGender = (rowId: string, newGender: StudentGender) => {
    setParsedRows(prev => {
      const updatedCandidates = prev.map(r => {
        if (r.id === rowId) {
          const wasReview = r.status === 'needs_review';
          return {
            ...r,
            gender: newGender,
            rawGender: newGender,
            genderConfidence: 'high' as const,
            status: wasReview ? ('valid' as const) : r.status,
            statusMessage: wasReview ? undefined : r.statusMessage
          };
        }
        return r;
      });

      // Re-run allocation with new gender
      const reallocated = CsvParserService.allocateSeats(
        updatedCandidates,
        activeClassroom,
        existingStudents
      );

      return reallocated;
    });
  };

  // Download Student Template
  const handleDownloadTemplate = () => {
    const csvContent = CsvParserService.generateTemplateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Student_Upload_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Automatically Expand Classroom Dimensions to fit all uploaded students
  const handleExpandDimensions = async () => {
    const validCount = parsedRows.filter(
      r => r.status === 'valid' || r.status === 'needs_review' || r.status === 'no_seat_available'
    ).length;
    const requiredTotal = occupiedCount + validCount;
    const neededRows = Math.max(customRows, Math.ceil(requiredTotal / customCols));

    setCustomRows(neededRows);
    if (onExpandClassroom) {
      await onExpandClassroom(neededRows, customCols);
    }

    const expandedClassroom: Classroom = {
      ...classroom,
      rows: neededRows,
      columns: customCols,
      total_positions: neededRows * customCols
    };

    const reallocated = CsvParserService.allocateSeats(
      parsedRows,
      expandedClassroom,
      existingStudents
    );
    setParsedRows(reallocated);
  };

  // Final Confirmation: Save to Supabase and LocalDb
  const handleConfirmImport = async () => {
    const toImport = parsedRows.filter(
      r => (r.status === 'valid' || (r.status === 'needs_review' && r.gender !== 'Unclear')) && 
           r.assignedRow && 
           r.assignedCol
    );

    if (toImport.length === 0) {
      setImportError('No valid students to import. Please review errors or assign missing genders.');
      return;
    }

    try {
      setSaving(true);
      const payloads: Array<Omit<Student, 'id' | 'created_at'>> = toImport.map(item => ({
        classroom_id: classroom.id,
        student_name: item.studentName,
        roll_number: item.rollNumber,
        branch: item.branch || classroom.class_name,
        gender: item.gender as StudentGender,
        section: item.section || undefined,
        email: item.email || undefined,
        mobile: item.mobile || undefined,
        row_number: item.assignedRow!,
        column_number: item.assignedCol!,
        position_number: item.assignedPosition || ((item.assignedRow! - 1) * customCols + item.assignedCol!)
      }));

      await api.bulkAssignStudents(classroom.id, payloads);
      await onImportComplete();
      onClose();
    } catch (err: unknown) {
      console.error('Bulk import error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to import students';
      setImportError(`Import error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Counts
  const totalUploaded = parsedRows.length;
  const boysCount = parsedRows.filter(r => r.gender === 'Male').length;
  const girlsCount = parsedRows.filter(r => r.gender === 'Female').length;
  const validCount = parsedRows.filter(r => (r.status === 'valid' || (r.status === 'needs_review' && r.gender !== 'Unclear')) && r.assignedRow).length;
  const reviewCount = parsedRows.filter(r => r.status === 'needs_review' && r.gender === 'Unclear').length;
  const errorCount = parsedRows.filter(r => r.status === 'duplicate_in_file' || r.status === 'duplicate_in_classroom' || r.status === 'missing_name' || r.status === 'missing_roll').length;
  const unassignedCount = parsedRows.filter(r => r.status === 'no_seat_available').length;

  const displayRows = parsedRows.filter(r => {
    if (activeTab === 'valid') return (r.status === 'valid' || (r.status === 'needs_review' && r.gender !== 'Unclear')) && r.assignedRow;
    if (activeTab === 'review') return r.status === 'needs_review' && r.gender === 'Unclear';
    if (activeTab === 'errors') return r.status !== 'valid' && (r.status !== 'needs_review' || r.gender === 'Unclear');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-display tracking-tight flex items-center gap-2">
                <span>Bulk Import Students (CSV / Excel)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-400/30">
                  AI Validation Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Classroom: <strong className="text-white">{classroom.class_name}</strong> · Dimensions: {customRows}R × {customCols}C ({totalSeats} Seats, {availableSeats} Available)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
              title="Download sample CSV template"
            >
              <Download className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">Download Template</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Section 1: Drag & Drop Upload Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
              {fileName ? `Loaded: ${fileName}` : 'Choose CSV or Excel File'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Drag and drop your student roster here, or click to browse. Supports columns: <strong>Name, Roll Number, Gender (Boys/Girls), Branch, Section, Email, Mobile</strong>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{fileName ? 'Choose Another File' : 'Select CSV / Excel File'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample Template</span>
              </button>
            </div>
          </div>

          {/* Section 2: AI Processing & Intelligence Summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Records</span>
                  <span className="text-lg font-black text-slate-900 font-mono">{totalUploaded}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Boys (Male)</span>
                  <span className="text-lg font-black text-blue-700 font-mono">{boysCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 text-center">
                  <span className="text-[10px] font-bold text-pink-700 uppercase block">Girls (Female)</span>
                  <span className="text-lg font-black text-pink-700 font-mono">{girlsCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Auto-Allocated</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">{validCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Needs Review</span>
                  <span className="text-lg font-black text-amber-700 font-mono">{reviewCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Issues / Skipped</span>
                  <span className="text-lg font-black text-rose-700 font-mono">{errorCount + unassignedCount}</span>
                </div>
              </div>

              {/* Capacity Safeguard Warning */}
              {unassignedCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Classroom Capacity Limit Reached:</span>
                      <span>
                        {availableSeats} seats available, but {validCount + unassignedCount} students uploaded. <strong>{unassignedCount} students</strong> could not be assigned.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExpandDimensions}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Expand Classroom to Fit All</span>
                  </button>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({totalUploaded})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'valid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Allocated ({validCount})
                  </button>
                  {reviewCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('review')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        activeTab === 'review' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Needs Review ({reviewCount})
                    </button>
                  )}
                  {errorCount + unassignedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('errors')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        activeTab === 'errors' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      Errors / Unassigned ({errorCount + unassignedCount})
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  Showing <strong>{displayRows.length}</strong> records
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Seat ID</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Roll Number</th>
                      <th className="py-2.5 px-3">Category (Gender)</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3 text-right">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayRows.map(row => {
                      const seatTag = row.assignedRow && row.assignedCol ? `R${row.assignedRow}-C${row.assignedCol}` : 'None';
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {row.assignedRow ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                                {seatTag}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Unassigned</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.studentName}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-700">{row.rollNumber}</td>
                          <td className="py-2 px-3">
                            {row.gender === 'Unclear' ? (
                              <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 p-0.5 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateGender(row.id, 'Male')}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                                >
                                  Boy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateGender(row.id, 'Female')}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-pink-100 text-pink-800 hover:bg-pink-200 cursor-pointer"
                                >
                                  Girl
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                              }`}>
                                {row.gender === 'Male' ? 'Boy (Male)' : 'Girl (Female)'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{row.branch}</td>
                          <td className="py-2 px-3 text-right">
                            {row.status === 'valid' && row.assignedRow && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <Check className="w-3 h-3 text-emerald-600" /> Auto-Assigned
                              </span>
                            )}
                            {row.status === 'needs_review' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Needs Review
                              </span>
                            )}
                            {row.status === 'duplicate_in_classroom' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold" title={row.statusMessage}>
                                In Class Already
                              </span>
                            )}
                            {row.status === 'duplicate_in_file' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold" title={row.statusMessage}>
                                Duplicate In File
                              </span>
                            )}
                            {(row.status === 'missing_name' || row.status === 'missing_roll') && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold" title={row.statusMessage}>
                                Missing Data
                              </span>
                            )}
                            {row.status === 'no_seat_available' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                No Seat Free
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            {parsedRows.length > 0 ? (
              <span>
                Ready to assign: <strong>{validCount}</strong> students into available seats.
              </span>
            ) : (
              <span>Upload CSV or Excel file to preview automatic seat assignments.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={validCount === 0 || saving}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Import & Auto Assign Seats ({validCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
