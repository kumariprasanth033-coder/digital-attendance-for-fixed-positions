<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../controllers/ClassroomController.php';
require_once __DIR__ . '/../controllers/AttendanceController.php';

$database = new Database();
$db = $database->getConnection();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Simple routing router
if (strpos($uri, '/api/classrooms') !== false) {
    $controller = new ClassroomController($db);
    if ($method === 'GET') {
        $faculty_id = $_GET['faculty_id'] ?? null;
        echo $controller->list($faculty_id);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        echo $controller->create($data);
    }
} elseif (strpos($uri, '/api/attendance/submit') !== false && $method === 'POST') {
    $controller = new AttendanceController($db);
    $data = json_decode(file_get_contents("php://input"), true);
    echo $controller->submitAttendance($data);
} else {
    http_response_code(200);
    echo json_encode([
        "status" => "online",
        "service" => "Digital Attendance PHP Backend API",
        "version" => "1.0.0",
        "timestamp" => date('c')
    ]);
}
