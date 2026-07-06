<?php
// api/config.php
date_default_timezone_set('Asia/Makassar');

// Global state variables
$db_fallback_active = false;
$pdo_conn = null;

/**
 * Membaca variabel environment dari file .env di root project
 */
function get_env($key, $default = null) {
    static $env = null;
    if ($env === null) {
        $env = [];
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || strpos($line, '#') === 0) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $env[trim($parts[0])] = trim($parts[1], "\"' ");
                }
            }
        }
    }
    return $env[$key] ?? $_ENV[$key] ?? getenv($key) ?? $default;
}

define('DB_NAME', get_env('DB_DATABASE', 'barru_bercerita_2'));

/**
 * Mendapatkan koneksi database secara aman dengan penanganan kegagalan
 */
function get_db_connection_safe() {
    global $db_fallback_active, $pdo_conn;
    if ($pdo_conn) return $pdo_conn;
    if ($db_fallback_active) return null;

    $configs = [
        ['host' => '127.0.0.1', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
        ['host' => 'localhost', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
        ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => ''],
        ['host' => 'localhost', 'port' => '3306', 'user' => 'root', 'pass' => ''],
        ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => 'root'],
        ['host' => 'localhost', 'port' => '3306', 'user' => 'root', 'pass' => 'root']
    ];

    $envHost = get_env('DB_HOST');
    if ($envHost) {
        array_unshift($configs, [
            'host' => $envHost,
            'port' => get_env('DB_PORT', '3306'),
            'user' => get_env('DB_USERNAME', 'root'),
            'pass' => get_env('DB_PASSWORD', '')
        ]);
    }

    foreach ($configs as $config) {
        try {
            $dsn = "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4";
            $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 1 // Fast timeout to trigger fallback quickly
            ]);
            
            $db_name = DB_NAME;
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `$db_name`");
            
            // Buat tabel jika belum ada
            create_tables_if_not_exist($pdo);
            clean_duplicate_indicators($pdo);
            $pdo_conn = $pdo;
            return $pdo;
        } catch (PDOException $e) {
            // Coba config selanjutnya
        }
    }

    // Jika gagal semua, nyalakan status JSON fallback
    $db_fallback_active = true;
    seed_initial_json_data(); // Pastikan file JSON awal terisi data
    clean_json_duplicates();
    return null;
}

