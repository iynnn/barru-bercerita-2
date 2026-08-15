<?php
// api/schedule.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'get';

// Helper default officers list for JSON fallback
function get_default_json_officers() {
    return [
        ['id' => 1, 'name' => 'Muhamad Feriyanto', 'nip' => '19950815 202012 1 001', 'position' => 'Pranata Komputer / Tim IT', 'pool_type' => 'K', 'phone' => '081234567890', 'username' => 'feriyanto', 'is_active' => 1],
        ['id' => 2, 'name' => 'Ahmad Ridwan, S.St', 'nip' => '19880410 201201 1 002', 'position' => 'Statistisi Ahli Muda', 'pool_type' => 'K', 'phone' => '081234567891', 'username' => 'ridwan', 'is_active' => 1],
        ['id' => 3, 'name' => 'Nurul Hidayah, S.Si', 'nip' => '19920314 201502 2 003', 'position' => 'Statistisi Pertama', 'pool_type' => 'K', 'phone' => '081234567892', 'username' => 'nurul', 'is_active' => 1],
        ['id' => 4, 'name' => 'Andi Baso, S.Sos', 'nip' => '19850620 200903 1 004', 'position' => 'Pengelola PST & Layanan', 'pool_type' => 'K', 'phone' => '081234567893', 'username' => 'andibaso', 'is_active' => 1],
        ['id' => 5, 'name' => 'Rahmawati, S.E.', 'nip' => '19901105 201402 2 005', 'position' => 'Statistisi Ahli', 'pool_type' => 'K', 'phone' => '081234567894', 'username' => 'rahmawati', 'is_active' => 1],
        ['id' => 6, 'name' => 'Muhammad Nur, A.Md', 'nip' => '19960712 201901 1 006', 'position' => 'Asisten Statistisi', 'pool_type' => 'K', 'phone' => '081234567895', 'username' => 'muhnur', 'is_active' => 1],
        ['id' => 7, 'name' => 'Sri Wahyuni, S.Stat', 'nip' => '19940918 201802 2 007', 'position' => 'Statistisi Pertama', 'pool_type' => 'K', 'phone' => '081234567896', 'username' => 'sriwahyuni', 'is_active' => 1],
        ['id' => 8, 'name' => 'Hidayatullah, S.T.', 'nip' => '19910125 201601 1 008', 'position' => 'Pranata Komputer Ahli', 'pool_type' => 'K', 'phone' => '081234567897', 'username' => 'hidayat', 'is_active' => 1],
        ['id' => 9, 'name' => 'Resky Aulia, S.Tr.Stat', 'nip' => '19970512 202102 2 009', 'position' => 'Statistisi Ahli Pertama', 'pool_type' => 'K', 'phone' => '081234567898', 'username' => 'resky', 'is_active' => 1],
        ['id' => 10, 'name' => 'Ir. Hj. St. Nurbaya', 'nip' => '19680315 199302 2 001', 'position' => 'Penanggung Jawab Pengaduan', 'pool_type' => 'P', 'phone' => '081234567899', 'username' => 'nurbaya', 'is_active' => 1],
        ['id' => 11, 'name' => 'Hasmawati, S.A.P.', 'nip' => '19830510 200801 2 002', 'position' => 'Petugas Pengaduan & Aspirasi', 'pool_type' => 'P', 'phone' => '081234567800', 'username' => 'hasmawati', 'is_active' => 1],
        ['id' => 12, 'name' => 'Bachtiar, S.H.', 'nip' => '19800720 200604 1 003', 'position' => 'Petugas Layanan Hukum', 'pool_type' => 'P', 'phone' => '081234567801', 'username' => 'bachtiar', 'is_active' => 1],
        ['id' => 13, 'name' => 'Dr. Hardiansyah, S.Si.', 'nip' => '19750918 199903 1 001', 'position' => 'Koordinator Rekomendasi', 'pool_type' => 'R', 'phone' => '081234567802', 'username' => 'hardiansyah', 'is_active' => 1],
        ['id' => 14, 'name' => 'Fitriani, S.Stat.', 'nip' => '19931205 201602 2 002', 'position' => 'Pemeriksa Rekomendasi', 'pool_type' => 'R', 'phone' => '081234567803', 'username' => 'fitriani', 'is_active' => 1],
        ['id' => 15, 'name' => 'Lukman Hakim, S.T.', 'nip' => '19890214 201301 1 003', 'position' => 'Analisis Data Rekomendasi', 'pool_type' => 'R', 'phone' => '081234567804', 'username' => 'lukman', 'is_active' => 1]
    ];
}

/**
 * Generate rolling duty schedule per month.
 * K1 (PST Pagi) & K2 (PST Siang) rotate across Tim K.
 * P rotates across Tim P (Pengaduan).
 * R rotates across Tim R (Rekomendasi).
 */
function generate_month_roster(string $monthStr, array $officers, string $mode = 'sequential', array $holidays = []): array {
    $parts = explode('-', $monthStr);
    $year = (int)($parts[0] ?? date('Y'));
    $month = (int)($parts[1] ?? date('m'));

    $numDays = (int)date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
    $activeOfficers = array_values(array_filter($officers, fn($o) => !empty($o['is_active'])));

    // Group officers into team pools strictly by pool_type
    $poolK = array_values(array_filter($activeOfficers, fn($o) => strtoupper($o['pool_type'] ?? 'K') === 'K'));
    $poolP = array_values(array_filter($activeOfficers, fn($o) => strtoupper($o['pool_type'] ?? '') === 'P'));
    $poolR = array_values(array_filter($activeOfficers, fn($o) => strtoupper($o['pool_type'] ?? '') === 'R'));

    $numK = count($poolK);
    $numP = count($poolP);
    $numR = count($poolR);

    // Dynamic shift: random offset and shuffle on auto-generate for dynamic rotation
    if ($mode === 'random') {
        if ($numK > 0) shuffle($poolK);
        if ($numP > 0) shuffle($poolP);
        if ($numR > 0) shuffle($poolR);
        $shiftK = $numK > 0 ? rand(0, $numK - 1) : 0;
        $shiftP = $numP > 0 ? rand(0, $numP - 1) : 0;
        $shiftR = $numR > 0 ? rand(0, $numR - 1) : 0;
    } else {
        // Sequential mode with dynamic shift offset on each generation
        $shiftK = $numK > 0 ? rand(0, $numK - 1) : 0;
        $shiftP = $numP > 0 ? rand(0, $numP - 1) : 0;
        $shiftR = $numR > 0 ? rand(0, $numR - 1) : 0;
    }

    // Calculate cumulative workday index for start of target month from start of year
    $startOfYear = strtotime("{$year}-01-01");
    $startOfMonth = strtotime(sprintf('%04d-%02d-01', $year, $month));

    $cumulativeWorkdays = 0;
    for ($t = $startOfYear; $t < $startOfMonth; $t += 86400) {
        $dow = date('N', $t);
        $dStr = date('Y-m-d', $t);
        if ($dow < 6 && !isset($holidays[$dStr])) {
            $cumulativeWorkdays++;
        }
    }

    $workdayCount = $cumulativeWorkdays;
    $schedules = [];

    for ($day = 1; $day <= $numDays; $day++) {
        $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $day);
        $dayOfWeek = date('N', strtotime($dateStr)); // 1=Mon, 7=Sun

        // Skip Weekend (6=Sat, 7=Sun) or National Holiday (Officer turn shifts to next working day)
        if ($dayOfWeek >= 6 || isset($holidays[$dateStr])) {
            $holidayTitle = isset($holidays[$dateStr]) ? $holidays[$dateStr]['title'] : 'Libur Akhir Pekan';
            $schedules[$dateStr] = [
                'date' => $dateStr,
                'k1' => null,
                'k2' => null,
                'p' => null,
                'r' => null,
                'is_weekend' => $dayOfWeek >= 6,
                'is_holiday' => isset($holidays[$dateStr]),
                'note' => $holidayTitle
            ];
            continue;
        }

        // K1 & K2: strictly from Tim K pool (Stepping by 1 for fair K1 Pagi & K2 Siang rotation)
        $oK1_id = null;
        $oK2_id = null;
        if ($numK > 0) {
            $idxK1 = ($workdayCount + $shiftK) % $numK;
            $idxK2 = $numK > 1 ? ($workdayCount + 1 + $shiftK) % $numK : $idxK1;
            $oK1_id = $poolK[$idxK1]['id'] ?? null;
            $oK2_id = $poolK[$idxK2]['id'] ?? null;
        }

        // P: strictly from Tim P pool
        $oP_id = null;
        if ($numP > 0) {
            $idxP = ($workdayCount + $shiftP) % $numP;
            $oP_id = $poolP[$idxP]['id'] ?? null;
        }

        // R: strictly from Tim R pool
        $oR_id = null;
        if ($numR > 0) {
            $idxR = ($workdayCount + $shiftR) % $numR;
            $oR_id = $poolR[$idxR]['id'] ?? null;
        }

        $workdayCount++;

        $schedules[$dateStr] = [
            'date' => $dateStr,
            'k1' => $oK1_id,
            'k2' => $oK2_id,
            'p'  => $oP_id,
            'r'  => $oR_id,
            'is_weekend' => false,
            'note' => null
        ];
    }

    return $schedules;
}

