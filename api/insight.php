<?php
// api/insight.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

// Baca input
$input = json_decode(file_get_contents('php://input'), true);
$seriesData = $input['chart_data'] ?? null;

if (empty($seriesData) || empty($seriesData['datasets'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Data deret grafik kosong. Silakan pilih indikator terlebih dahulu.']);
    exit();
}

// Format data menjadi teks deskriptif
$dataText = "Berikut adalah data statistik Kabupaten Barru:\n\n";
foreach ($seriesData['datasets'] as $dataset) {
    $dataText .= "Indikator: " . $dataset['label'] . "\n";
    foreach ($dataset['data'] as $index => $value) {
        $year = $seriesData['labels'][$index] ?? 'Tahun tidak diketahui';
        $valFmt = $value !== null ? $value : 'Tidak ada data';
        $dataText .= "- Tahun " . $year . ": " . $valFmt . "\n";
    }
    $dataText .= "\n";
}

$prompt = "Anda adalah seorang ahli statistik, ekonomi, kemiskinan, kehutanan, dan data indikator makro serta analis data. Berdasarkan data statistik berikut,
berikan insight atau cerita singkat (maksimal 2 paragraf) mengenai tren atau fenomena yang terjadi. Fokus pada data yang diberikan. 
Dapat dijelaskan dengan tren ataupun nilai statistik lainnya dan kemungkinan penyebabnya secara umum. 
Analisisnya yang tajam dan tidak general serta mudah dimengerti oleh segala kalangan. \n\nData: \n" . $dataText . "Di bagian kalimat akhir, tambahkan kalimat referensi seperti: 'Data diolah dari bps.go.id atau barrukab.bps.go.id'.";

$apiKey = get_env('GEMINI_API_KEY');

if (empty($apiKey)) {
    // Fallback: Jika API key belum dikonfigurasi, beri simulasi insight informatif berbasis data
    $simulatedInsight = generate_simulated_insight($seriesData);
    echo json_encode([
        'insight' => $simulatedInsight . "\n\n(Catatan: Ini adalah simulasi analisis karena GEMINI_API_KEY belum diatur di file .env project)"
    ]);
    exit();
}

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $apiKey;
$body = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);

$response = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpStatus !== 200) {
    // Jika API error, fallback ke simulated
    $simulatedInsight = generate_simulated_insight($seriesData);
    echo json_encode([
        'insight' => $simulatedInsight . "\n\n(Catatan: Panggilan ke Gemini API gagal dengan status $httpStatus. Menggunakan analisis deskriptif lokal)"
    ]);
    exit();
}

$jsonResponse = json_decode($response, true);
$insightText = $jsonResponse['candidates'][0]['content']['parts'][0]['text'] ?? '';

if (empty($insightText)) {
    $insightText = "Tidak ada insight yang dapat dihasilkan dari data ini saat ini.";
}

echo json_encode(['insight' => $insightText]);

/**
 * Simulasi insight dinamis jika kunci API kosong atau gagal dihubungi
 */
function generate_simulated_insight($seriesData) {
    $firstDataset = $seriesData['datasets'][0] ?? null;
    if (!$firstDataset) return "Data tidak memadai.";
    
    $label = $firstDataset['label'];
    $data = array_filter($firstDataset['data'], fn($v) => $v !== null);
    $years = $seriesData['labels'] ?? [];
    
    if (empty($data)) return "Belum ada nilai terdaftar untuk indikator: $label.";
    
    $n = count($data);
    $firstVal = reset($data);
    $lastVal = end($data);
    $firstYear = $years[0] ?? '';
    $lastYear = end($years) ?? '';
    
    $diff = $lastVal - $firstVal;
    $trendWord = $diff > 0 ? "peningkatan" : ($diff < 0 ? "penurunan" : "kondisi stabil");
    $diffAbs = abs($diff);
    
    $mean = array_sum($data) / $n;
    
    $insight = "Berdasarkan analisis deret waktu indikator **{$label}** di Kabupaten Barru dari tahun {$firstYear} hingga {$lastYear}, secara umum terjadi tren {$trendWord} dengan selisih kumulatif sekitar " . round($diffAbs, 2) . " unit. Selama periode ini, data tercatat memiliki rata-rata performa sekitar " . round($mean, 2) . " " . ($firstDataset['unit'] ?? '') . ".";
    
    if ($diff > 0) {
        $insight .= " Dinamika peningkatan ini menunjukkan pergerakan aktivitas sektoral atau pengaruh perubahan makroekonomi wilayah Kabupaten Barru. Kebijakan pembangunan daerah disarankan untuk memperkuat faktor pendukung agar tren positif ini dapat terus berkelanjutan.";
    } else if ($diff < 0) {
        $insight .= " Adanya penyusutan nilai ini memerlukan perhatian khusus dari instansi terkait untuk memitigasi dampak pelemahan ekonomi atau sosial yang sedang dialami masyarakat Kabupaten Barru.";
    } else {
        $insight .= " Nilai data yang cenderung konstan mengindikasikan keseimbangan sektoral di Kabupaten Barru pada indikator ini, yang memerlukan stimulus tambahan untuk mendorong pertumbuhan baru.";
    }
    
    $insight .= "\n\nData diolah dari bps.go.id atau barrukab.bps.go.id.";
    return $insight;
}
?>
