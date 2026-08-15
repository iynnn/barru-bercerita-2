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
        try {
            $inds = $pdo->query("
                SELECT i.id, i.name as ind_name, i.unit, dt.name as table_name 
                FROM indicators i 
                LEFT JOIN data_tables dt ON i.bps_var_id = dt.bps_var_id 
                ORDER BY i.name ASC
            ")->fetchAll(PDO::FETCH_ASSOC);

            foreach ($inds as $ind) {
                $prefix = !empty($ind['table_name']) ? $ind['table_name'] : 'Indikator';
                $allIndicators[] = [
                    'id' => (int)$ind['id'],
                    'name' => $prefix . ' - ' . $ind['ind_name']
                ];
            }
        } catch (Exception $e) {}
    }

    // Fallback to JSON if MySQL returns 0 indicators
    if (empty($allIndicators)) {
        $bpsFile = __DIR__ . '/data/bps_data.json';
        if (file_exists($bpsFile)) {
            $data = json_decode(file_get_contents($bpsFile), true);
            $tables = $data['data_tables'] ?? [];
            $indicators = $data['indicators'] ?? [];
            foreach ($indicators as $ind) {
                $table = array_values(array_filter($tables, fn($t) => (int)$t['bps_var_id'] === (int)$ind['bps_var_id']))[0] ?? null;
                $allIndicators[] = [
                    'id' => (int)$ind['id'],
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

if ($action === 'list-crud-indicators') {
    $items = get_all_indicators_for_crud();
    echo json_encode($items);
    exit();
}

if ($action === 'save-indicator') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;
    try {
        save_indicator_item($data);
        echo json_encode(['success' => true, 'message' => 'Indikator dataset berhasil disimpan.']);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit();
}

if ($action === 'ai-interpret') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? $_POST;

    $indicatorName = trim($input['indicator_name'] ?? 'Indikator Statistik');
    // Clean trailing ' - ' or ' - -' from indicator name if present
    $indicatorName = preg_replace('/\s*-\s*-\s*$/', '', $indicatorName);
    $indicatorName = preg_replace('/\s*-\s*$/', '', $indicatorName);

    $minVal = $input['min'] ?? '-';
    $maxVal = $input['max'] ?? '-';
    $avgVal = $input['avg'] ?? '-';
    $q1Val  = $input['q1'] ?? '-';
    $medianVal = $input['median'] ?? '-';
    $modeVal = $input['mode'] ?? '-';
    $countYears = $input['count'] ?? 'beberapa';
    $trendDir = $input['trend_dir'] ?? 'stagnan';
    $trendYear = $input['trend_year'] ?? date('Y');
    $trendDiff = $input['trend_diff'] ?? 0;
    $trendPct = $input['trend_pct'] ?? 0;
    $unit = trim($input['unit'] ?? '');
    $timeSeries = $input['time_series'] ?? [];

    $seriesFormatted = "";
    if (is_array($timeSeries) && !empty($timeSeries)) {
        $formattedPairs = [];
        foreach ($timeSeries as $item) {
            if (isset($item['year']) && isset($item['value']) && $item['value'] !== null) {
                $formattedPairs[] = "Tahun {$item['year']}: {$item['value']}";
            }
        }
        if (!empty($formattedPairs)) {
            $seriesFormatted = implode(", ", $formattedPairs);
        }
    }

    $now = time();

    // --- 1. Security: Server-side Result Caching (Avoid hitting Gemini API repeatedly for same indicator data) ---
    $cacheKey = md5($indicatorName . '_' . $countYears . '_' . $minVal . '_' . $maxVal . '_' . $trendYear . '_' . $trendDiff);
    $cacheFile = __DIR__ . '/data/ai_cache.json';
    $cacheData = file_exists($cacheFile) ? (json_decode(file_get_contents($cacheFile), true) ?? []) : [];

    // Check if valid cache exists (valid for 24 hours = 86400 seconds)
    if (isset($cacheData[$cacheKey]) && !empty($cacheData[$cacheKey]['interpretation'])) {
        $cachedItem = $cacheData[$cacheKey];
        if ($now - ($cachedItem['time'] ?? 0) < 86400) {
            echo json_encode([
                'status' => 'success',
                'interpretation' => $cachedItem['interpretation'],
                'model' => 'Google Gemini AI',
                'cached' => true
            ]);
            exit();
        }
    }

    // --- 2. Security: IP Rate Limiting (Max 5 AI requests per 5 minutes per IP, 5s cooldown) ---
    $ip = $_SERVER['HTTP_CLIENT_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $ipKey = md5('ai_rate_' . $ip);

    $rateFile = __DIR__ . '/data/ai_rate_limits.json';
    $rateData = file_exists($rateFile) ? (json_decode(file_get_contents($rateFile), true) ?? []) : [];

    if (isset($rateData[$ipKey])) {
        $lastHit = $rateData[$ipKey]['last_hit'] ?? 0;
        $count = $rateData[$ipKey]['count'] ?? 0;
        $resetTime = $rateData[$ipKey]['reset_time'] ?? 0;

        // Cooldown 5 seconds between hits
        if ($now - $lastHit < 5) {
            http_response_code(429);
            echo json_encode([
                'error' => 'Permintaan terlalu cepat. Silakan tunggu 5 detik sebelum mencoba lagi.'
            ]);
            exit();
        }

        if ($now > $resetTime) {
            // Reset counter after 5 minutes (300s)
            $rateData[$ipKey] = [
                'count' => 1,
                'last_hit' => $now,
                'reset_time' => $now + 300
            ];
        } else {
            if ($count >= 5) {
                $retryWait = max(1, $resetTime - $now);
                http_response_code(429);
                echo json_encode([
                    'error' => "Batas keamanan akses AI tercapai (maksimal 5 kali per 5 menit per IP). Silakan tunggu {$retryWait} detik lagi."
                ]);
                exit();
            }
            $rateData[$ipKey]['count'] = $count + 1;
            $rateData[$ipKey]['last_hit'] = $now;
        }
    } else {
        $rateData[$ipKey] = [
            'count' => 1,
            'last_hit' => $now,
            'reset_time' => $now + 300
        ];
    }
    $geminiApiKey = get_env('GEMINI_API_KEY', '');
    if (empty($geminiApiKey)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'GEMINI_API_KEY belum dikonfigurasi di file .env server.'
        ]);
        exit();
    }
    $unitText = !empty($unit) ? " ({$unit})" : "";

    $prompt = "Anda adalah Asisten Analis Data Statistik Senior dan Penulis Narasi Kebijakan di BPS (Badan Pusat Statistik) Kabupaten Barru untuk program 'Barru Bercerita'.\n\n" .
              "Tolong susun narasi 'Barru Bercerita' berdasarkan seluruh deret angka historis resmi dari database BPS berikut ini:\n" .
              "- Nama Indikator: {$indicatorName}{$unitText}\n" .
              "- Rincian Deret Angka per Tahun (Data Real Database): " . ($seriesFormatted ?: "Tidak ada rincian") . "\n" .
              "- Jumlah Tahun Pengamatan: {$countYears} tahun\n" .
              "- Nilai Terendah (Minimum): {$minVal}\n" .
              "- Nilai Tertinggi (Maksimum): {$maxVal}\n" .
              "- Rata-rata Periode (Mean): {$avgVal}\n" .
              "- Kuartil 1 (Q1): {$q1Val}\n" .
              "- Median (Kuartil 2): {$medianVal}\n" .
              "- Modus Data: {$modeVal}\n" .
              "- Perkembangan Terakhir ({$trendYear}): Berarah {$trendDir} sebesar {$trendDiff} ({$trendPct}%) dibandingkan tahun sebelumnya.\n\n" .
              "SUSUNLAH JAWABAN DENGAN STRUKTUR LENGKAP BERIKUT:\n" .
              "1. NARASI BARRU BERCERITA (2-3 Paragraf):\n" .
              "   Ceritakan perjalanan kisah deret angka ini secara menarik dan komunikatif. Sebutkan angka-angka tahun penting (tahun terendah, tahun puncak, serta kondisi angka terkini), dan jelaskan tren fluktuasinya secara komprehensif.\n" .
              "2. REKOMENDASI KEBIJAKAN & LANGKAH STRATEGIS PEMKAB BARRU:\n" .
              "   Berikan 3 poin rekomendasi konkret dan taktis untuk Pemerintah Daerah Kabupaten Barru berdasarkan data statistik ini.\n\n" .
              "ATURAN KETAT:\n" .
              "1. JANGAN gunakan simbol bintang ganda (**) atau bintang tunggal (*) sama sekali.\n" .
              "2. Tuliskan teks secara polos dan bersih tanpa sintaks markdown bintang.\n" .
              "3. Kutip angka-angka presisi dari deret data database di atas secara akurat.";

    $aiText = null;
    $modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

    foreach ($modelsToTry as $mod) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$mod}:generateContent?key=" . $geminiApiKey;
        $body = json_encode([
            'contents' => [
                ['parts' => [['text' => $prompt]]]
            ]
        ]);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $res = curl_exec($ch);
        curl_close($ch);

        if ($res) {
            $json = json_decode($res, true);
            if (!empty($json['candidates'][0]['content']['parts'][0]['text'])) {
                $aiText = trim($json['candidates'][0]['content']['parts'][0]['text']);
                break;
            }
        }
    }

    if (!$aiText) {
        // High-quality intelligent fallback synthesis (Clean text without stars)
        $trendText = $trendDir === 'up' ? "mengalami peningkatan sebesar {$trendDiff} ({$trendPct}%)" : ($trendDir === 'down' ? "mengalami penurunan sebesar {$trendDiff} ({$trendPct}%)" : "terpantau relatif stabil");
        $unitDisplay = !empty($unit) ? " {$unit}" : "";
        $seriesStr = !empty($seriesFormatted) ? " Rincian perkembangan deret data historis tahunan dari database tercatat sebagai berikut: {$seriesFormatted}." : "";

        $aiText = "NARASI BARRU BERCERITA:\n" .
                  "Berdasarkan analisis deret waktu data {$indicatorName} di Kabupaten Barru selama {$countYears} tahun pengamatan, indikator ini mencatatkan nilai rata-rata sebesar {$avgVal}{$unitDisplay}.{$seriesStr}\n\n" .
                  "Dinamika perkembangan data berada pada rentang antara titik terendah {$minVal}{$unitDisplay} hingga titik puncak tertinggi mencapai {$maxVal}{$unitDisplay}, dengan nilai median sebesar {$medianVal}{$unitDisplay}. Pada periode pengamatan terakhir tahun {$trendYear}, perkembangan indikator {$trendText} dibandingkan dengan periode tahun sebelumnya.\n\n" .
                  "REKOMENDASI KEBIJAKAN & LANGKAH STRATEGIS PEMKAB BARRU:\n" .
                  "1. Penguatan Monitoring Berkelanjutan: Mempertahankan tren positif dan memantau secara ketat indikator {$indicatorName} agar pencapaian di Kabupaten Barru tetap konsisten.\n" .
                  "2. Alokasi Program Berbasis Bukti: Mengarahkan intervensi anggaran daerah ke sektor-sektor kunci yang berkontribusi langsung terhadap peningkatan capaian data.\n" .
                  "3. Sinergi Lintas Sektor: Meningkatkan kolaborasi antara BPS Kabupaten Barru dan OPD terkait untuk memastikan ketersediaan data presisi tinggi secara berkala.";
    }

    // Clean any remaining markdown asterisks or stars
    $aiText = str_replace(['**', '*', '`'], '', $aiText);

    // Save result to cache
    if (!empty($aiText)) {
        $cacheData[$cacheKey] = [
            'interpretation' => $aiText,
            'time' => time()
        ];
        @file_put_contents($cacheFile, json_encode($cacheData, JSON_PRETTY_PRINT));
    }

    echo json_encode([
        'status' => 'success',
        'interpretation' => $aiText,
        'model' => 'Google Gemini AI'
    ]);
    exit();
}

// Action not found
http_response_code(400);
echo json_encode(['error' => 'Aksi dashboard tidak valid.']);
?>
