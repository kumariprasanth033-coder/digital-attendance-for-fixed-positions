<?php
/**
 * Attendance Model
 */

class Attendance {
    private $conn;
    private $session_table = "attendance_sessions";
    private $record_table = "attendance_records";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createSession($classroom_id, $faculty_id, $date, $start_time, $notes = null) {
        $query = "INSERT INTO " . $this->session_table . " (classroom_id, faculty_id, attendance_date, start_time, notes)
                  VALUES (:classroom_id, :faculty_id, :attendance_date, :start_time, :notes) RETURNING id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":classroom_id", $classroom_id);
        $stmt->bindParam(":faculty_id", $faculty_id);
        $stmt->bindParam(":attendance_date", $date);
        $stmt->bindParam(":start_time", $start_time);
        $stmt->bindParam(":notes", $notes);

        if ($stmt->execute()) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row['id'];
        }
        return false;
    }

    public function recordAttendanceBatch($session_id, $records) {
        if (empty($records)) return true;

        $this->conn->beginTransaction();
        try {
            $query = "INSERT INTO " . $this->record_table . " (session_id, student_id, status)
                      VALUES (:session_id, :student_id, :status)
                      ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status";

            $stmt = $this->conn->prepare($query);

            foreach ($records as $rec) {
                $stmt->bindParam(":session_id", $session_id);
                $stmt->bindParam(":student_id", $rec['student_id']);
                $stmt->bindParam(":status", $rec['status']);
                $stmt->execute();
            }

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Failed to insert attendance: " . $e->getMessage());
            return false;
        }
    }

    public function getSessionSummary($session_id) {
        $query = "SELECT s.id, s.attendance_date, s.start_time, c.class_name,
                         COUNT(r.id) as total_marked,
                         SUM(CASE WHEN r.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                         SUM(CASE WHEN r.status = 'Absent' THEN 1 ELSE 0 END) as absent_count
                  FROM " . $this->session_table . " s
                  JOIN classrooms c ON c.id = s.classroom_id
                  LEFT JOIN " . $this->record_table . " r ON r.session_id = s.id
                  WHERE s.id = :session_id
                  GROUP BY s.id, c.class_name";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $session_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
