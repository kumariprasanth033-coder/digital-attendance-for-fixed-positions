import * as XLSX from 'xlsx';
import { Classroom, Student, StudentGender } from '../types';

export type GenderDetectionConfidence = 'high' | 'medium' | 'low' | 'none';

export interface GenderDetectionResult {
  gender: StudentGender | 'Unclear';
  confidence: GenderDetectionConfidence;
  rawString: string;
  source: 'direct' | 'first_name_heuristic' | 'unknown';
}

export type RowValidationStatus = 
  | 'valid'
  | 'needs_review'
  | 'duplicate_in_file'
  | 'duplicate_in_classroom'
  | 'missing_name'
  | 'missing_roll'
  | 'invalid_email'
  | 'invalid_phone'
  | 'no_seat_available';

export interface ProcessedStudentRow {
  index: number;
  id: string;
  studentName: string;
  rollNumber: string;
  gender: StudentGender | 'Unclear';
  rawGender: string;
  genderConfidence: GenderDetectionConfidence;
  branch: string;
  section?: string;
  email?: string;
  mobile?: string;
  status: RowValidationStatus;
  statusMessage?: string;
  // Allocation coordinates
  assignedRow?: number;
  assignedCol?: number;
  assignedPosition?: number;
  seatId?: string; // e.g. R1-C1
}

export interface ColumnMapping {
  nameKey: string;
  rollKey: string;
  genderKey: string;
  branchKey: string;
  sectionKey: string;
  emailKey: string;
  mobileKey: string;
}

export interface ProcessedRosterSummary {
  totalRows: number;
  validCount: number;
  boysCount: number;
  girlsCount: number;
  unclearCount: number;
  duplicateInFileCount: number;
  duplicateInClassCount: number;
  missingDataCount: number;
  allocatedCount: number;
  unassignedCount: number;
  availableClassroomSeats: number;
  totalClassroomSeats: number;
  occupiedClassroomSeats: number;
  expansionSuggested?: {
    suggestedRows: number;
    suggestedCols: number;
    additionalSeatsNeeded: number;
  };
}

export interface ProcessedRosterResult {
  fileName: string;
  headersDetected: string[];
  columnMapping: ColumnMapping;
  rows: ProcessedStudentRow[];
  summary: ProcessedRosterSummary;
}

export type AllocationStrategy = 'category_side_by_side' | 'category_rows' | 'sequential_vacant';

// Heuristic name dictionaries for gender assistance when gender field is ambiguous
const COMMON_MALE_NAMES = new Set([
  'aarav', 'rohan', 'rahul', 'siddharth', 'aditya', 'karan', 'vikram', 'arjun',
  'manish', 'nikhil', 'prasanth', 'prashant', 'amit', 'suresh', 'raj', 'rohit',
  'varun', 'ajay', 'vijay', 'deepak', 'sachin', 'john', 'david', 'michael', 'alex',
  'ramesh', 'suresh', 'mahesh', 'dinesh', 'anand', 'karthik', 'vinay', 'naveen',
  'harish', 'sai', 'praveen', 'tarun', 'abhishek', 'ashok', 'anil', 'manoj'
]);

const COMMON_FEMALE_NAMES = new Set([
  'ananya', 'diya', 'kavya', 'sneha', 'pooja', 'meera', 'tanvi', 'isha',
  'priyanka', 'neha', 'shreya', 'ritu', 'swati', 'divya', 'deepa', 'aishwarya',
  'emily', 'sarah', 'jessica', 'anna', 'maria', 'radha', 'lakshmi', 'anita',
  'geeta', 'sunita', 'bhavana', 'harini', 'keerthi', 'madhuri', 'pallavi',
  'soundarya', 'rupa', 'shilpa', 'vandana', 'komal', 'sonali', 'monica'
]);