function create_tables_if_not_exist($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS categories (
            id INT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS data_tables (
            bps_var_id INT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS indicators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            bps_var_id INT NULL,
            bps_vervar_id INT NULL,
            bps_turvar_id INT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            unit VARCHAR(50) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_bps_ind (bps_var_id, bps_vervar_id, bps_turvar_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS regions (
            id INT PRIMARY KEY,
            code VARCHAR(50) NULL,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS indicator_values (
            id INT AUTO_INCREMENT PRIMARY KEY,
            indicator_id INT NOT NULL,
            region_id INT NOT NULL,
            year INT NOT NULL,
            value DOUBLE NOT NULL,
            last_synced_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_val (indicator_id, region_id, year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS integrated_p_s_t_services (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            url TEXT NOT NULL,
            description TEXT NOT NULL,
            logo VARCHAR(255) NULL,
            theme_class VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS publications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bps_related_id VARCHAR(100) NULL,
            title VARCHAR(255) NOT NULL,
            link TEXT NOT NULL,
            parent_publication_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS indicator_publication (
            indicator_id INT NOT NULL,
            publication_id INT NOT NULL,
            PRIMARY KEY (indicator_id, publication_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            `key` VARCHAR(100) PRIMARY KEY,
            `value` TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Seed regions
    $count = $pdo->query("SELECT COUNT(*) FROM regions")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("INSERT INTO regions (id, code, name) VALUES (1, '7310', 'Kabupaten Barru')");
    }
}

/**
 * Seed initial mock BPS & PST data to local JSON if they don't exist
 */
function seed_initial_json_data() {
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }

    $bpsFile = $dataDir . '/bps_data.json';
    if (!file_exists($bpsFile)) {
        // Seed default statistical indicators (Kemiskinan, Angkatan Kerja, PDRB)
        $initialBps = [
            'categories' => [
                ['id' => 81, 'name' => 'Kemiskinan', 'description' => 'Data dan indikator sosial ekonomi mengenai kemiskinan makro Kabupaten Barru.'],
                ['id' => 34, 'name' => 'Tenaga Kerja', 'description' => 'Statistik ketenagakerjaan, tingkat pengangguran terbuka, dan angkatan kerja.'],
                ['id' => 52, 'name' => 'PDRB', 'description' => 'Produk Domestik Regional Bruto atas dasar harga konstan dan berlaku.']
            ],
            'data_tables' => [
                ['bps_var_id' => 81, 'name' => 'Persentase Penduduk Miskin'],
                ['bps_var_id' => 34, 'name' => 'Tingkat Pengangguran Terbuka'],
                ['bps_var_id' => 52, 'name' => 'PDRB Atas Dasar Harga Konstan']
            ],
            'indicators' => [
                ['id' => 1, 'category_id' => 81, 'bps_var_id' => 81, 'bps_vervar_id' => 1, 'bps_turvar_id' => null, 'name' => 'Persentase Penduduk Miskin - Kota', 'unit' => '%', 'description' => 'Persentase jumlah penduduk miskin di wilayah perkotaan.'],
                ['id' => 4, 'category_id' => 81, 'bps_var_id' => 81, 'bps_vervar_id' => 2, 'bps_turvar_id' => null, 'name' => 'Persentase Penduduk Miskin - Desa', 'unit' => '%', 'description' => 'Persentase jumlah penduduk miskin di wilayah perdesaan.'],
                ['id' => 24, 'category_id' => 34, 'bps_var_id' => 34, 'bps_vervar_id' => 1, 'bps_turvar_id' => null, 'name' => 'Tingkat Pengangguran Terbuka - Laki-laki', 'unit' => '%', 'description' => 'Persentase angkatan kerja laki-laki yang sedang mencari pekerjaan.'],
                ['id' => 29, 'category_id' => 34, 'bps_var_id' => 34, 'bps_vervar_id' => 2, 'bps_turvar_id' => null, 'name' => 'Tingkat Pengangguran Terbuka - Perempuan', 'unit' => '%', 'description' => 'Persentase angkatan kerja perempuan yang sedang mencari pekerjaan.'],
                ['id' => 44, 'category_id' => 52, 'bps_var_id' => 52, 'bps_vervar_id' => 1, 'bps_turvar_id' => null, 'name' => 'PDRB ADHK - Sektor Pertanian', 'unit' => 'Miliar Rp', 'description' => 'PDRB sektor pertanian, kehutanan, dan perikanan Kabupaten Barru.'],
                ['id' => 103, 'category_id' => 52, 'bps_var_id' => 52, 'bps_vervar_id' => 2, 'bps_turvar_id' => null, 'name' => 'PDRB ADHK - Sektor Industri', 'unit' => 'Miliar Rp', 'description' => 'PDRB sektor industri pengolahan Kabupaten Barru.']
            ],
            'values' => [
                // Kemiskinan Kota (id: 1)
                ['indicator_id' => 1, 'year' => 2020, 'value' => 8.50],
                ['indicator_id' => 1, 'year' => 2021, 'value' => 8.92],
                ['indicator_id' => 1, 'year' => 2022, 'value' => 8.41],
                ['indicator_id' => 1, 'year' => 2023, 'value' => 8.20],
                ['indicator_id' => 1, 'year' => 2024, 'value' => 7.85],
                ['indicator_id' => 1, 'year' => 2025, 'value' => 7.50],
                // Kemiskinan Desa (id: 4)
                ['indicator_id' => 4, 'year' => 2020, 'value' => 10.20],
                ['indicator_id' => 4, 'year' => 2021, 'value' => 10.65],
                ['indicator_id' => 4, 'year' => 2022, 'value' => 9.80],
                ['indicator_id' => 4, 'year' => 2023, 'value' => 9.45],
                ['indicator_id' => 4, 'year' => 2024, 'value' => 9.10],
                ['indicator_id' => 4, 'year' => 2025, 'value' => 8.75],
                // Pengangguran Laki-laki (id: 24)
                ['indicator_id' => 24, 'year' => 2020, 'value' => 5.20],
                ['indicator_id' => 24, 'year' => 2021, 'value' => 5.75],
                ['indicator_id' => 24, 'year' => 2022, 'value' => 5.12],
                ['indicator_id' => 24, 'year' => 2023, 'value' => 4.80],
                ['indicator_id' => 24, 'year' => 2024, 'value' => 4.35],
                ['indicator_id' => 24, 'year' => 2025, 'value' => 4.05],
                // Pengangguran Perempuan (id: 29)
                ['indicator_id' => 29, 'year' => 2020, 'value' => 6.10],
                ['indicator_id' => 29, 'year' => 2021, 'value' => 6.68],
                ['indicator_id' => 29, 'year' => 2022, 'value' => 5.90],
                ['indicator_id' => 29, 'year' => 2023, 'value' => 5.48],
                ['indicator_id' => 29, 'year' => 2024, 'value' => 5.15],
                ['indicator_id' => 29, 'year' => 2025, 'value' => 4.80],
                // PDRB Pertanian (id: 44)
                ['indicator_id' => 44, 'year' => 2020, 'value' => 1540.20],
                ['indicator_id' => 44, 'year' => 2021, 'value' => 1582.40],
                ['indicator_id' => 44, 'year' => 2022, 'value' => 1630.50],
                ['indicator_id' => 44, 'year' => 2023, 'value' => 1689.80],
                ['indicator_id' => 44, 'year' => 2024, 'value' => 1742.30],
                ['indicator_id' => 44, 'year' => 2025, 'value' => 1810.00],
                // PDRB Industri (id: 103)
                ['indicator_id' => 103, 'year' => 2020, 'value' => 820.50],
                ['indicator_id' => 103, 'year' => 2021, 'value' => 842.10],
                ['indicator_id' => 103, 'year' => 2022, 'value' => 891.40],
                ['indicator_id' => 103, 'year' => 2023, 'value' => 940.20],
                ['indicator_id' => 103, 'year' => 2024, 'value' => 992.80],
                ['indicator_id' => 103, 'year' => 2025, 'value' => 1050.50]
            ],
            'publications' => [],
            'indicator_publication' => []
        ];
        file_put_contents($bpsFile, json_encode($initialBps, JSON_PRETTY_PRINT));
    }

    $pstFile = $dataDir . '/pst_data.json';
    if (!file_exists($pstFile)) {
        // Seed default PST service cards
        $initialPst = [
            [
                'id' => 1,
                'title' => 'Website Resmi BPS Kabupaten Barru',
                'url' => 'https://barrukab.bps.go.id',
                'description' => 'Akses rilis berita resmi, publikasi gratis terbaru, dan portal data statistik sektoral Kabupaten Barru.',
                'logo' => 'https://i.imgur.com/gAY8c2j.png',
                'theme_class' => 'bg-mariner-500 text-white'
            ],
            [
                'id' => 2,
                'title' => 'Aplikasi SILASIK (Sistem Layanan Statistik)',
                'url' => 'https://barrukab.bps.go.id/silasik',
                'description' => 'Aplikasi inovasi layanan konsultasi statistik terpadu online secara interaktif cepat untuk pengguna data.',
                'logo' => 'https://i.imgur.com/gAY8c2j.png',
                'theme_class' => 'bg-mariner-200'
            ],
            [
                'id' => 3,
                'title' => 'Rekomendasi Statistik (Romantik BPS)',
                'url' => 'https://romantik.bps.go.id',
                'description' => 'Portal permohonan rekomendasi kegiatan statistik sektoral bagi instansi pemerintah/lembaga.',
                'logo' => 'https://i.imgur.com/gAY8c2j.png',
                'theme_class' => 'bg-malachite-800 text-white'
            ]
        ];
        file_put_contents($pstFile, json_encode($initialPst, JSON_PRETTY_PRINT));
    }
}

// -------------------------------------------------------------
// UNIFIED DATA SERVICE (MySQL vs JSON Fallback Wrapper)
// -------------------------------------------------------------

function get_pst_services() {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        return $pdo->query("SELECT * FROM integrated_p_s_t_services ORDER BY created_at DESC")->fetchAll();
    }
    // Fallback JSON
    $pstFile = __DIR__ . '/data/pst_data.json';
    if (file_exists($pstFile)) {
        return json_decode(file_get_contents($pstFile), true);
    }
    return [];
}

function save_pst_service($id, $title, $url, $description, $logo, $theme_class) {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        if ($id) {
            $stmt = $pdo->prepare("
                UPDATE integrated_p_s_t_services 
                SET title = :title, url = :url, description = :description, logo = COALESCE(:logo, logo), theme_class = :theme_class 
                WHERE id = :id
            ");
            $stmt->execute([
                ':title' => $title,
                ':url' => $url,
                ':description' => $description,
                ':logo' => $logo,
                ':theme_class' => $theme_class,
                ':id' => $id
            ]);
            $stmt_fresh = $pdo->prepare("SELECT * FROM integrated_p_s_t_services WHERE id = ?");
            $stmt_fresh->execute([$id]);
            return $stmt_fresh->fetch();
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO integrated_p_s_t_services (title, url, description, logo, theme_class)
                VALUES (:title, :url, :description, :logo, :theme_class)
            ");
            $stmt->execute([
                ':title' => $title,
                ':url' => $url,
                ':description' => $description,
                ':logo' => $logo,
                ':theme_class' => $theme_class
            ]);
            $newId = $pdo->lastInsertId();
            $stmt_fresh = $pdo->prepare("SELECT * FROM integrated_p_s_t_services WHERE id = ?");
            $stmt_fresh->execute([$newId]);
            return $stmt_fresh->fetch();
        }
    }

    // Fallback JSON
    $pstFile = __DIR__ . '/data/pst_data.json';
    $pst = file_exists($pstFile) ? json_decode(file_get_contents($pstFile), true) : [];

    if ($id) {
        // Edit
        foreach ($pst as &$item) {
            if ((int)$item['id'] === (int)$id) {
                $item['title'] = $title;
                $item['url'] = $url;
                $item['description'] = $description;
                if ($logo) $item['logo'] = $logo;
                $item['theme_class'] = $theme_class;
                $updated = $item;
                break;
            }
        }
        unset($item);
    } else {
        // Add
        $maxId = 0;
        foreach ($pst as $item) {
            if ($item['id'] > $maxId) $maxId = $item['id'];
        }
        $updated = [
            'id' => $maxId + 1,
            'title' => $title,
            'url' => $url,
            'description' => $description,
            'logo' => $logo ?: 'https://i.imgur.com/gAY8c2j.png',
            'theme_class' => $theme_class
        ];
        array_unshift($pst, $updated);
    }

    file_put_contents($pstFile, json_encode($pst, JSON_PRETTY_PRINT));
    return $updated;
}

function delete_pst_service($id) {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        // Delete logo file first
        $stmt_logo = $pdo->prepare("SELECT logo FROM integrated_p_s_t_services WHERE id = ?");
        $stmt_logo->execute([$id]);
        $logo = $stmt_logo->fetchColumn();

        if ($logo && strpos($logo, 'api/uploads/logos/') !== false) {
            $logoPath = dirname(__DIR__) . '/' . $logo;
            if (file_exists($logoPath)) unlink($logoPath);
        }

        $stmt = $pdo->prepare("DELETE FROM integrated_p_s_t_services WHERE id = ?");
        $stmt->execute([$id]);
        return true;
    }

    // Fallback JSON
    $pstFile = __DIR__ . '/data/pst_data.json';
    if (file_exists($pstFile)) {
        $pst = json_decode(file_get_contents($pstFile), true);
        
        // Remove logo file
        foreach ($pst as $item) {
            if ((int)$item['id'] === (int)$id) {
                $logo = $item['logo'] ?? '';
                if ($logo && strpos($logo, 'api/uploads/logos/') !== false) {
                    $logoPath = dirname(__DIR__) . '/' . $logo;
                    if (file_exists($logoPath)) unlink($logoPath);
                }
                break;
            }
        }

        $pstFiltered = array_filter($pst, fn($item) => (int)$item['id'] !== (int)$id);
        file_put_contents($pstFile, json_encode(array_values($pstFiltered), JSON_PRETTY_PRINT));
    }
    return true;
}

function get_dashboard_options() {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        return $pdo->query("SELECT bps_var_id as id, bps_var_id, name FROM data_tables ORDER BY name ASC")->fetchAll();
    }
    // Fallback JSON
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $data = json_decode(file_get_contents($bpsFile), true);
        return array_map(fn($t) => ['id' => $t['bps_var_id'], 'bps_var_id' => $t['bps_var_id'], 'name' => $t['name']], $data['data_tables'] ?? []);
    }
    return [];
}

function get_dashboard_data_tables() {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        $tables = $pdo->query("SELECT bps_var_id as id, bps_var_id, name FROM data_tables ORDER BY name ASC")->fetchAll();
        $stmt_ind = $pdo->prepare("SELECT id, bps_var_id, name, unit FROM indicators WHERE bps_var_id = :var_id ORDER BY name ASC");
        foreach ($tables as &$table) {
            $stmt_ind->execute([':var_id' => $table['bps_var_id']]);
            $table['indicators'] = $stmt_ind->fetchAll();
        }
        return $tables;
    }

    // Fallback JSON
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $data = json_decode(file_get_contents($bpsFile), true);
        $tables = array_map(fn($t) => ['id' => $t['bps_var_id'], 'bps_var_id' => $t['bps_var_id'], 'name' => $t['name'], 'indicators' => []], $data['data_tables'] ?? []);
        
        foreach ($tables as &$table) {
            $table['indicators'] = array_values(array_filter($data['indicators'] ?? [], fn($i) => (int)$i['bps_var_id'] === (int)$table['bps_var_id']));
        }
        return $tables;
    }
    return [];
}

function get_dashboard_snapshots() {
    $pdo = get_db_connection_safe();
    $foundIds = [];

    if ($pdo) {
        // 1. Try to fetch custom settings from settings table
        try {
            $stmt = $pdo->prepare("SELECT value FROM settings WHERE `key` = 'featured_snapshots'");
            $stmt->execute();
            $customVal = $stmt->fetchColumn();
            if ($customVal) {
                $foundIds = array_filter(array_map('intval', explode(',', $customVal)));
            }
        } catch (Exception $e) {
            // Settings table query failed or not created yet
        }

        // 2. If no custom settings, query default: newly released data (highest year, last synced, newest indicator)
        if (empty($foundIds)) {
            try {
                $foundIds = $pdo->query("
                    SELECT i.id 
                    FROM indicators i
                    JOIN indicator_values iv ON i.id = iv.indicator_id
                    GROUP BY i.id
                    ORDER BY MAX(iv.year) DESC, MAX(iv.last_synced_at) DESC, i.id DESC
                    LIMIT 6
                ")->fetchAll(PDO::FETCH_COLUMN);
            } catch (Exception $e) {
                // Fallback to simple limit if joining fails
                $foundIds = $pdo->query("SELECT id FROM indicators LIMIT 6")->fetchAll(PDO::FETCH_COLUMN);
            }
        }
    } else {
        // Fallback JSON mode
        $bpsFile = __DIR__ . '/data/bps_data.json';
        $settingsFile = __DIR__ . '/data/settings_snapshots.json';
        
        if (file_exists($settingsFile)) {
            $customVal = file_get_contents($settingsFile);
            $foundIds = array_filter(array_map('intval', explode(',', $customVal)));
        }

        if (empty($foundIds) && file_exists($bpsFile)) {
            $data = json_decode(file_get_contents($bpsFile), true);
            $allInds = $data['indicators'] ?? [];
            // Sort by ID descending as default newest released
            usort($allInds, fn($a, $b) => $b['id'] <=> $a['id']);
            $foundIds = array_map(fn($i) => $i['id'], array_slice($allInds, 0, 6));
        }
    }

    if (empty($foundIds)) return [];

    $snapshots = [];
    if ($pdo) {
        $stmt_latest = $pdo->prepare("SELECT year, value FROM indicator_values WHERE indicator_id = :ind_id ORDER BY year DESC LIMIT 1");
        $stmt_prev = $pdo->prepare("SELECT year, value FROM indicator_values WHERE indicator_id = :ind_id AND year < :year ORDER BY year DESC LIMIT 1");
        $stmt_meta = $pdo->prepare("SELECT id, name, unit FROM indicators WHERE id = :ind_id");

        foreach ($foundIds as $indId) {
            $stmt_meta->execute([':ind_id' => $indId]);
            $meta = $stmt_meta->fetch();
            if (!$meta) continue;

            $stmt_latest->execute([':ind_id' => $indId]);
            $latest = $stmt_latest->fetch();

            $latestYear = null; $latestVal = null; $deltaValue = null; $direction = null;

            if ($latest) {
                $latestYear = (int)$latest['year'];
                $latestVal = (float)$latest['value'];

                $stmt_prev->execute([':ind_id' => $indId, ':year' => $latestYear]);
                $prev = $stmt_prev->fetch();

                if ($prev) {
                    $delta = $latestVal - (float)$prev['value'];
                    $deltaValue = round($delta, 2);
                    $direction = $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'flat');
                }
            }

            $snapshots[] = [
                'indicatorId' => (int)$meta['id'],
                'title' => $meta['name'],
                'unit' => $meta['unit'],
                'latestYear' => $latestYear,
                'latestValue' => $latestVal,
                'delta' => $deltaValue,
                'direction' => $direction
            ];
        }
    } else {
        // Fallback JSON Snapshot Calculation
        $bpsFile = __DIR__ . '/data/bps_data.json';
        $data = json_decode(file_get_contents($bpsFile), true);
        
        foreach ($foundIds as $indId) {
            $meta = null;
            foreach ($data['indicators'] as $i) {
                if ((int)$i['id'] === (int)$indId) { $meta = $i; break; }
            }
            if (!$meta) continue;

            $vals = array_filter($data['values'], fn($v) => (int)$v['indicator_id'] === (int)$indId);
            usort($vals, fn($a, $b) => $b['year'] <=> $a['year']); // Year DESC

            $latestYear = null; $latestVal = null; $deltaValue = null; $direction = null;

            if (!empty($vals)) {
                $latest = reset($vals);
                $latestYear = (int)$latest['year'];
                $latestVal = (float)$latest['value'];

                $prev = null;
                foreach ($vals as $v) {
                    if ($v['year'] < $latestYear) { $prev = $v; break; }
                }

                if ($prev) {
                    $delta = $latestVal - (float)$prev['value'];
                    $deltaValue = round($delta, 2);
                    $direction = $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'flat');
                }
            }

            $snapshots[] = [
                'indicatorId' => (int)$meta['id'],
                'title' => $meta['name'],
                'unit' => $meta['unit'],
                'latestYear' => $latestYear,
                'latestValue' => $latestVal,
                'delta' => $deltaValue,
                'direction' => $direction
            ];
        }
    }

    return $snapshots;
}

