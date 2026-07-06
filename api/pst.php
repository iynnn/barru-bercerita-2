<?php
// api/pst.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Secure endpoint check
if ($method === 'POST' || $method === 'DELETE') {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    // Allow local mock operations
}

if ($method === 'GET') {
    $services = get_pst_services();
    echo json_encode($services);
    exit();
}

if ($method === 'POST') {
    $isUpdate = (isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PATCH') || isset($_GET['id']);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($_POST['id']) ? (int)$_POST['id'] : null);

    $title = trim($_POST['title'] ?? '');
    $url = trim($_POST['url'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $themeClass = trim($_POST['theme_class'] ?? 'bg-mariner-200');
    $logoUrl = null;

    // Handle File Upload
    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/uploads/logos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileTmpPath = $_FILES['logo']['tmp_name'];
        $fileName = $_FILES['logo']['name'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        $allowedExtensions = ['jpg', 'gif', 'png', 'jpeg', 'svg'];
        if (in_array($fileExtension, $allowedExtensions)) {
            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $dest_path = $uploadDir . $newFileName;

            if(move_uploaded_file($fileTmpPath, $dest_path)) {
                $logoUrl = 'api/uploads/logos/' . $newFileName;
            }
        }
    }

    if (!$isUpdate && (empty($title) || empty($url))) {
        http_response_code(400);
        echo json_encode(['error' => 'Judul dan URL layanan wajib diisi.']);
        exit();
    }

    $service = save_pst_service($id, $title, $url, $description, $logoUrl, $themeClass);
    
    if ($isUpdate) {
        echo json_encode($service);
    } else {
        http_response_code(201);
        echo json_encode($service);
    }
    exit();
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if (!$id) {
        $pathInfo = explode('/', $_SERVER['REQUEST_URI']);
        $id = (int)end($pathInfo);
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID layanan tidak valid untuk penghapusan.']);
        exit();
    }

    delete_pst_service($id);
    http_response_code(204);
    echo json_encode(null);
    exit();
}
?>
