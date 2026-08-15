<?php
// api/sync.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (true) {
    // OPTIONS check
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        exit(0);
    }
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/BpsClient.php';

// Endpoint to fetch variables list for search/dropdown
$action = $_GET['action'] ?? '';
if ($action === 'list_vars' || $action === 'list-vars') {
    $cacheFile = __DIR__ . '/data/bps_variables_cache.json';
    if (file_exists($cacheFile)) {
        echo file_get_contents($cacheFile);
        exit();
    }

    $defaultVars = [
        ['id' => 81, 'name' => 'Persentase Penduduk Miskin (P0)'],
        ['id' => 34, 'name' => 'Tingkat Pengangguran Terbuka (TPT)'],
        ['id' => 52, 'name' => 'PDRB Atas Dasar Harga Konstan (ADHK)'],
        ['id' => 51, 'name' => 'PDRB Atas Dasar Harga Berlaku (ADHB)'],
        ['id' => 26, 'name' => 'Indeks Pembangunan Manusia (IPM)'],
        ['id' => 15, 'name' => 'Gini Ratio / Tingkat Ketimpangan'],
        ['id' => 12, 'name' => 'Angka Harapan Hidup (AHH)'],
        ['id' => 74, 'name' => 'Rata-rata Lama Sekolah (RLS)'],
        ['id' => 75, 'name' => 'Harapan Lama Sekolah (HLS)'],
    ];

    $apiKey = get_env('BPS_API_KEY', '6f2b04253bc3c59d762755e3f322f550');
    $domain = $_GET['domain'] ?? get_env('BPS_DOMAIN', '7310');
    $client = new BpsClient($apiKey, $domain);
    try {
        $vars = $client->fetchVars($domain);
        if (!empty($vars)) {
            $formatted = array_map(function($v) {
                return [
                    'id' => (int)($v['var_id'] ?? $v['id']),
                    'name' => $v['title'] ?? $v['name'] ?? ''
                ];
            }, $vars);
            
            usort($formatted, function($a, $b) {
                return strcasecmp($a['name'], $b['name']);
            });

            file_put_contents($cacheFile, json_encode($formatted, JSON_PRETTY_PRINT));
            echo json_encode($formatted);
        } else {
            file_put_contents($cacheFile, json_encode($defaultVars, JSON_PRETTY_PRINT));
            echo json_encode($defaultVars);
        }
    } catch (Exception $e) {
        file_put_contents($cacheFile, json_encode($defaultVars, JSON_PRETTY_PRINT));
        echo json_encode($defaultVars);
    }
    exit();
}

set_time_limit(600);

// Hubungkan database
$pdo = get_db_connection_safe();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$apiKey = get_env('BPS_API_KEY', '6f2b04253bc3c59d762755e3f322f550');
$domain = $input['domain'] ?? $_GET['domain'] ?? get_env('BPS_DOMAIN', '7310');
$client = new BpsClient($apiKey, $domain);

$varIdSingle = $input['var_id'] ?? $input['varId'] ?? $_GET['var_id'] ?? null;
$varIds = $input['varIds'] ?? $input['var_ids'] ?? [];
if ($varIdSingle) {
    $varIds = [(int)$varIdSingle];
} elseif (!empty($varIds) && is_string($varIds)) {
    $varIds = array_filter(array_map('intval', explode(',', $varIds)));
}

if (empty($varIds)) {
    if ($pdo) {
        try {
            $stmt_vars = $pdo->query("SELECT DISTINCT bps_var_id FROM indicators WHERE bps_var_id IS NOT NULL AND bps_var_id > 0");
            $varIds = $stmt_vars->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            $varIds = [];
        }
    } else {
        // Fallback JSON
        $bpsFile = __DIR__ . '/data/bps_data.json';
        if (file_exists($bpsFile)) {
            $data = json_decode(file_get_contents($bpsFile), true);
            $varIds = array_map(fn($t) => (int)$t['bps_var_id'], $data['data_tables'] ?? []);
        }
    }
}

if (empty($varIds)) {
    $varIds = [81, 34, 52];
}

$startThId = isset($input['start_year']) ? (int)$input['start_year'] : (isset($input['start']) ? (int)$input['start'] : 118);
$endThId = isset($input['end_year']) ? (int)$input['end_year'] : (isset($input['end']) ? (int)$input['end'] : 126);