function get_dashboard_series($indicatorIds, $startYear, $endYear) {
    $pdo = get_db_connection_safe();

    if ($pdo) {
        $placeholders = implode(',', array_fill(0, count($indicatorIds), '?'));
        
        if (!$startYear || !$endYear) {
            $stmt_min = $pdo->prepare("SELECT MIN(year) FROM indicator_values WHERE indicator_id IN ($placeholders)");
            $stmt_min->execute($indicatorIds);
            $minYear = (int)$stmt_min->fetchColumn();

            $stmt_max = $pdo->prepare("SELECT MAX(year) FROM indicator_values WHERE indicator_id IN ($placeholders)");
            $stmt_max->execute($indicatorIds);
            $maxYear = (int)$stmt_max->fetchColumn();

            $startYear = $startYear ?: ($minYear ?: date('Y') - 5);
            $endYear   = $endYear   ?: ($maxYear ?: date('Y'));
        }

        if ($startYear > $endYear) {
            $temp = $startYear; $startYear = $endYear; $endYear = $temp;
        }

        $years = range($startYear, $endYear);

        $stmt_vals = $pdo->prepare("
            SELECT indicator_id, year, value 
            FROM indicator_values 
            WHERE indicator_id IN ($placeholders) AND year BETWEEN ? AND ?
            ORDER BY year ASC
        ");
        $stmt_vals->execute(array_merge($indicatorIds, [$startYear, $endYear]));
        $valuesRaw = $stmt_vals->fetchAll();

        $valuesGrouped = [];
        foreach ($valuesRaw as $val) {
            $valuesGrouped[$val['indicator_id']][$val['year']] = (float)$val['value'];
        }

        $stmt_meta = $pdo->prepare("SELECT id, name, unit, description FROM indicators WHERE id = ?");
        $stmt_pubs = $pdo->prepare("
            SELECT p.title, p.link 
            FROM publications p
            JOIN indicator_publication ip ON p.id = ip.publication_id
            WHERE ip.indicator_id = ?
        ");

        $datasets = [];
        foreach ($indicatorIds as $id) {
            $stmt_meta->execute([$id]);
            $indicator = $stmt_meta->fetch();
            if (!$indicator) continue;

            $data = [];
            foreach ($years as $y) {
                $data[] = isset($valuesGrouped[$id][$y]) ? $valuesGrouped[$id][$y] : null;
            }

            $stmt_pubs->execute([$id]);
            $publications = $stmt_pubs->fetchAll();

            $datasets[] = [
                'id'          => (int)$indicator['id'],
                'label'       => $indicator['name'],
                'unit'        => $indicator['unit'],
                'description' => $indicator['description'],
                'data'        => $data,
                'publications' => $publications
            ];
        }

        return [
            'labels' => $years,
            'datasets' => $datasets
        ];
    }

    // Fallback JSON
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $data = json_decode(file_get_contents($bpsFile), true);
        
        if (!$startYear || !$endYear) {
            $yearsPresent = array_map(fn($v) => (int)$v['year'], array_filter($data['values'], fn($v) => in_array((int)$v['indicator_id'], $indicatorIds)));
            $minYear = !empty($yearsPresent) ? min($yearsPresent) : date('Y') - 5;
            $maxYear = !empty($yearsPresent) ? max($yearsPresent) : date('Y');
            
            $startYear = $startYear ?: $minYear;
            $endYear = $endYear ?: $maxYear;
        }

        if ($startYear > $endYear) {
            $temp = $startYear; $startYear = $endYear; $endYear = $temp;
        }

        $years = range($startYear, $endYear);

        $valuesGrouped = [];
        foreach ($data['values'] as $v) {
            if (in_array((int)$v['indicator_id'], $indicatorIds) && (int)$v['year'] >= $startYear && (int)$v['year'] <= $endYear) {
                $valuesGrouped[(int)$v['indicator_id']][(int)$v['year']] = (float)$v['value'];
            }
        }

        $datasets = [];
        foreach ($indicatorIds as $id) {
            $indicator = null;
            foreach ($data['indicators'] as $ind) {
                if ((int)$ind['id'] === (int)$id) { $indicator = $ind; break; }
            }
            if (!$indicator) continue;

            $plotData = [];
            foreach ($years as $y) {
                $plotData[] = isset($valuesGrouped[$id][$y]) ? $valuesGrouped[$id][$y] : null;
            }

            // Fallback empty publications for JSON mock mode
            $datasets[] = [
                'id'          => (int)$indicator['id'],
                'label'       => $indicator['name'],
                'unit'        => $indicator['unit'],
                'description' => $indicator['description'] ?? '',
                'data'        => $plotData,
                'publications' => []
            ];
        }

        return [
            'labels' => $years,
            'datasets' => $datasets
        ];
    }
    
    return ['labels' => [], 'datasets' => []];
}

function get_dashboard_widgets() {
    $pdo = get_db_connection_safe();
    $widgetVarIds = [81, 34, 52];

    if ($pdo) {
        $placeholders = implode(',', array_fill(0, count($widgetVarIds), '?'));
        $stmt = $pdo->prepare("SELECT id, bps_var_id, name, unit, description FROM indicators WHERE bps_var_id IN ($placeholders)");
        $stmt->execute($widgetVarIds);
        $indicators = $stmt->fetchAll();

        $stmt_latest = $pdo->prepare("SELECT year, value FROM indicator_values WHERE indicator_id = ? ORDER BY year DESC LIMIT 1");
        foreach ($indicators as &$ind) {
            $stmt_latest->execute([$ind['id']]);
            $latest = $stmt_latest->fetch();
            $ind['latest_value'] = $latest ? [
                'year' => (int)$latest['year'],
                'value' => (float)$latest['value']
            ] : null;
        }
        return $indicators;
    }

    // Fallback JSON
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $data = json_decode(file_get_contents($bpsFile), true);
        $indicators = array_values(array_filter($data['indicators'] ?? [], fn($i) => in_array((int)$i['bps_var_id'], $widgetVarIds)));

        foreach ($indicators as &$ind) {
            $vals = array_filter($data['values'] ?? [], fn($v) => (int)$v['indicator_id'] === (int)$ind['id']);
            usort($vals, fn($a, $b) => $b['year'] <=> $a['year']);
            
            $ind['latest_value'] = !empty($vals) ? [
                'year' => (int)$vals[0]['year'],
                'value' => (float)$vals[0]['value']
            ] : null;
        }
        return $indicators;
    }
    return [];
}