export class CsvParserService {
  /**
   * Normalize an object key or header string for resilient fuzzy matching
   */
  private static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Intelligently map column headers to standard student fields
   */
  public static detectColumns(headers: string[]): ColumnMapping {
    let nameKey = '';
    let rollKey = '';
    let genderKey = '';
    let branchKey = '';
    let sectionKey = '';
    let emailKey = '';
    let mobileKey = '';

    headers.forEach(h => {
      const norm = this.normalizeKey(h);
      if (!nameKey && (norm.includes('name') || norm.includes('student') || norm === 'fullname' || norm === 'candidatename')) {
        nameKey = h;
      } else if (!rollKey && (norm.includes('roll') || norm.includes('reg') || norm.includes('htno') || norm === 'usn' || norm === 'id' || norm === 'studentid')) {
        rollKey = h;
      } else if (!genderKey && (norm.includes('gender') || norm.includes('sex') || norm === 'category' || norm === 'cat' || norm === 'mf')) {
        genderKey = h;
      } else if (!branchKey && (norm.includes('branch') || norm.includes('dept') || norm.includes('department') || norm.includes('course') || norm.includes('stream') || norm.includes('program'))) {
        branchKey = h;
      } else if (!sectionKey && (norm.includes('section') || norm === 'sec')) {
        sectionKey = h;
      } else if (!emailKey && (norm.includes('email') || norm.includes('mail'))) {
        emailKey = h;
      } else if (!mobileKey && (norm.includes('mobile') || norm.includes('phone') || norm.includes('contact') || norm.includes('cell'))) {
        mobileKey = h;
      }
    });

    // Fallback: positional if headers are ambiguous
    if (!nameKey && headers.length > 0) nameKey = headers[0];
    if (!rollKey && headers.length > 1) rollKey = headers[1];
    if (!genderKey && headers.length > 2) genderKey = headers[2];

    return {
      nameKey,
      rollKey,
      genderKey,
      branchKey,
      sectionKey,
      emailKey,
      mobileKey
    };
  }

  /**
   * AI-Assisted gender / category detection with direct value matching and name heuristics
   */
  public static detectGender(rawVal: string, studentName?: string): GenderDetectionResult {
    const rawTrimmed = String(rawVal || '').trim();
    const clean = rawTrimmed.toLowerCase();

    // Direct High-Confidence Matching
    if (['male', 'm', 'boy', 'boys', 'man', 'gentleman', '1'].includes(clean)) {
      return {
        gender: 'Male',
        confidence: 'high',
        rawString: rawTrimmed,
        source: 'direct'
      };
    }

    if (['female', 'f', 'girl', 'girls', 'woman', 'lady', '2'].includes(clean)) {
      return {
        gender: 'Female',
        confidence: 'high',
        rawString: rawTrimmed,
        source: 'direct'
      };
    }

    // Name Heuristic Fallback
    if (studentName) {
      const firstName = studentName.trim().split(/\s+/)[0]?.toLowerCase();
      if (firstName) {
        if (COMMON_MALE_NAMES.has(firstName)) {
          return {
            gender: 'Male',
            confidence: 'medium',
            rawString: rawTrimmed,
            source: 'first_name_heuristic'
          };
        }
        if (COMMON_FEMALE_NAMES.has(firstName)) {
          return {
            gender: 'Female',
            confidence: 'medium',
            rawString: rawTrimmed,
            source: 'first_name_heuristic'
          };
        }
      }
    }

    return {
      gender: 'Unclear',
      confidence: 'none',
      rawString: rawTrimmed,
      source: 'unknown'
    };
  }

