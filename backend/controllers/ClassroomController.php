<?php
require_once __DIR__ . '/../models/Classroom.php';

class ClassroomController {
    private $db;
    private $classroom;

    public function __construct($db) {
        $this->db = $db;
        $this->classroom = new Classroom($db);
    }

    public function list($faculty_id) {
        if (!$faculty_id) {
            http_response_code(400);
            return json_encode(["status" => "error", "message" => "Faculty ID is required"]);
        }

        $stmt = $this->classroom->readByFaculty($faculty_id);
        $num = $stmt->rowCount();

        $classrooms_arr = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $classrooms_arr[] = $row;
        }

        return json_encode(["status" => "success", "data" => $classrooms_arr]);
    }

    public function create($data) {
        if (empty($data['faculty_id']) || empty($data['class_name']) || empty($data['rows']) || empty($data['columns'])) {
            http_response_code(400);
            return json_encode(["status" => "error", "message" => "Incomplete classroom data"]);
        }

        $this->classroom->faculty_id = $data['faculty_id'];
        $this->classroom->class_name = htmlspecialchars(strip_tags($data['class_name']));
        $this->classroom->rows = intval($data['rows']);
        $this->classroom->columns = intval($data['columns']);

        if ($this->classroom->create()) {
            http_response_code(201);
            return json_encode([
                "status" => "success",
                "message" => "Classroom created successfully",
                "id" => $this->classroom->id
            ]);
        }

        http_response_code(503);
        return json_encode(["status" => "error", "message" => "Unable to create classroom"]);
    }
}