/**
 * Cleanup duplicate indicators and merge values in MySQL
 */
function clean_duplicate_indicators($pdo) {
    try {
        // 1. Delete duplicate values that would cause key collisions during update
        $pdo->exec("
            DELETE iv1 FROM indicator_values iv1
            JOIN indicator_values iv2 ON iv1.region_id = iv2.region_id AND iv1.year = iv2.year
            JOIN indicators i1 ON iv1.indicator_id = i1.id
            JOIN indicators i2 ON iv2.indicator_id = i2.id
            WHERE i2.id < i1.id
              AND i1.bps_var_id = i2.bps_var_id
              AND (i1.bps_vervar_id = i2.bps_vervar_id OR (i1.bps_vervar_id IS NULL AND i2.bps_vervar_id IS NULL))
              AND (i1.bps_turvar_id = i2.bps_turvar_id OR (i1.bps_turvar_id IS NULL AND i2.bps_turvar_id IS NULL))
        ");

        // 2. Update remaining values to point to the lowest matched indicator ID
        $pdo->exec("
            UPDATE indicator_values iv
            JOIN indicators i1 ON iv.indicator_id = i1.id
            JOIN indicators i2 ON i1.bps_var_id = i2.bps_var_id 
              AND (i1.bps_vervar_id = i2.bps_vervar_id OR (i1.bps_vervar_id IS NULL AND i2.bps_vervar_id IS NULL))
              AND (i1.bps_turvar_id = i2.bps_turvar_id OR (i1.bps_turvar_id IS NULL AND i2.bps_turvar_id IS NULL))
            SET iv.indicator_id = i2.id
            WHERE i2.id < i1.id
        ");

        // 3. Delete duplicate indicator records
        $pdo->exec("
            DELETE i1 FROM indicators i1
            JOIN indicators i2 ON i1.bps_var_id = i2.bps_var_id 
              AND (i1.bps_vervar_id = i2.bps_vervar_id OR (i1.bps_vervar_id IS NULL AND i2.bps_vervar_id IS NULL))
              AND (i1.bps_turvar_id = i2.bps_turvar_id OR (i1.bps_turvar_id IS NULL AND i2.bps_turvar_id IS NULL))
            WHERE i1.id > i2.id
        ");
    } catch (Exception $e) {
        // Fail silently
    }
}

/**
 * Cleanup duplicate indicators and merge values in JSON file
 */
function clean_json_duplicates() {
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (!file_exists($bpsFile)) return;
    $data = json_decode(file_get_contents($bpsFile), true);
    if (empty($data) || empty($data['indicators'])) return;

    $uniqueInds = [];
    $idMapping = [];

    foreach ($data['indicators'] as $ind) {
        $key = $ind['bps_var_id'] . '_' . ($ind['bps_vervar_id'] ?? 'null') . '_' . ($ind['bps_turvar_id'] ?? 'null');
        if (!isset($uniqueInds[$key])) {
            $uniqueInds[$key] = $ind;
            $idMapping[$ind['id']] = $ind['id'];
        } else {
            $idMapping[$ind['id']] = $uniqueInds[$key]['id'];
        }
    }

    $data['indicators'] = array_values($uniqueInds);

    if (!empty($data['values'])) {
        foreach ($data['values'] as &$val) {
            $oldId = $val['indicator_id'];
            if (isset($idMapping[$oldId])) {
                $val['indicator_id'] = $idMapping[$oldId];
            }
        }
        unset($val);

        $uniqueVals = [];
        foreach ($data['values'] as $val) {
            $valKey = $val['indicator_id'] . '_' . $val['year'];
            if (!isset($uniqueVals[$valKey])) {
                $uniqueVals[$valKey] = $val;
            }
        }
        $data['values'] = array_values($uniqueVals);
    }

    file_put_contents($bpsFile, json_encode($data, JSON_PRETTY_PRINT));
}
?>