try {
    $cacheSubjectFile = __DIR__ . '/data/bps_subjects_cache.json';
    $subjects = [];
    if (file_exists($cacheSubjectFile) && (time() - filemtime($cacheSubjectFile) < 86400)) {
        $subjects = json_decode(file_get_contents($cacheSubjectFile), true) ?? [];
    } else {
        try {
            $subjects = $client->fetchSubjects($domain);
            if (!empty($subjects)) {
                @file_put_contents($cacheSubjectFile, json_encode($subjects));
            }
        } catch (Exception $e) {
            $subjects = [];
        }
    }

    if ($pdo) {
        // --- MODE DATABASE AKTIF ---
        $syncedCount = 0;
        $pdo->beginTransaction();

        $stmt_subject = $pdo->prepare("
            INSERT INTO categories (id, name, description)
            VALUES (:id, :name, :description)
            ON DUPLICATE KEY UPDATE name = :name, description = :description
        ");
        foreach ($subjects as $sub) {
            $subId = $sub['sub_id'] ?? $sub['id'] ?? null;
            $subName = $sub['title'] ?? $sub['name'] ?? null;
            $subDesc = $sub['keterangan'] ?? $sub['description'] ?? null;

            if ($subId !== null && $subName !== null) {
                $stmt_subject->execute([
                    ':id' => (int)$subId,
                    ':name' => mb_substr((string)$subName, 0, 100),
                    ':description' => $subDesc ? mb_substr((string)$subDesc, 0, 300) : null
                ]);
            }
        }

        $regionId = 1;

        foreach ($varIds as $varId) {
            $varId = (int)$varId;
            $rows = $client->exploreVar($varId, $startThId, $endThId, $domain);
            if (empty($rows)) {
                continue;
            }

            $sample = $rows[0];
            $varLabel = $sample['var_label'] ?? "Variabel {$varId}";
            $subjectId = $sample['subject_id'] ?? 0;
            $subjectLabel = $sample['subject_label'] ?? "Kategori {$subjectId}";

            if ($subjectId > 0) {
                $stmt_check_cat = $pdo->prepare("INSERT INTO categories (id, name) VALUES (:id, :name) ON DUPLICATE KEY UPDATE id=id");
                $stmt_check_cat->execute([':id' => $subjectId, ':name' => mb_substr($subjectLabel, 0, 100)]);
            }

            $stmt_table = $pdo->prepare("
                INSERT INTO data_tables (bps_var_id, name)
                VALUES (:bps_var_id, :name)
                ON DUPLICATE KEY UPDATE name = :name
            ");
            $stmt_table->execute([':bps_var_id' => $varId, ':name' => mb_substr($varLabel, 0, 255)]);

            foreach ($rows as $r) {
                $vervarId = $r['vervar_id'];
                $turvarId = $r['turvar_id'];
                $vervarLabel = $r['vervar_label'];
                $turvarLabel = $r['turvar_label'];
                $unit = $r['unit'] ?? '';
                $description = $r['description'] ?? '';

                $indicatorName = $vervarLabel ?: $varLabel;
                if ($r['labelvervar']) {
                    $indicatorName = "{$r['labelvervar']} - {$indicatorName}";
                }
                if ($turvarLabel && stripos($turvarLabel, 'Tidak ada') === false) {
                    $indicatorName = "{$varLabel} ({$turvarLabel})";
                }

                // Find existing indicator by BPS IDs or Category + Name
                $vervarVal = $vervarId !== null ? (int)$vervarId : 0;
                $turvarVal = $turvarId !== null ? (int)$turvarId : 0;
                $cleanNameStr = mb_substr($indicatorName, 0, 255);

                $stmt_find = $pdo->prepare("
                    SELECT id FROM indicators 
                    WHERE (bps_var_id = :var_id AND COALESCE(bps_vervar_id, 0) = :vervar_id AND COALESCE(bps_turvar_id, 0) = :turvar_id)
                       OR (category_id = :cat_id AND name = :name)
                    ORDER BY id ASC
                    LIMIT 1
                ");
                $stmt_find->execute([
                    ':var_id' => $varId,
                    ':vervar_id' => $vervarVal,
                    ':turvar_id' => $turvarVal,
                    ':cat_id' => $subjectId,
                    ':name' => $cleanNameStr
                ]);
                $indicatorId = $stmt_find->fetchColumn();

                if ($indicatorId) {
                    // Update existing
                    $stmt_upd = $pdo->prepare("
                        UPDATE indicators 
                        SET category_id = :category_id,
                            bps_var_id = :bps_var_id,
                            bps_vervar_id = :bps_vervar_id,
                            bps_turvar_id = :bps_turvar_id,
                            name = :name,
                            unit = :unit,
                            description = :description,
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $stmt_upd->execute([
                        ':category_id' => $subjectId,
                        ':bps_var_id' => $varId,
                        ':bps_vervar_id' => $vervarId,
                        ':bps_turvar_id' => $turvarId,
                        ':name' => $cleanNameStr,
                        ':unit' => mb_substr($unit, 0, 50),
                        ':description' => $description,
                        ':id' => $indicatorId
                    ]);
                } else {
                    // Insert new
                    $stmt_ind = $pdo->prepare("
                        INSERT INTO indicators (category_id, bps_var_id, bps_vervar_id, bps_turvar_id, name, unit, description)
                        VALUES (:category_id, :bps_var_id, :bps_vervar_id, :bps_turvar_id, :name, :unit, :description)
                    ");
                    $stmt_ind->execute([
                        ':category_id' => $subjectId,
                        ':bps_var_id' => $varId,
                        ':bps_vervar_id' => $vervarId,
                        ':bps_turvar_id' => $turvarId,
                        ':name' => $cleanNameStr,
                        ':unit' => mb_substr($unit, 0, 50),
                        ':description' => $description
                    ]);
                    $indicatorId = $pdo->lastInsertId();
                }

                if (!$indicatorId) continue;

                // Sync publications
                if (!empty($r['related'])) {
                    $stmt_del_pub_rel = $pdo->prepare("DELETE FROM indicator_publication WHERE indicator_id = :indicator_id");
                    $stmt_del_pub_rel->execute([':indicator_id' => $indicatorId]);

                    foreach ($r['related'] as $rel) {
                        $relId = $rel['id'] ?? null;
                        $relTitle = $rel['title'] ?? null;
                        $relLink = $rel['link'] ?? null;

                        if ($relTitle && $relLink) {
                            $stmt_pub = $pdo->prepare("
                                INSERT INTO publications (bps_related_id, title, link)
                                VALUES (:bps_related_id, :title, :link)
                                ON DUPLICATE KEY UPDATE title = :title, link = :link
                            ");
                            $stmt_pub->execute([
                                ':bps_related_id' => $relId,
                                ':title' => mb_substr($relTitle, 0, 255),
                                ':link' => $relLink
                            ]);

                            $stmt_get_pub = $pdo->prepare("SELECT id FROM publications WHERE title = :title AND link = :link LIMIT 1");
                            $stmt_get_pub->execute([':title' => $relTitle, ':link' => $relLink]);
                            $pubId = $stmt_get_pub->fetchColumn();

                            if ($pubId) {
                                $stmt_pub_rel = $pdo->prepare("
                                    INSERT INTO indicator_publication (indicator_id, publication_id)
                                    VALUES (:indicator_id, :publication_id)
                                    ON DUPLICATE KEY UPDATE indicator_id=indicator_id
                                ");
                                $stmt_pub_rel->execute([':indicator_id' => $indicatorId, ':publication_id' => $pubId]);
                            }
                        }
                    }
                }

                // Insert values
                $year = (int)$r['tahun'];
                $value = (float)$r['nilai'];

                if ($year > 0) {
                    $stmt_val = $pdo->prepare("
                        INSERT INTO indicator_values (indicator_id, region_id, year, value, last_synced_at)
                        VALUES (:indicator_id, :region_id, :year, :value, NOW())
                        ON DUPLICATE KEY UPDATE value = :value, last_synced_at = NOW()
                    ");
                    $stmt_val->execute([
                        ':indicator_id' => $indicatorId,
                        ':region_id' => $regionId,
                        ':year' => $year,
                        ':value' => $value
                    ]);
                    $syncedCount++;
                }
            }
        }
        $pdo->commit();

        // Tulis backup JSON BPS
        $stmt_c = $pdo->query("SELECT * FROM categories");
        $categories = $stmt_c->fetchAll();

        $stmt_t = $pdo->query("SELECT * FROM data_tables");
        $data_tables = $stmt_t->fetchAll();

        $stmt_i = $pdo->query("SELECT * FROM indicators");
        $indicators = $stmt_i->fetchAll();

        $stmt_v = $pdo->query("SELECT indicator_id, year, value FROM indicator_values");
        $values = $stmt_v->fetchAll();

        $backupPayload = [
            'categories' => $categories,
            'data_tables' => $data_tables,
            'indicators' => $indicators,
            'values' => $values,
            'publications' => [],
            'indicator_publication' => []
        ];
        file_put_contents(__DIR__ . '/data/bps_data.json', json_encode($backupPayload, JSON_PRETTY_PRINT));
    } else {
        // --- MODE FALLBACK JSON ---
        $bpsFile = __DIR__ . '/data/bps_data.json';
        $jsonData = file_exists($bpsFile) ? json_decode(file_get_contents($bpsFile), true) : [
            'categories' => [],
            'data_tables' => [],
            'indicators' => [],
            'values' => [],
            'publications' => [],
            'indicator_publication' => []
        ];

        // 1. Update Categories
        foreach ($subjects as $sub) {
            $subId = (int)($sub['sub_id'] ?? $sub['id']);
            $subName = $sub['title'] ?? $sub['name'];
            $subDesc = $sub['keterangan'] ?? $sub['description'];

            $found = false;
            foreach ($jsonData['categories'] as &$cat) {
                if ((int)$cat['id'] === $subId) {
                    $cat['name'] = $subName;
                    $cat['description'] = $subDesc;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $jsonData['categories'][] = ['id' => $subId, 'name' => $subName, 'description' => $subDesc];
            }
        }

        // 2. Loop exploreVar
        $syncedCount = 0;
        foreach ($varIds as $varId) {
            $varId = (int)$varId;
            $rows = $client->exploreVar($varId, $startThId, $endThId, $domain);
            if (empty($rows)) continue;

            $sample = $rows[0];
            $varLabel = $sample['var_label'] ?? "Variabel {$varId}";
            $subjectId = (int)($sample['subject_id'] ?? 0);

            // Update data_tables list
            $tFound = false;
            foreach ($jsonData['data_tables'] as &$table) {
                if ((int)$table['bps_var_id'] === $varId) {
                    $table['name'] = $varLabel;
                    $tFound = true;
                    break;
                }
            }
            if (!$tFound) {
                $jsonData['data_tables'][] = ['bps_var_id' => $varId, 'name' => $varLabel];
            }

            // Map rows and indicators
            foreach ($rows as $r) {
                $vervarId = $r['vervar_id'];
                $turvarId = $r['turvar_id'];
                $vervarLabel = $r['vervar_label'];
                $turvarLabel = $r['turvar_label'];
                $unit = $r['unit'] ?? '';
                $description = $r['description'] ?? '';

                $indicatorName = $vervarLabel ?: $varLabel;
                if ($r['labelvervar']) {
                    $indicatorName = "{$r['labelvervar']} - {$indicatorName}";
                }
                if ($turvarLabel && stripos($turvarLabel, 'Tidak ada') === false) {
                    $indicatorName = "{$varLabel} ({$turvarLabel})";
                }

                // Cari indicator id
                $indicatorId = null;
                foreach ($jsonData['indicators'] as &$ind) {
                    if ((int)$ind['bps_var_id'] === $varId && $ind['bps_vervar_id'] === $vervarId && $ind['bps_turvar_id'] === $turvarId) {
                        $ind['name'] = $indicatorName;
                        $ind['unit'] = $unit;
                        $ind['description'] = $description;
                        $indicatorId = $ind['id'];
                        break;
                    }
                }
                if (!$indicatorId) {
                    $maxIndId = 0;
                    foreach ($jsonData['indicators'] as $ind) {
                        if ($ind['id'] > $maxIndId) $maxIndId = $ind['id'];
                    }
                    $indicatorId = $maxIndId + 1;
                    $jsonData['indicators'][] = [
                        'id' => $indicatorId,
                        'category_id' => $subjectId,
                        'bps_var_id' => $varId,
                        'bps_vervar_id' => $vervarId,
                        'bps_turvar_id' => $turvarId,
                        'name' => $indicatorName,
                        'unit' => $unit,
                        'description' => $description
                    ];
                }

                // Insert / update values
                $year = (int)$r['tahun'];
                $value = (float)$r['nilai'];

                if ($year > 0) {
                    $valFound = false;
                    foreach ($jsonData['values'] as &$val) {
                        if ((int)$val['indicator_id'] === $indicatorId && (int)$val['year'] === $year) {
                            $val['value'] = $value;
                            $valFound = true;
                            break;
                        }
                    }
                    if (!$valFound) {
                        $jsonData['values'][] = [
                            'indicator_id' => $indicatorId,
                            'year' => $year,
                            'value' => $value
                        ];
                    }
                    $syncedCount++;
                }
            }
        }
        file_put_contents($bpsFile, json_encode($jsonData, JSON_PRETTY_PRINT));
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Proses sinkronisasi data BPS ke local storage selesai' . (!$pdo ? ' (mode Fallback JSON aktif)' : '') . '!',
        'file_path' => 'api/data/bps_data.json',
        'synced_vars' => $varIds,
        'synced_values_count' => $syncedCount ?? 0
    ]);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal sinkronisasi: ' . $e->getMessage() . ' (line ' . $e->getLine() . ' in ' . basename($e->getFile()) . ')'
    ]);
}
?>