function get_month_gen_info($pdo, string $monthStr): array {
    $key = "gen_info_" . str_replace('-', '_', $monthStr);
    $data = null;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT `value` FROM settings WHERE `key` = ?");
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            if ($val) {
                $data = json_decode($val, true);
            }
        } catch (Exception $e) {}
    } else {
        $genFile = __DIR__ . '/data/gen_info.json';
        if (file_exists($genFile)) {
            $info = json_decode(file_get_contents($genFile), true) ?? [];
            $data = $info[$key] ?? null;
        }
    }

    if (!$data) {
        $timeTs = strtotime("{$monthStr}-01");
        $monthName = date('F Y', $timeTs);
        $data = [
            'timestamp' => "01 {$monthName}, 08:00 WITA",
            'type' => 'auto',
            'type_label' => 'Otomatis Sistem (Tanggal 1)'
        ];
    }
    return $data;
}

function set_month_gen_info($pdo, string $monthStr, string $type = 'manual'): array {
    $key = "gen_info_" . str_replace('-', '_', $monthStr);
    $data = [
        'timestamp' => date('d M Y, H:i') . ' WITA',
        'type' => $type,
        'type_label' => $type === 'manual' ? 'Manual oleh Admin' : 'Otomatis Sistem (Tanggal 1)'
    ];

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?");
            $json = json_encode($data);
            $stmt->execute([$key, $json, $json]);
        } catch (Exception $e) {}
    } else {
        $dataDir = __DIR__ . '/data';
        $genFile = $dataDir . '/gen_info.json';
        $info = file_exists($genFile) ? (json_decode(file_get_contents($genFile), true) ?? []) : [];
        $info[$key] = $data;
        file_put_contents($genFile, json_encode($info, JSON_PRETTY_PRINT));
    }
    return $data;
}

function get_month_gen_count($pdo, string $monthStr): int {
    $key = "gen_count_" . str_replace('-', '_', $monthStr);
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT `value` FROM settings WHERE `key` = ?");
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            return $val !== false ? (int)$val : 0;
        } catch (Exception $e) {
            return 0;
        }
    } else {
        $genFile = __DIR__ . '/data/gen_counts.json';
        if (file_exists($genFile)) {
            $counts = json_decode(file_get_contents($genFile), true) ?? [];
            return (int)($counts[$key] ?? 0);
        }
        return 0;
    }
}

function inc_month_gen_count($pdo, string $monthStr): int {
    $key = "gen_count_" . str_replace('-', '_', $monthStr);
    $current = get_month_gen_count($pdo, $monthStr);
    $newCount = $current + 1;

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?");
            $stmt->execute([$key, (string)$newCount, (string)$newCount]);
        } catch (Exception $e) {}
    } else {
        $dataDir = __DIR__ . '/data';
        $genFile = $dataDir . '/gen_counts.json';
        $counts = file_exists($genFile) ? (json_decode(file_get_contents($genFile), true) ?? []) : [];
        $counts[$key] = $newCount;
        file_put_contents($genFile, json_encode($counts, JSON_PRETTY_PRINT));
    }
    return $newCount;
}

$pdo = get_db_connection_safe();

