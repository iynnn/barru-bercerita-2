<?php
// api/dashboard.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

if ($action === 'options') {
    $indicators = get_dashboard_options();
    echo json_encode(['indicators' => $indicators]);
    exit();
}

if ($action === 'data-tables') {
    $tables = get_dashboard_data_tables();
    echo json_encode($tables);
    exit();
}

if ($action === 'snapshots') {
    $snapshots = get_dashboard_snapshots();
    echo json_encode($snapshots);
    exit();
}

if ($action === 'series') {
    $indicatorIdsRaw = $_GET['indicator_ids'] ?? '';
    if (empty($indicatorIdsRaw)) {
        echo json_encode(['labels' => [], 'datasets' => []]);
        exit();
    }

    $indicatorIds = array_filter(array_map('intval', explode(',', $indicatorIdsRaw)));
    if (empty($indicatorIds)) {
        echo json_encode(['labels' => [], 'datasets' => []]);
        exit();
    }

    $startYear = isset($_GET['start_year']) && !empty($_GET['start_year']) ? (int)$_GET['start_year'] : null;
    $endYear   = isset($_GET['end_year']) && !empty($_GET['end_year']) ? (int)$_GET['end_year'] : null;

    $series = get_dashboard_series($indicatorIds, $startYear, $endYear);
    echo json_encode($series);
    exit();
}

if ($action === 'widgets') {
    $widgets = get_dashboard_widgets();
    echo json_encode($widgets);
    exit();
}

if ($action === 'get-snapshots-settings') {
    $pdo = get_db_connection_safe();
    
    // 1. Get selected snapshot IDs
    $selectedIds = [];
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT value FROM settings WHERE `key` = 'featured_snapshots'");
            $stmt->execute();
            $val = $stmt->fetchColumn();
            if ($val) {
                $selectedIds = array_filter(array_map('intval', explode(',', $val)));
            }
        } catch (Exception $e) {}
    } else {
        $settingsFile = __DIR__ . '/data/settings_snapshots.json';
        if (file_exists($settingsFile)) {
            $selectedIds = array_filter(array_map('intval', explode(',', file_get_contents($settingsFile))));
        }
    }

    // 2. Get all indicators list
    $allIndicators = [];
    if ($pdo) {
        $tables = $pdo->query("SELECT bps_var_id as id, name FROM data_tables ORDER BY name ASC")->fetchAll();
        $stmt_ind = $pdo->prepare("SELECT id, name FROM indicators WHERE bps_var_id = :var_id ORDER BY name ASC");
        foreach ($tables as $table) {
            $stmt_ind->execute([':var_id' => $table['bps_var_id']]);
            $inds = $stmt_ind->fetchAll();
            foreach ($inds as $ind) {
                $allIndicators[] = [
                    'id' => $ind['id'],
                    'name' => $table['name'] . ' - ' . $ind['name']
                ];
            }
        }
    } else {
        $bpsFile = __DIR__ . '/data/bps_data.json';
        if (file_exists($bpsFile)) {
            $data = json_decode(file_get_contents($bpsFile), true);
            $tables = $data['data_tables'] ?? [];
            $indicators = $data['indicators'] ?? [];
            foreach ($indicators as $ind) {
                $table = array_values(array_filter($tables, fn($t) => (int)$t['bps_var_id'] === (int)$ind['bps_var_id']))[0] ?? null;
                $allIndicators[] = [
                    'id' => $ind['id'],
                    'name' => ($table ? $table['name'] : 'Indikator') . ' - ' . $ind['name']
                ];
            }
        }
    }

    echo json_encode([
        'selected_ids' => array_values(array_map('strval', $selectedIds)),
        'indicators' => $allIndicators
    ]);
    exit();
}

if ($action === 'save-snapshots-settings') {
    // Read input
    $inputRaw = file_get_contents('php://input');
    $input = json_decode($inputRaw, true) ?? $_POST;
    $ids = $input['indicator_ids'] ?? [];
    if (!is_array($ids)) {
        $ids = array_filter(array_map('intval', explode(',', $ids)));
    }
    
    // Save to settings
    $val = implode(',', array_map('intval', $ids));
    $pdo = get_db_connection_safe();
    if ($pdo) {
        $stmt = $pdo->prepare("
            INSERT INTO settings (`key`, `value`)
            VALUES ('featured_snapshots', :val)
            ON DUPLICATE KEY UPDATE `value` = :val
        ");
        $stmt->execute([':val' => $val]);
    }
    
    // Save fallback JSON
    @file_put_contents(__DIR__ . '/data/settings_snapshots.json', $val);
    
    echo json_encode(['success' => true, 'message' => 'Konfigurasi snapshot berhasil disimpan.']);
    exit();
}

// Action not found
http_response_code(400);
echo json_encode(['error' => 'Aksi dashboard tidak valid.']);
?>
