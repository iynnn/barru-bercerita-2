<?php
// api/pst.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $includeHidden = isset($_GET['admin']) && $_GET['admin'] === '1';
    $services = get_pst_services($includeHidden);
    echo json_encode($services);
    exit();
}

if ($method === 'PATCH') {
    // Toggle is_hidden for a specific service
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID tidak valid.']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $is_hidden = isset($input['is_hidden']) ? (int)$input['is_hidden'] : null;

    if ($is_hidden === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Field is_hidden diperlukan.']);
        exit();
    }

    $pdo = get_db_connection_safe();
    if ($pdo) {
        $stmt = $pdo->prepare("UPDATE integrated_p_s_t_services SET is_hidden = :is_hidden WHERE id = :id");
        $stmt->execute([':is_hidden' => $is_hidden, ':id' => $id]);
        $stmt_fresh = $pdo->prepare("SELECT * FROM integrated_p_s_t_services WHERE id = ?");
        $stmt_fresh->execute([$id]);
        echo json_encode($stmt_fresh->fetch());
    } else {
        // Fallback JSON
        $pstFile = __DIR__ . '/data/pst_data.json';
        $all = file_exists($pstFile) ? (json_decode(file_get_contents($pstFile), true) ?? []) : [];
        $found = null;
        foreach ($all as &$item) {
            if ((int)$item['id'] === $id) {
                $item['is_hidden'] = $is_hidden;
                $found = $item;
                break;
            }
        }
        file_put_contents($pstFile, json_encode($all, JSON_PRETTY_PRINT));
        echo json_encode($found);
    }
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

            if (move_uploaded_file($fileTmpPath, $dest_path)) {
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