if ($method === 'GET') {
    $monthStr = $_GET['month'] ?? date('Y-m');

    $officers = [];
    $schedules = [];
    $presensiMap = [];

    if ($pdo) {
        // Clean duplicates and orphaned user accounts if any
        try {
            $pdo->exec("
                DELETE o1 FROM pst_officers o1
                INNER JOIN pst_officers o2 
                WHERE o1.id > o2.id AND o1.name = o2.name
            ");
            $pdo->exec("
                DELETE FROM users 
                WHERE role = 'officer' 
                AND officer_id IS NOT NULL 
                AND officer_id NOT IN (SELECT id FROM pst_officers)
            ");
        } catch (Exception $e) {}

        // Fetch officers from DB with unique username (GROUP BY o.id to prevent 1-to-many multiplication)
        $stmtOff = $pdo->query("
            SELECT o.*, 
                   COALESCE(
                       (SELECT u.username FROM users u WHERE u.officer_id = o.id ORDER BY u.id ASC LIMIT 1),
                       LOWER(SUBSTRING_INDEX(REPLACE(REPLACE(o.name, '.', ''), ',', ''), ' ', 1))
                   ) AS username
            FROM pst_officers o
            GROUP BY o.id
            ORDER BY o.pool_type ASC, o.id ASC
        ");
        $officers = $stmtOff->fetchAll();

        // Fetch schedules for target month
        $stmtSch = $pdo->prepare("SELECT * FROM pst_schedules WHERE date LIKE ?");
        $stmtSch->execute(["{$monthStr}-%"]);
        $dbRows = $stmtSch->fetchAll();

        // Fetch holidays first
        $holidaysMap = [];
        try {
            $stmtHol = $pdo->query("SELECT * FROM pst_holidays ORDER BY date ASC");
            $holRows = $stmtHol->fetchAll();
            foreach ($holRows as $h) {
                $holidaysMap[$h['date']] = $h;
            }
        } catch (Exception $e) {}

        if (empty($dbRows)) {
            // Auto generate for this month if no schedule exists in DB
            $genMap = generate_month_roster($monthStr, $officers, 'sequential', $holidaysMap);
            $stmtInsSch = $pdo->prepare("
                INSERT INTO pst_schedules (date, k1_officer_id, k2_officer_id, p_officer_id, r_officer_id, note)
                VALUES (:date, :k1, :k2, :p, :r, :note)
                ON DUPLICATE KEY UPDATE k1_officer_id=:k1, k2_officer_id=:k2, p_officer_id=:p, r_officer_id=:r, note=:note
            ");
            foreach ($genMap as $dt => $sch) {
                if (!$sch['is_weekend'] && empty($sch['is_holiday'])) {
                    $stmtInsSch->execute([
                        ':date' => $dt,
                        ':k1' => $sch['k1'],
                        ':k2' => $sch['k2'],
                        ':p'  => $sch['p'],
                        ':r'  => $sch['r'],
                        ':note' => $sch['note']
                    ]);
                }
            }

            set_month_gen_info($pdo, $monthStr, 'auto');

            // Re-fetch fresh rows
            $stmtSch->execute(["{$monthStr}-%"]);
            $dbRows = $stmtSch->fetchAll();
        }

        foreach ($dbRows as $row) {
            $schedules[$row['date']] = [
                'date' => $row['date'],
                'k1' => $row['k1_officer_id'] ? (int)$row['k1_officer_id'] : null,
                'k2' => $row['k2_officer_id'] ? (int)$row['k2_officer_id'] : null,
                'p'  => $row['p_officer_id'] ? (int)$row['p_officer_id'] : null,
                'r'  => $row['r_officer_id'] ? (int)$row['r_officer_id'] : null,
                'note' => $row['note']
            ];
        }

        // Fetch presensi for target month
        try {
            $stmtPres = $pdo->prepare("SELECT * FROM pst_presensi WHERE date LIKE ?");
            $stmtPres->execute(["{$monthStr}-%"]);
            $presRows = $stmtPres->fetchAll();
            foreach ($presRows as $pr) {
                $rUpper = strtoupper($pr['role_code']);
                $rLower = strtolower($pr['role_code']);
                $presensiMap["{$pr['date']}_{$pr['officer_id']}_{$rUpper}"] = $pr;
                $presensiMap["{$pr['date']}_{$pr['officer_id']}_{$rLower}"] = $pr;
            }
        } catch (Exception $e) {}

        // Fetch holidays
        $holidaysMap = [];
        try {
            $stmtHol = $pdo->query("SELECT * FROM pst_holidays ORDER BY date ASC");
            $holRows = $stmtHol->fetchAll();
            foreach ($holRows as $h) {
                $holidaysMap[$h['date']] = $h;
            }
        } catch (Exception $e) {}

        // Fetch swap requests
        $swapRequests = [];
        try {
            $stmtSw = $pdo->query("
                SELECT sr.*, 
                       o1.name as requester_name, o1.nip as requester_nip,
                       o2.name as target_name, o2.nip as target_nip
                FROM pst_swap_requests sr
                LEFT JOIN pst_officers o1 ON sr.requester_id = o1.id
                LEFT JOIN pst_officers o2 ON sr.target_officer_id = o2.id
                ORDER BY sr.id DESC
            ");
            $swapRequests = $stmtSw->fetchAll();
        } catch (Exception $e) {}

    } else {
        // --- Fallback JSON ---
        $dataDir = __DIR__ . '/data';
        $offFile = $dataDir . '/pst_officers.json';
        $schFile = $dataDir . '/pst_schedule.json';
        $presFile = $dataDir . '/pst_presensi.json';

        if (file_exists($offFile)) {
            $officers = json_decode(file_get_contents($offFile), true) ?? [];
        } else {
            $officers = [];
            file_put_contents($offFile, json_encode($officers, JSON_PRETTY_PRINT));
        }

        $allSchedules = file_exists($schFile) ? (json_decode(file_get_contents($schFile), true) ?? []) : [];
        
        foreach ($allSchedules as $dt => $sch) {
            if (strpos($dt, $monthStr) === 0) {
                $schedules[$dt] = $sch;
            }
        }

        if (empty($schedules)) {
            $genMap = generate_month_roster($monthStr, $officers);
            foreach ($genMap as $dt => $sch) {
                $allSchedules[$dt] = $sch;
                $schedules[$dt] = $sch;
            }
            file_put_contents($schFile, json_encode($allSchedules, JSON_PRETTY_PRINT));
            set_month_gen_info($pdo, $monthStr, 'auto');
        }

        if (file_exists($presFile)) {
            $allPres = json_decode(file_get_contents($presFile), true) ?? [];
            foreach ($allPres as $key => $pr) {
                if (strpos($pr['date'] ?? '', $monthStr) === 0) {
                    $rUpper = strtoupper($pr['role_code'] ?? '');
                    $rLower = strtolower($pr['role_code'] ?? '');
                    $presensiMap["{$pr['date']}_{$pr['officer_id']}_{$rUpper}"] = $pr;
                    $presensiMap["{$pr['date']}_{$pr['officer_id']}_{$rLower}"] = $pr;
                    $presensiMap[$key] = $pr;
                }
            }
        }
    }

    $genCount = get_month_gen_count($pdo, $monthStr);
    $genRemaining = max(0, 3 - $genCount);
    $genInfo = get_month_gen_info($pdo, $monthStr);

    echo json_encode([
        'status' => 'success',
        'month' => $monthStr,
        'officers' => $officers,
        'schedules' => $schedules,
        'presensi' => $presensiMap,
        'holidays' => $holidaysMap ?? [],
        'swap_requests' => $swapRequests ?? [],
        'gen_count' => $genCount,
        'gen_remaining' => 99,
        'gen_info' => $genInfo
    ]);
    exit();
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    // Action: Auto-generate rolling roster for month
    if ($action === 'auto_generate') {
        $monthStr = $input['month'] ?? $_GET['month'] ?? date('Y-m');
        $mode = $input['mode'] ?? 'sequential';

        $genCount = get_month_gen_count($pdo, $monthStr);
        $newCount = inc_month_gen_count($pdo, $monthStr);
        $genRemaining = 99; // Unlimited for Admin
        $genInfo = set_month_gen_info($pdo, $monthStr, 'manual');

        if ($pdo) {
            $stmtOff = $pdo->query("SELECT * FROM pst_officers WHERE is_active = 1 ORDER BY pool_type ASC, id ASC");
            $officers = $stmtOff->fetchAll();

            $holidaysMap = [];
            try {
                $stmtHol = $pdo->query("SELECT * FROM pst_holidays ORDER BY date ASC");
                $holRows = $stmtHol->fetchAll();
                foreach ($holRows as $h) {
                    $holidaysMap[$h['date']] = $h;
                }
            } catch (Exception $e) {}

            $genMap = generate_month_roster($monthStr, $officers, $mode, $holidaysMap);

            $stmtIns = $pdo->prepare("
                INSERT INTO pst_schedules (date, k1_officer_id, k2_officer_id, p_officer_id, r_officer_id, note)
                VALUES (:date, :k1, :k2, :p, :r, :note)
                ON DUPLICATE KEY UPDATE k1_officer_id=:k1, k2_officer_id=:k2, p_officer_id=:p, r_officer_id=:r, note=:note
            ");

            foreach ($genMap as $dt => $sch) {
                if (!$sch['is_weekend'] && empty($sch['is_holiday'])) {
                    $stmtIns->execute([
                        ':date' => $dt,
                        ':k1' => $sch['k1'],
                        ':k2' => $sch['k2'],
                        ':p'  => $sch['p'],
                        ':r'  => $sch['r'],
                        ':note' => $sch['note']
                    ]);
                }
            }
        } else {
            $dataDir = __DIR__ . '/data';
            $offFile = $dataDir . '/pst_officers.json';
            $schFile = $dataDir . '/pst_schedule.json';
            $officers = file_exists($offFile) ? (json_decode(file_get_contents($offFile), true) ?? []) : [];
            
            $genMap = generate_month_roster($monthStr, $officers, $mode);
            $allSchedules = file_exists($schFile) ? json_decode(file_get_contents($schFile), true) : [];

            foreach ($genMap as $dt => $sch) {
                $allSchedules[$dt] = $sch;
            }
            file_put_contents($schFile, json_encode($allSchedules, JSON_PRETTY_PRINT));
        }

        echo json_encode([
            'status' => 'success',
            'message' => "Jadwal piket bulan {$monthStr} berhasil di-generate ulang dengan data petugas terbaru!",
            'gen_count' => $newCount,
            'gen_remaining' => 99,
            'gen_info' => $genInfo
        ]);
        exit();
    }

    // Action: Digital Presensi / Check-In with Username & Password Verification
    if ($action === 'check_in') {
        $dateStr = $input['date'] ?? date('Y-m-d');
        $officerId = (int)($input['officer_id'] ?? 0);
        $roleCode = strtolower(trim($input['role_code'] ?? ''));
        $username = strtolower(trim($input['username'] ?? ''));
        $password = trim($input['password'] ?? '');
        $notes = trim($input['notes'] ?? 'Presensi Digital Mandiri');
        $checkInTime = date('H:i:s');

        if (!$officerId || !$roleCode || empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Username, password, dan sesi piket wajib diisi.']);
            exit();
        }

        // Authenticate officer / admin credentials
        if ($pdo) {
            $stmtU = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmtU->execute([$username]);
            $userRow = $stmtU->fetch();

            if (!$userRow || !password_verify($password, $userRow['password'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Username atau password petugas salah. Silakan periksa kembali.']);
                exit();
            }

            // Verify that user is admin OR assigned officer
            if ($userRow['role'] !== 'admin' && (int)$userRow['officer_id'] !== $officerId) {
                // Check if officer table username matches
                $stmtOffMatch = $pdo->prepare("SELECT name FROM pst_officers WHERE id = ?");
                $stmtOffMatch->execute([$officerId]);
                $offName = $stmtOffMatch->fetchColumn();

                http_response_code(403);
                echo json_encode(['error' => "Akun {$username} bukan petugas yang ditugaskan untuk shift ini ({$offName})."]);
                exit();
            }

            $todayStr = date('Y-m-d');
            $isAdminUser = ($userRow['role'] === 'admin');

            // 1. Date restriction: block presensi for future dates
            if ($dateStr > $todayStr) {
                http_response_code(400);
                echo json_encode(['error' => "Belum waktunya presensi untuk tanggal {$dateStr}. Presensi baru dibuka pada hari H piket."]);
                exit();
            }

            // 2. Block presensi for past dates (for non-admins)
            if ($dateStr < $todayStr && !$isAdminUser) {
                http_response_code(400);
                echo json_encode(['error' => "Presensi untuk tanggal lampau ({$dateStr}) sudah ditutup."]);
                exit();
            }

            // 3. Weekend restriction
            $dayOfWeek = (int)date('N', strtotime($dateStr));
            if ($dayOfWeek >= 6) {
                http_response_code(400);
                echo json_encode(['error' => "Hari ini adalah akhir pekan (libur kantor). Presensi tidak dibuka."]);
                exit();
            }

            // 4. Operational time window restriction (for non-admins on today's shift)
            if ($dateStr === $todayStr && !$isAdminUser) {
                $hour = (int)date('H');
                $min = (int)date('i');
                $timeVal = $hour * 60 + $min;

                if ($roleCode === 'k2') {
                    // Sesi Siang K2 (opened at 12:00 WITA)
                    if ($timeVal < (12 * 60)) {
                        http_response_code(400);
                        echo json_encode(['error' => "Presensi Sesi Siang (K2) belum dibuka. Sesi Siang dibuka mulai jam 12:00 WITA."]);
                        exit();
                    }
                } else {
                    // Sesi Pagi (K1, P, R) (opened at 07:30 WITA)
                    if ($timeVal < (7 * 60 + 30)) {
                        http_response_code(400);
                        echo json_encode(['error' => "Presensi Sesi Pagi belum dibuka. Sesi Pagi dibuka mulai jam 07:30 WITA."]);
                        exit();
                    }
                }

                // Operational closing time (after 17:00 WITA)
                if ($timeVal > (17 * 60)) {
                    http_response_code(400);
                    echo json_encode(['error' => "Jam operasional piket PST hari ini telah berakhir (tutup jam 17:00 WITA)."]);
                    exit();
                }
            }

            $hour = (int)date('H');
            $min = (int)date('i');
            $timeVal = $hour * 60 + $min;

            $status = 'hadir';
            if ($roleCode === 'k1' || $roleCode === 'p' || $roleCode === 'r') {
                if ($timeVal > (8 * 60 + 15)) $status = 'terlambat';
            } else if ($roleCode === 'k2') {
                if ($timeVal > (12 * 60 + 45)) $status = 'terlambat';
            }

            $stmt = $pdo->prepare("
                INSERT INTO pst_presensi (date, officer_id, role_code, check_in_time, status, notes)
                VALUES (:date, :officer_id, :role_code, :check_in_time, :status, :notes)
                ON DUPLICATE KEY UPDATE check_in_time=:check_in_time, status=:status, notes=:notes
            ");
            $stmt->execute([
                ':date' => $dateStr,
                ':officer_id' => $officerId,
                ':role_code' => $roleCode,
                ':check_in_time' => $checkInTime,
                ':status' => $status,
                ':notes' => $notes
            ]);
        } else {
            if ($password !== 'iyatawwa10') {
                http_response_code(401);
                echo json_encode(['error' => 'Password petugas salah.']);
                exit();
            }

            $hour = (int)date('H');
            $min = (int)date('i');
            $timeVal = $hour * 60 + $min;

            $status = 'hadir';
            if ($roleCode === 'k1' || $roleCode === 'p' || $roleCode === 'r') {
                if ($timeVal > (8 * 60 + 15)) $status = 'terlambat';
            } else if ($roleCode === 'k2') {
                if ($timeVal > (12 * 60 + 45)) $status = 'terlambat';
            }

            $presFile = __DIR__ . '/data/pst_presensi.json';
            $allPres = file_exists($presFile) ? json_decode(file_get_contents($presFile), true) : [];
            $key = "{$dateStr}_{$officerId}_{$roleCode}";
            $allPres[$key] = [
                'date' => $dateStr,
                'officer_id' => $officerId,
                'role_code' => $roleCode,
                'check_in_time' => $checkInTime,
                'status' => $status,
                'notes' => $notes
            ];
            file_put_contents($presFile, json_encode($allPres, JSON_PRETTY_PRINT));
        }

        $statusLabel = $status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu';
        echo json_encode([
            'status' => 'success', 
            'message' => "Presensi piket ({$statusLabel}) berhasil dicatat pada pukul {$checkInTime} WITA!"
        ]);
        exit();
    }

    // Action: Update single day assignment
    if ($action === 'update_day') {
        $dateStr = $input['date'] ?? null;
        if (!$dateStr) {
            http_response_code(400);
            echo json_encode(['error' => 'Tanggal wajib diisi.']);
            exit();
        }

        $k1 = isset($input['k1']) && $input['k1'] !== '' ? (int)$input['k1'] : null;
        $k2 = isset($input['k2']) && $input['k2'] !== '' ? (int)$input['k2'] : null;
        $p  = isset($input['p']) && $input['p'] !== '' ? (int)$input['p'] : null;
        $r  = isset($input['r']) && $input['r'] !== '' ? (int)$input['r'] : null;
        $note = $input['note'] ?? null;

        if ($pdo) {
            $stmt = $pdo->prepare("
                INSERT INTO pst_schedules (date, k1_officer_id, k2_officer_id, p_officer_id, r_officer_id, note)
                VALUES (:date, :k1, :k2, :p, :r, :note)
                ON DUPLICATE KEY UPDATE k1_officer_id=:k1, k2_officer_id=:k2, p_officer_id=:p, r_officer_id=:r, note=:note
            ");
            $stmt->execute([
                ':date' => $dateStr,
                ':k1' => $k1,
                ':k2' => $k2,
                ':p'  => $p,
                ':r'  => $r,
                ':note' => $note
            ]);
        } else {
            $schFile = __DIR__ . '/data/pst_schedule.json';
            $allSchedules = file_exists($schFile) ? json_decode(file_get_contents($schFile), true) : [];
            $allSchedules[$dateStr] = [
                'date' => $dateStr,
                'k1' => $k1,
                'k2' => $k2,
                'p'  => $p,
                'r'  => $r,
                'note' => $note
            ];
            file_put_contents($schFile, json_encode($allSchedules, JSON_PRETTY_PRINT));
        }

        echo json_encode(['status' => 'success', 'message' => "Jadwal piket tanggal {$dateStr} berhasil diperbarui."]);
        exit();
    }

    // Action: Save officers (Add / Edit / Toggle active / Set Pool Type / Update User Login)
    if ($action === 'save_officers') {
        $id = isset($input['id']) ? (int)$input['id'] : null;
        $name = trim($input['name'] ?? '');
        $nip = trim($input['nip'] ?? '');
        $position = trim($input['position'] ?? '');
        $poolType = strtoupper(trim($input['pool_type'] ?? 'K'));
        $phone = trim($input['phone'] ?? '');
        $username = strtolower(trim($input['username'] ?? ''));
        $password = trim($input['password'] ?? '');
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nama petugas wajib diisi.']);
            exit();
        }

        if (!in_array($poolType, ['K', 'P', 'R'])) {
            $poolType = 'K';
        }

        if ($pdo) {
            if ($id) {
                $stmt = $pdo->prepare("UPDATE pst_officers SET name = ?, nip = ?, position = ?, pool_type = ?, phone = ?, is_active = ? WHERE id = ?");
                $stmt->execute([$name, $nip, $position, $poolType, $phone, $isActive, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO pst_officers (name, nip, position, pool_type, phone, is_active) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $nip, $position, $poolType, $phone, $isActive]);
                $id = $pdo->lastInsertId();
            }

            // Sync user account for officer if username provided
            if ($username) {
                $stmtUserCheck = $pdo->prepare("SELECT id FROM users WHERE officer_id = ?");
                $stmtUserCheck->execute([$id]);
                $existingUserId = $stmtUserCheck->fetchColumn();

                if ($existingUserId) {
                    if ($password) {
                        $passHash = password_hash($password, PASSWORD_BCRYPT);
                        $stmtU = $pdo->prepare("UPDATE users SET username = ?, password = ?, name = ? WHERE id = ?");
                        $stmtU->execute([$username, $passHash, $name, $existingUserId]);
                    } else {
                        $stmtU = $pdo->prepare("UPDATE users SET username = ?, name = ? WHERE id = ?");
                        $stmtU->execute([$username, $name, $existingUserId]);
                    }
                } else {
                    $passHash = password_hash($password ?: 'iyatawwa10', PASSWORD_BCRYPT);
                    $stmtU = $pdo->prepare("INSERT INTO users (username, password, name, role, officer_id) VALUES (?, ?, ?, 'officer', ?)");
                    $stmtU->execute([$username, $passHash, $name, $id]);
                }
            }
        } else {
            $offFile = __DIR__ . '/data/pst_officers.json';
            $officers = file_exists($offFile) ? (json_decode(file_get_contents($offFile), true) ?? []) : [];
            if ($id) {
                foreach ($officers as &$off) {
                    if ((int)$off['id'] === $id) {
                        $off['name'] = $name;
                        $off['nip'] = $nip;
                        $off['position'] = $position;
                        $off['pool_type'] = $poolType;
                        $off['phone'] = $phone;
                        if ($username) $off['username'] = $username;
                        $off['is_active'] = $isActive;
                        break;
                    }
                }
            } else {
                $maxId = 0;
                foreach ($officers as $off) {
                    if ($off['id'] > $maxId) $maxId = $off['id'];
                }
                $officers[] = [
                    'id' => $maxId + 1,
                    'name' => $name,
                    'nip' => $nip,
                    'position' => $position,
                    'pool_type' => $poolType,
                    'phone' => $phone,
                    'username' => $username,
                    'is_active' => $isActive
                ];
            }
            file_put_contents($offFile, json_encode($officers, JSON_PRETTY_PRINT));
        }

        echo json_encode(['status' => 'success', 'message' => 'Data petugas & tim berhasil disimpan.']);
        exit();
    }

    // Action: Import multiple officers from Excel/CSV
    if ($action === 'import_officers') {
        $officersList = $input['officers'] ?? [];
        if (empty($officersList) || !is_array($officersList)) {
            http_response_code(400);
            echo json_encode(['error' => 'Data petugas dari file Excel/CSV tidak valid atau kosong.']);
            exit();
        }

        $importedCount = 0;
        $updatedCount = 0;

        foreach ($officersList as $item) {
            $name = trim($item['name'] ?? '');
            if (empty($name)) continue;

            $nip = trim($item['nip'] ?? '');
            $position = trim($item['position'] ?? '');
            $poolType = strtoupper(trim($item['pool_type'] ?? 'K'));
            if (!in_array($poolType, ['K', 'P', 'R'])) $poolType = 'K';
            $phone    = trim($item['phone'] ?? '');
            $username = strtolower(trim($item['username'] ?? ''));
            $password = trim($item['password'] ?? '');

            // Auto-generate username dari nama jika tidak diisi
            if (empty($username) && !empty($name)) {
                $parts = explode(' ', strtolower(preg_replace('/[^a-zA-Z ]/', '', $name)));
                $uname = $parts[0] ?? 'petugas';
                if (strlen($uname) < 3 && isset($parts[1])) $uname = $parts[0] . $parts[1];
                $username = $uname;
            }

            if ($pdo) {
                // Check if officer already exists by NIP (numeric, >= 6 digits) or exact Name
                $existingId = null;
                $cleanNip = str_replace([' ', '-'], '', $nip);
                if (!empty($cleanNip) && strlen($cleanNip) >= 6 && is_numeric($cleanNip)) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM pst_officers WHERE nip = ?");
                    $stmtCheck->execute([$nip]);
                    $existingId = $stmtCheck->fetchColumn();
                }

                if (!$existingId && !empty($name)) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM pst_officers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))");
                    $stmtCheck->execute([$name]);
                    $existingId = $stmtCheck->fetchColumn();
                }

                if ($existingId) {
                    $stmtUp = $pdo->prepare("UPDATE pst_officers SET name = ?, nip = ?, position = ?, pool_type = ?, phone = ?, is_active = 1 WHERE id = ?");
                    $stmtUp->execute([$name, $nip, $position, $poolType, $phone, $existingId]);
                    $officerId = $existingId;
                    $updatedCount++;
                } else {
                    $stmtIns = $pdo->prepare("INSERT INTO pst_officers (name, nip, position, pool_type, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)");
                    $stmtIns->execute([$name, $nip, $position, $poolType, $phone]);
                    $officerId = $pdo->lastInsertId();
                    $importedCount++;
                }

                if ($username && $officerId) {
                    $stmtUserCheck = $pdo->prepare("SELECT id FROM users WHERE officer_id = ?");
                    $stmtUserCheck->execute([$officerId]);
                    $existingUserId = $stmtUserCheck->fetchColumn();

                    if (!$existingUserId) {
                        $stmtCheckUname = $pdo->prepare("SELECT id FROM users WHERE username = ?");
                        $stmtCheckUname->execute([$username]);
                        if ($stmtCheckUname->fetchColumn()) {
                            $username = $username . $officerId;
                        }
                    }

                    $passHash = password_hash($password ?: 'iyatawwa10', PASSWORD_BCRYPT);
                    if ($existingUserId) {
                        if ($password) {
                            $stmtU = $pdo->prepare("UPDATE users SET username = ?, password = ?, name = ? WHERE id = ?");
                            $stmtU->execute([$username, $passHash, $name, $existingUserId]);
                        } else {
                            $stmtU = $pdo->prepare("UPDATE users SET username = ?, name = ? WHERE id = ?");
                            $stmtU->execute([$username, $name, $existingUserId]);
                        }
                    } else {
                        $stmtU = $pdo->prepare("INSERT INTO users (username, password, name, role, officer_id) VALUES (?, ?, ?, 'officer', ?)");
                        $stmtU->execute([$username, $passHash, $name, $officerId]);
                    }
                }
            } else {
                // Fallback JSON
                $offFile = __DIR__ . '/data/pst_officers.json';
                $existingOfficers = file_exists($offFile) ? (json_decode(file_get_contents($offFile), true) ?? []) : [];
                
                $found = false;
                foreach ($existingOfficers as &$off) {
                    if (($nip && $off['nip'] === $nip) || $off['name'] === $name) {
                        $off['name'] = $name;
                        $off['nip'] = $nip;
                        $off['position'] = $position;
                        $off['pool_type'] = $poolType;
                        $off['phone'] = $phone;
                        if ($username) $off['username'] = $username;
                        $found = true;
                        $updatedCount++;
                        break;
                    }
                }
                if (!$found) {
                    $maxId = 0;
                    foreach ($existingOfficers as $off) {
                        if ($off['id'] > $maxId) $maxId = $off['id'];
                    }
                    $existingOfficers[] = [
                        'id' => $maxId + 1,
                        'name' => $name,
                        'nip' => $nip,
                        'position' => $position,
                        'pool_type' => $poolType,
                        'phone' => $phone,
                        'username' => $username,
                        'is_active' => 1
                    ];
                    $importedCount++;
                }
                file_put_contents($offFile, json_encode($existingOfficers, JSON_PRETTY_PRINT));
            }
        }

        echo json_encode([
            'status' => 'success',
            'message' => "Berhasil mengimpor Excel/CSV: {$importedCount} petugas baru ditambahkan, {$updatedCount} data diperbarui."
        ]);
        exit();
    }

    // Action: Delete officers (single or bulk delete)
    if ($action === 'delete_officers') {
        $ids = $input['ids'] ?? [];
        if (is_numeric($ids)) $ids = [(int)$ids];
        if (!is_array($ids) || empty($ids)) {
            http_response_code(400);
            echo json_encode(['error' => 'Pilih setidaknya 1 petugas yang akan dihapus.']);
            exit();
        }

        $ids = array_values(array_filter(array_map('intval', $ids)));
        $count = count($ids);

        if ($count === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID petugas tidak valid.']);
            exit();
        }

        if ($pdo) {
            $inClause = implode(',', array_fill(0, $count, '?'));
            // Delete associated user accounts
            $stmtU = $pdo->prepare("DELETE FROM users WHERE officer_id IN ($inClause)");
            $stmtU->execute($ids);

            // Delete officers
            $stmtO = $pdo->prepare("DELETE FROM pst_officers WHERE id IN ($inClause)");
            $stmtO->execute($ids);
        } else {
            $offFile = __DIR__ . '/data/pst_officers.json';
            $existingOfficers = file_exists($offFile) ? (json_decode(file_get_contents($offFile), true) ?? []) : [];
            $filtered = array_values(array_filter($existingOfficers, fn($o) => !in_array((int)$o['id'], $ids)));
            file_put_contents($offFile, json_encode($filtered, JSON_PRETTY_PRINT));
        }

        echo json_encode([
            'status' => 'success',
            'message' => "Berhasil menghapus {$count} data petugas."
        ]);
        exit();
    }

    // Action: Save / Edit Holiday
    if ($action === 'save_holiday') {
        $id = $input['id'] ?? null;
        $date = trim($input['date'] ?? '');
        $title = trim($input['title'] ?? '');
        $type = $input['type'] ?? 'national_holiday';
        $description = trim($input['description'] ?? '');

        if (!$date || !$title) {
            echo json_encode(['status' => 'error', 'message' => 'Tanggal dan Nama Hari Libur wajib diisi.']);
            exit();
        }

        if ($pdo) {
            $stmt = $pdo->prepare("
                INSERT INTO pst_holidays (date, title, type, description)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE title = VALUES(title), type = VALUES(type), description = VALUES(description)
            ");
            $stmt->execute([$date, $title, $type, $description]);
        } else {
            $holFile = __DIR__ . '/data/pst_holidays.json';
            $holidays = file_exists($holFile) ? (json_decode(file_get_contents($holFile), true) ?? []) : [];
            $found = false;
            foreach ($holidays as &$h) {
                if ($h['date'] === $date) {
                    $h['title'] = $title;
                    $h['type'] = $type;
                    $h['description'] = $description;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $holidays[] = [
                    'id' => time(),
                    'date' => $date,
                    'title' => $title,
                    'type' => $type,
                    'description' => $description
                ];
            }
            file_put_contents($holFile, json_encode($holidays, JSON_PRETTY_PRINT));
        }

        echo json_encode(['status' => 'success', 'message' => 'Hari Libur berhasil disimpan.']);
        exit();
    }

    // Action: Delete Holiday
    if ($action === 'delete_holiday') {
        $date = trim($input['date'] ?? '');
        if (!$date) {
            echo json_encode(['status' => 'error', 'message' => 'Tanggal libur wajib ditentukan.']);
            exit();
        }

        if ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM pst_holidays WHERE date = ?");
            $stmt->execute([$date]);
        } else {
            $holFile = __DIR__ . '/data/pst_holidays.json';
            if (file_exists($holFile)) {
                $holidays = json_decode(file_get_contents($holFile), true) ?? [];
                $filtered = array_values(array_filter($holidays, fn($h) => $h['date'] !== $date));
                file_put_contents($holFile, json_encode($filtered, JSON_PRETTY_PRINT));
            }
        }

        echo json_encode(['status' => 'success', 'message' => 'Hari Libur berhasil dihapus.']);
        exit();
    }

    // Action: Sync National Holidays for Year
    if ($action === 'sync_national_holidays') {
        $year = $input['year'] ?? date('Y');
        $defaultHolidays = [
            ["{$year}-01-01", "Tahun Baru {$year} Masehi", "national_holiday"],
            ["{$year}-01-16", "Isra Mikraj Nabi Muhammad SAW", "national_holiday"],
            ["{$year}-02-17", "Tahun Baru Imlek 2577 Kongzili", "national_holiday"],
            ["{$year}-03-19", "Hari Suci Nyepi (Tahun Baru Saka 1948)", "national_holiday"],
            ["{$year}-03-20", "Hari Raya Idul Fitri 1447 Hijriah", "national_holiday"],
            ["{$year}-03-21", "Hari Raya Idul Fitri 1447 Hijriah", "national_holiday"],
            ["{$year}-04-03", "Wafat Yesus Kristus", "national_holiday"],
            ["{$year}-04-05", "Hari Paskah", "national_holiday"],
            ["{$year}-05-01", "Hari Buruh Internasional", "national_holiday"],
            ["{$year}-05-14", "Kenaikan Yesus Kristus", "national_holiday"],
            ["{$year}-05-27", "Hari Raya Idul Adha 1447 Hijriah", "national_holiday"],
            ["{$year}-05-31", "Hari Raya Waisak 2570 BE", "national_holiday"],
            ["{$year}-06-01", "Hari Lahir Pancasila", "national_holiday"],
            ["{$year}-06-16", "Tahun Baru Islam 1448 Hijriah", "national_holiday"],
            ["{$year}-08-17", "Hari Kemerdekaan Republik Indonesia", "national_holiday"],
            ["{$year}-08-25", "Maulid Nabi Muhammad SAW", "national_holiday"],
            ["{$year}-12-25", "Hari Raya Natal", "national_holiday"]
        ];

        if ($pdo) {
            $stmtH = $pdo->prepare("INSERT IGNORE INTO pst_holidays (date, title, type) VALUES (?, ?, ?)");
            foreach ($defaultHolidays as $h) {
                $stmtH->execute($h);
            }
        }

        echo json_encode(['status' => 'success', 'message' => "Berhasil menyinkronkan Hari Libur Nasional Tahun {$year}."]);
        exit();
    }

    // Action: Create Shift Swap Request
    if ($action === 'create_swap_request') {
        $requester_id = (int)($input['requester_id'] ?? 0);
        $target_officer_id = (int)($input['target_officer_id'] ?? 0);
        $requester_date = trim($input['requester_date'] ?? '');
        $requester_role = strtolower(trim($input['requester_role'] ?? 'k1'));
        $target_date = trim($input['target_date'] ?? '');
        $target_role = strtolower(trim($input['target_role'] ?? 'k1'));
        $reason = trim($input['reason'] ?? '');
        $password = trim($input['password'] ?? '');

        if (!$requester_id || !$target_officer_id || !$requester_date || !$target_date) {
            echo json_encode(['status' => 'error', 'message' => 'Semua data pengajuan tukar jadwal wajib diisi.']);
            exit();
        }

        if (empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'Password akun pengaju wajib diisi untuk verifikasi keamanan.']);
            exit();
        }

        if ($pdo) {
            try {
                // Ensure table exists
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS pst_swap_requests (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        requester_id INT NOT NULL,
                        target_officer_id INT NOT NULL,
                        requester_date DATE NOT NULL,
                        requester_role VARCHAR(10) NOT NULL,
                        target_date DATE NOT NULL,
                        target_role VARCHAR(10) NOT NULL,
                        reason TEXT NULL,
                        status VARCHAR(30) DEFAULT 'pending_user2',
                        rejected_by VARCHAR(50) NULL,
                        rejection_reason TEXT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");

                // Check user password against `users` table
                $stmtUser = $pdo->prepare("SELECT * FROM users WHERE officer_id = ? OR id = ? LIMIT 1");
                $stmtUser->execute([$requester_id, $requester_id]);
                $userRow = $stmtUser->fetch();

                $isValidPass = false;
                if ($userRow) {
                    if (password_verify($password, $userRow['password'])) $isValidPass = true;
                    if ($password === $userRow['password']) $isValidPass = true;
                    if (md5($password) === $userRow['password']) $isValidPass = true;
                }
                
                // Allow default password or admin bypass password
                if ($password === 'iyatawwa10' || $password === 'bps7310' || $password === '123456') {
                    $isValidPass = true;
                }

                if (!$isValidPass) {
                    echo json_encode(['status' => 'error', 'message' => 'Password pengaju tidak sesuai! Silakan periksa password akun petugas Anda (default: iyatawwa10).']);
                    exit();
                }

                $stmt = $pdo->prepare("
                    INSERT INTO pst_swap_requests 
                    (requester_id, target_officer_id, requester_date, requester_role, target_date, target_role, reason, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_user2')
                ");
                $stmt->execute([
                    $requester_id, $target_officer_id, $requester_date, $requester_role,
                    $target_date, $target_role, $reason
                ]);
            } catch (Exception $e) {
                echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan pengajuan: ' . $e->getMessage()]);
                exit();
            }
        } else {
            // Fallback JSON
            $dataDir = __DIR__ . '/data';
            if (!is_dir($dataDir)) mkdir($dataDir, 0777, true);
            $swFile = $dataDir . '/pst_swap_requests.json';
            $requests = file_exists($swFile) ? (json_decode(file_get_contents($swFile), true) ?? []) : [];
            $requests[] = [
                'id' => time(),
                'requester_id' => $requester_id,
                'target_officer_id' => $target_officer_id,
                'requester_date' => $requester_date,
                'requester_role' => $requester_role,
                'target_date' => $target_date,
                'target_role' => $target_role,
                'reason' => $reason,
                'status' => 'pending_user2',
                'created_at' => date('Y-m-d H:i:s')
            ];
            file_put_contents($swFile, json_encode($requests, JSON_PRETTY_PRINT));
        }

        echo json_encode(['status' => 'success', 'message' => 'Pengajuan tukar jadwal berhasil dikirim! Menunggu persetujuan rekan piket.']);
        exit();
    }

    // Action: Respond Shift Swap Request
    if ($action === 'respond_swap_request') {
        $requestId = (int)($input['request_id'] ?? 0);
        $actionType = $input['action_type'] ?? ''; // 'acc_user2' | 'reject_user2' | 'acc_admin' | 'reject_admin'
        $rejectionReason = trim($input['rejection_reason'] ?? '');
        $password = trim($input['password'] ?? '');

        if (!$requestId || !$actionType) {
            echo json_encode(['status' => 'error', 'message' => 'ID pengajuan dan jenis respons wajib diisi.']);
            exit();
        }

        if (empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'Password konfirmasi wajib diisi untuk verifikasi keamanan.']);
            exit();
        }

        if ($pdo) {
            $stmt = $pdo->prepare("SELECT * FROM pst_swap_requests WHERE id = ?");
            $stmt->execute([$requestId]);
            $req = $stmt->fetch();
            if (!$req) {
                echo json_encode(['status' => 'error', 'message' => 'Data pengajuan tidak ditemukan.']);
                exit();
            }

            // Verify Password
            $targetOffId = ($actionType === 'acc_user2' || $actionType === 'reject_user2')
                ? $req['target_officer_id']
                : $req['requester_id'];

            $isValidPass = false;

            if (strpos($actionType, 'admin') !== false) {
                // Admin verification
                $stmtAdmin = $pdo->prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
                $stmtAdmin->execute();
                $adm = $stmtAdmin->fetch();
                if ($adm) {
                    if (password_verify($password, $adm['password']) || $password === $adm['password'] || md5($password) === $adm['password']) {
                        $isValidPass = true;
                    }
                }
                if ($password === 'iyatawwa10' || $password === 'bps7310') $isValidPass = true;
            } else {
                // Petugas 2 verification
                $stmtUser = $pdo->prepare("SELECT * FROM users WHERE officer_id = ? OR id = ? LIMIT 1");
                $stmtUser->execute([$targetOffId, $targetOffId]);
                $userRow = $stmtUser->fetch();
                if ($userRow) {
                    if (password_verify($password, $userRow['password']) || $password === $userRow['password'] || md5($password) === $userRow['password']) {
                        $isValidPass = true;
                    }
                }
                if ($password === 'iyatawwa10' || $password === 'bps7310' || $password === '123456') {
                    $isValidPass = true;
                }
            }

            if (!$isValidPass) {
                echo json_encode(['status' => 'error', 'message' => 'Password verifikasi tidak sesuai! Silakan periksa password akun Anda (default: iyatawwa10).']);
                exit();
            }

            if ($actionType === 'reject_user2' || $actionType === 'reject_admin') {
                $rejectedBy = ($actionType === 'reject_admin') ? 'admin' : 'user2';
                $stmtUp = $pdo->prepare("UPDATE pst_swap_requests SET status = 'rejected', rejected_by = ?, rejection_reason = ? WHERE id = ?");
                $stmtUp->execute([$rejectedBy, $rejectionReason, $requestId]);
                echo json_encode(['status' => 'success', 'message' => 'Pengajuan tukar jadwal berhasil ditolak.']);
                exit();
            }

            if ($actionType === 'acc_user2' || $actionType === 'acc_admin') {
                // SWAP OFFICERS IN ROSTER SCHEDULE IMMEDIATELY
                $rDate = $req['requester_date'];
                $rRole = strtolower($req['requester_role']);
                $rCol = "{$rRole}_officer_id";

                $tDate = $req['target_date'];
                $tRole = strtolower($req['target_role']);
                $tCol = "{$tRole}_officer_id";

                $u1_id = $req['requester_id'];
                $u2_id = $req['target_officer_id'];

                $stmtSchR = $pdo->prepare("SELECT id FROM pst_schedules WHERE date = ?");
                $stmtSchR->execute([$rDate]);
                $schR = $stmtSchR->fetch();

                $stmtSchT = $pdo->prepare("SELECT id FROM pst_schedules WHERE date = ?");
                $stmtSchT->execute([$tDate]);
                $schT = $stmtSchT->fetch();

                // Update requester_date: put u2_id into rCol
                if ($schR) {
                    $pdo->prepare("UPDATE pst_schedules SET {$rCol} = ? WHERE date = ?")->execute([$u2_id, $rDate]);
                } else {
                    $pdo->prepare("INSERT INTO pst_schedules (date, {$rCol}) VALUES (?, ?)")->execute([$rDate, $u2_id]);
                }

                // Update target_date: put u1_id into tCol
                if ($schT) {
                    $pdo->prepare("UPDATE pst_schedules SET {$tCol} = ? WHERE date = ?")->execute([$u1_id, $tDate]);
                } else {
                    $pdo->prepare("INSERT INTO pst_schedules (date, {$tCol}) VALUES (?, ?)")->execute([$tDate, $u1_id]);
                }

                // Mark request as approved immediately
                $stmtUp = $pdo->prepare("UPDATE pst_swap_requests SET status = 'approved' WHERE id = ?");
                $stmtUp->execute([$requestId]);

                echo json_encode(['status' => 'success', 'message' => 'Tukar jadwal BERHASIL disetujui! Penugasan piket telah resmi ditukar pada database.']);
                exit();
            }
        }

        echo json_encode(['status' => 'error', 'message' => 'Jenis tindakan tidak valid.']);
        exit();
    }

    // Action: Delete Shift Swap Request (Admin action)
    if ($action === 'delete_swap_request') {
        $requestId = (int)($input['request_id'] ?? 0);
        $clearAllCompleted = !empty($input['clear_all_completed']);

        if ($clearAllCompleted) {
            if ($pdo) {
                $pdo->exec("DELETE FROM pst_swap_requests WHERE status IN ('approved', 'rejected')");
            } else {
                $dataDir = __DIR__ . '/data';
                $swFile = $dataDir . '/pst_swap_requests.json';
                if (file_exists($swFile)) {
                    $requests = json_decode(file_get_contents($swFile), true) ?? [];
                    $filtered = array_values(array_filter($requests, function($r) {
                        return !in_array($r['status'] ?? '', ['approved', 'rejected']);
                    }));
                    file_put_contents($swFile, json_encode($filtered, JSON_PRETTY_PRINT));
                }
            }
            echo json_encode(['status' => 'success', 'message' => 'Seluruh log pengajuan tukar jadwal yang selesai/ditolak berhasil dibersihkan.']);
            exit();
        }

        if (!$requestId) {
            echo json_encode(['status' => 'error', 'message' => 'ID pengajuan tidak valid.']);
            exit();
        }

        if ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM pst_swap_requests WHERE id = ?");
            $stmt->execute([$requestId]);
        } else {
            $dataDir = __DIR__ . '/data';
            $swFile = $dataDir . '/pst_swap_requests.json';
            if (file_exists($swFile)) {
                $requests = json_decode(file_get_contents($swFile), true) ?? [];
                $filtered = array_values(array_filter($requests, function($r) use ($requestId) {
                    return $r['id'] != $requestId;
                }));
                file_put_contents($swFile, json_encode($filtered, JSON_PRETTY_PRINT));
            }
        }

        echo json_encode(['status' => 'success', 'message' => 'Log pengajuan tukar jadwal berhasil dihapus.']);
        exit();
    }
}
?>
