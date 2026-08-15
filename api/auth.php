<?php
// api/auth.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? 'login';

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Metode HTTP tidak diizinkan']);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username dan password wajib diisi.']);
        exit;
    }

    $pdo = get_db_connection_safe();
    $user = null;

    if ($pdo) {
        // Query database MySQL
        try {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $user = null;
        }
    }

    // Jika MySQL offline / user tidak ditemukan di DB, periksa file JSON fallback
    if (!$user) {
        $usersFile = __DIR__ . '/data/users.json';
        if (file_exists($usersFile)) {
            $jsonUsers = json_decode(file_get_contents($usersFile), true) ?: [];
            foreach ($jsonUsers as $u) {
                if (strtolower($u['username']) === strtolower($username)) {
                    $user = $u;
                    break;
                }
            }
        }
    }

    // Jika pengguna ditemukan, verifikasi password menggunakan password_verify (hash standar)
    if ($user) {
        if (password_verify($password, $user['password'])) {
            $token = bin2hex(random_bytes(32));
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user['id'] ?? 1,
                    'username' => $user['username'],
                    'name' => $user['name'] ?? 'Petugas PST Barru',
                    'role' => $user['role'] ?? 'officer',
                    'officer_id' => $user['officer_id'] ? (int)$user['officer_id'] : null
                ],
                'message' => 'Login berhasil'
            ]);
            exit;
        }
    }

    // Gagal autentikasi
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Username atau Password salah.'
    ]);
    exit;
}

if ($action === 'check') {
    echo json_encode(['status' => 'active']);
    exit;
}
