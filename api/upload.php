<?php
// api/upload.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

// Check authorization header
$headers = getallheaders();
$auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (strpos($auth, 'mock-mac-desktop-session-token-2026') === false && isset($_POST['auth_token']) && $_POST['auth_token'] !== 'mock-mac-desktop-session-token-2026') {
    // Optional check
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/uploads/logos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileTmpPath = $_FILES['logo']['tmp_name'];
        $fileName = $_FILES['logo']['name'];
        $fileSize = $_FILES['logo']['size'];
        $fileType = $_FILES['logo']['type'];
        
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        // Limit size to 2MB
        if ($fileSize > 2 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Ukuran berkas melebihi batas maksimum 2MB.'
            ]);
            exit();
        }

        $allowedExtensions = ['jpg', 'gif', 'png', 'jpeg', 'svg'];
        if (in_array($fileExtension, $allowedExtensions)) {
            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $dest_path = $uploadDir . $newFileName;

            if(move_uploaded_file($fileTmpPath, $dest_path)) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Berkas berhasil diunggah.',
                    'url' => 'api/uploads/logos/' . $newFileName
                ]);
                exit();
            } else {
                http_response_code(500);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal memindahkan berkas yang diunggah ke folder tujuan.'
                ]);
                exit();
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Format file tidak diizinkan. Gunakan jpg, jpeg, png, gif, atau svg.'
            ]);
            exit();
        }
    } else {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Berkas unggahan tidak ditemukan atau terjadi kesalahan saat mengunggah.'
        ]);
        exit();
    }
}

http_response_code(405);
echo json_encode(['error' => 'Metode HTTP tidak diizinkan.']);
?>
