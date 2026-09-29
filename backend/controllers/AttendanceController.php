<?php
require_once __DIR__ . '/../models/Attendance.php';

class AttendanceController {
    private $db;
    private $attendance;

    public function __construct($db) {
        $this->db = $db;
        $this->attendance = new Attendance($db);
    }

    public function submitAttendance($data) {
        if (empty($data['classroom_id']) || empty($data['faculty_id']) || !isset($data['records'])) {
            http_response_code(400);
            return json_encode(["status" => "error", "message" => "Missing required attendance payload"]);
        }

        $date = !empty($data['attendance_date']) ? $data['attendance_date'] : date('Y-m-d');
        $time = !empty($data['start_time']) ? $data['start_time'] : date('H:i:s');
        $notes = !empty($data['notes']) ? htmlspecialchars(strip_tags($data['notes'])) : null;

        $session_id = $this->attendance->createSession($data['classroom_id'], $data['faculty_id'], $date, $time, $notes);

        if (!$session_id) {
            http_response_code(500);
            return json_encode(["status" => "error", "message" => "Could not create attendance session"]);
        }

        $success = $this->attendance->recordAttendanceBatch($session_id, $data['records']);

        if ($success) {
            http_response_code(201);
            $summary = $this->attendance->getSessionSummary($session_id);
            return json_encode([
                "status" => "success",
                "message" => "Attendance submitted successfully",
                "session_id" => $session_id,
                "summary" => $summary
            ]);
        }

        http_response_code(500);
        return json_encode(["status" => "error", "message" => "Failed to record student statuses"]);
    }
}
