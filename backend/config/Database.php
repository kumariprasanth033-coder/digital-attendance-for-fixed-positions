<?php
/**
 * Digital Attendance for Fixed Positions
 * Database Connection using PDO for PostgreSQL / Supabase
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $conn;

    public function __construct() {
        // Read configuration from environment variables or .env
        $this->host = getenv('DB_HOST') ?: 'db.dusvdwadmdivholhzmcu.supabase.co';
        $this->db_name = getenv('DB_NAME') ?: 'postgres';
        $this->username = getenv('DB_USER') ?: 'postgres';
        $this->password = getenv('DB_PASSWORD') ?: '';
        $this->port = getenv('DB_PORT') ?: '5432';
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "pgsql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name;
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch(PDOException $exception) {
            // Return null if direct PDO is not configured; REST APIs will handle gracefully
            error_log("Connection error: " . $exception->getMessage());
        }

        return $this->conn;
    }
}