  /**
   * Parse Raw File (CSV, XLSX, or XLS) into JSON records
   */
  public static parseFileToRecords(fileData: ArrayBuffer | string): { headers: string[]; records: Record<string, unknown>[] } {
    const workbook = XLSX.read(fileData, {
      type: typeof fileData === 'string' ? 'string' : 'array'
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Spreadsheet has no sheets.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const records: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const headers: string[] = records.length > 0 ? Object.keys(records[0]) : [];
    return { headers, records };
  }

  /**
   * Process, validate, and check duplicates for student roster
   */
  public static processAndValidate(
    fileData: ArrayBuffer | string,
    fileName: string,
    classroom: Classroom,
    existingStudents: Student[],
    strategy: AllocationStrategy = 'category_side_by_side'
  ): ProcessedRosterResult {
    const { headers, records } = this.parseFileToRecords(fileData);
    const columnMapping = this.detectColumns(headers);

    const existingRolls = new Set(existingStudents.map(s => s.roll_number.trim().toLowerCase()));
    const seenFileRolls = new Set<string>();

    const rows: ProcessedStudentRow[] = [];

    records.forEach((rec, idx) => {
      const studentName = String(rec[columnMapping.nameKey] || '').trim();
      const rawRoll = String(rec[columnMapping.rollKey] || '').trim();
      const rollNumber = rawRoll.toUpperCase();
      const rawGender = String(rec[columnMapping.genderKey] || '').trim();
      const branch = String(rec[columnMapping.branchKey] || classroom.class_name.split('-')[0].trim() || 'General').trim();
      const section = columnMapping.sectionKey ? String(rec[columnMapping.sectionKey] || '').trim() : undefined;
      const email = columnMapping.emailKey ? String(rec[columnMapping.emailKey] || '').trim() : undefined;
      const mobile = columnMapping.mobileKey ? String(rec[columnMapping.mobileKey] || '').trim() : undefined;

      // Skip completely blank rows
      if (!studentName && !rollNumber) return;

      const genderResult = this.detectGender(rawGender, studentName);

      let status: RowValidationStatus = 'valid';
      let statusMessage: string | undefined = undefined;

      // Validation Rules
      if (!studentName) {
        status = 'missing_name';
        statusMessage = 'Missing student name';
      } else if (!rollNumber) {
        status = 'missing_roll';
        statusMessage = 'Missing roll number';
      } else if (seenFileRolls.has(rollNumber.toLowerCase())) {
        status = 'duplicate_in_file';
        statusMessage = `Duplicate roll number "${rollNumber}" found in this file`;
      } else if (existingRolls.has(rollNumber.toLowerCase())) {
        status = 'duplicate_in_classroom';
        statusMessage = `Roll number "${rollNumber}" is already enrolled in this classroom`;
      } else if (genderResult.gender === 'Unclear') {
        status = 'needs_review';
        statusMessage = 'Gender could not be determined. Please select Boy or Girl.';
      }

      if (rollNumber) {
        seenFileRolls.add(rollNumber.toLowerCase());
      }

      rows.push({
        index: idx + 1,
        id: `row-${idx}-${Date.now()}`,
        studentName,
        rollNumber,
        gender: genderResult.gender,
        rawGender,
        genderConfidence: genderResult.confidence,
        branch,
        section: section || undefined,
        email: email || undefined,
        mobile: mobile || undefined,
        status,
        statusMessage
      });
    });

    // Run Automatic Seat Allocation
    const rowsWithSeats = this.allocateSeats(rows, classroom, existingStudents, strategy);

    // Compute Summary Metrics
    const totalClassroomSeats = classroom.rows * classroom.columns;
    const occupiedClassroomSeats = existingStudents.length;
    const availableClassroomSeats = Math.max(0, totalClassroomSeats - occupiedClassroomSeats);

    const validCount = rowsWithSeats.filter(r => r.status === 'valid' && r.assignedRow).length;
    const boysCount = rowsWithSeats.filter(r => r.gender === 'Male').length;
    const girlsCount = rowsWithSeats.filter(r => r.gender === 'Female').length;
    const unclearCount = rowsWithSeats.filter(r => r.gender === 'Unclear').length;
    const duplicateInFileCount = rowsWithSeats.filter(r => r.status === 'duplicate_in_file').length;
    const duplicateInClassCount = rowsWithSeats.filter(r => r.status === 'duplicate_in_classroom').length;
    const missingDataCount = rowsWithSeats.filter(r => r.status === 'missing_name' || r.status === 'missing_roll').length;
    const allocatedCount = rowsWithSeats.filter(r => Boolean(r.assignedRow)).length;
    const unassignedCount = rowsWithSeats.filter(r => r.status === 'no_seat_available').length;

    let expansionSuggested: ProcessedRosterSummary['expansionSuggested'] = undefined;
    if (unassignedCount > 0) {
      const totalNeeded = occupiedClassroomSeats + allocatedCount + unassignedCount;
      const suggestedRows = Math.ceil(totalNeeded / classroom.columns);
      expansionSuggested = {
        suggestedRows,
        suggestedCols: classroom.columns,
        additionalSeatsNeeded: unassignedCount
      };
    }

    return {
      fileName,
      headersDetected: headers,
      columnMapping,
      rows: rowsWithSeats,
      summary: {
        totalRows: rowsWithSeats.length,
        validCount,
        boysCount,
        girlsCount,
        unclearCount,
        duplicateInFileCount,
        duplicateInClassCount,
        missingDataCount,
        allocatedCount,
        unassignedCount,
        availableClassroomSeats,
        totalClassroomSeats,
        occupiedClassroomSeats,
        expansionSuggested
      }
    };
  }

  /**
   * Automatic Category-Aware Seat Allocation
   * Places students into available seats without overwriting occupied slots.
   */
  public static allocateSeats(
    candidateRows: ProcessedStudentRow[],
    classroom: Classroom,
    existingStudents: Student[],
    strategy: AllocationStrategy = 'category_side_by_side'
  ): ProcessedStudentRow[] {
    const gridRows = classroom.rows;
    const gridCols = classroom.columns;
    const occupiedSeats = new Set(existingStudents.map(s => `${s.row_number}-${s.column_number}`));

    const halfCols = Math.ceil(gridCols / 2);

    const availableBoysSlots: Array<{ r: number; c: number; pos: number }> = [];
    const availableGirlsSlots: Array<{ r: number; c: number; pos: number }> = [];
    const generalAvailableSlots: Array<{ r: number; c: number; pos: number }> = [];

    for (let r = 1; r <= gridRows; r++) {
      for (let c = 1; c <= gridCols; c++) {
        const key = `${r}-${c}`;
        if (!occupiedSeats.has(key)) {
          const pos = (r - 1) * gridCols + c;
          generalAvailableSlots.push({ r, c, pos });
          if (c <= halfCols) {
            availableBoysSlots.push({ r, c, pos });
          } else {
            availableGirlsSlots.push({ r, c, pos });
          }
        }
      }
    }

    const usedSlots = new Set<string>();

    const assignToSlot = (
      row: ProcessedStudentRow,
      preferredSlots: Array<{ r: number; c: number; pos: number }>
    ): ProcessedStudentRow => {
      // 1. Try preferred slot (Boys on left wing, Girls on right wing)
      let slot = preferredSlots.find(s => !usedSlots.has(`${s.r}-${s.c}`));

      // 2. If preferred wing is full, find any remaining vacant slot in the auditorium
      if (!slot) {
        slot = generalAvailableSlots.find(s => !usedSlots.has(`${s.r}-${s.c}`));
      }

      if (slot) {
        usedSlots.add(`${slot.r}-${slot.c}`);
        return {
          ...row,
          assignedRow: slot.r,
          assignedCol: slot.c,
          assignedPosition: slot.pos,
          seatId: `R${slot.r}-C${slot.c}`
        };
      } else {
        return {
          ...row,
          status: 'no_seat_available',
          statusMessage: 'Classroom capacity exceeded: No seat available'
        };
      }
    };

    const validOrReviewable = candidateRows.filter(
      r => r.status === 'valid' || r.status === 'needs_review' || r.status === 'no_seat_available'
    );
    const invalidRows = candidateRows.filter(
      r => r.status !== 'valid' && r.status !== 'needs_review' && r.status !== 'no_seat_available'
    );

    const boys = validOrReviewable.filter(r => r.gender === 'Male');
    const girls = validOrReviewable.filter(r => r.gender === 'Female');
    const unclear = validOrReviewable.filter(r => r.gender === 'Unclear');

    const allocatedList: ProcessedStudentRow[] = [];

    // Allocate Boys
    boys.forEach(b => {
      allocatedList.push(assignToSlot(b, strategy === 'category_side_by_side' ? availableBoysSlots : generalAvailableSlots));
    });

    // Allocate Girls
    girls.forEach(g => {
      allocatedList.push(assignToSlot(g, strategy === 'category_side_by_side' ? availableGirlsSlots : generalAvailableSlots));
    });

    // Allocate Unclear
    unclear.forEach(u => {
      allocatedList.push(assignToSlot(u, generalAvailableSlots));
    });

    return [...allocatedList, ...invalidRows].sort((a, b) => a.index - b.index);
  }

  /**
   * Generates a sample CSV template with standard fields
   */
  public static generateTemplateCSV(): string {
    const headers = ['Name', 'Roll Number', 'Gender', 'Branch', 'Section', 'Email', 'Mobile'];
    const sampleRows = [
      ['Aarav Sharma', '23A31A0501', 'Male', 'AI & DS', 'A', 'aarav.sharma@university.edu', '9876543210'],
      ['Rohan Verma', '23A31A0502', 'Male', 'AI & DS', 'A', 'rohan.verma@university.edu', '9876543211'],
      ['Ananya Iyer', '23A31A0503', 'Female', 'AI & DS', 'A', 'ananya.iyer@university.edu', '9876543212'],
      ['Diya Reddy', '23A31A0504', 'Female', 'AI & DS', 'A', 'diya.reddy@university.edu', '9876543213'],
      ['Rahul Nair', '23A31A0505', 'Male', 'AI & DS', 'A', 'rahul.nair@university.edu', '9876543214'],
      ['Sneha Patel', '23A31A0506', 'Female', 'AI & DS', 'A', 'sneha.patel@university.edu', '9876543215']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\r\n');

    return csvContent;
  }
}
