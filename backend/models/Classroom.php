<?php
/**
 * Classroom Model
 */

class Classroom {
    private $conn;
    private $table_name = "classrooms";

    public $id;
    public $faculty_id;
    public $class_name;
    public $rows;
    public $columns;
    public $total_positions;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function readByFaculty($faculty_id) {
        $query = "SELECT c.*, 
                  (SELECT COUNT(*) FROM students s WHERE s.classroom_id = c.id) as student_count,
                  (SELECT COUNT(*) FROM attendance_sessions ses WHERE ses.classroom_id = c.id) as session_count
                  FROM " . $this->table_name . " c 
                  WHERE c.faculty_id = :faculty_id 
                  ORDER BY c.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":faculty_id", $faculty_id);
        $stmt->execute();
        return $stmt;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " (faculty_id, class_name, rows, columns)
                  VALUES (:faculty_id, :class_name, :rows, :columns) RETURNING id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":faculty_id", $this->faculty_id);
        $stmt->bindParam(":class_name", $this->class_name);
        $stmt->bindParam(":rows", $this->rows, PDO::PARAM_INT);
        $stmt->bindParam(":columns", $this->columns, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            return true;
        }
        return false;
    }

    public function delete($id, $faculty_id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id AND faculty_id = :faculty_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":faculty_id", $faculty_id);
        return $stmt->execute();
    }
}
