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

    $db_name = DB_NAME;
    $envHost = get_env('DB_HOST');
    $envUser = get_env('DB_USERNAME');
    $envPass = get_env('DB_PASSWORD');
    $envPort = get_env('DB_PORT', '3306');

    $configs = [];

    // Prioritaskan environment variables jika dikonfigurasi di cPanel / .env
    if ($envHost || $envUser !== null) {
        $configs[] = [
            'host' => $envHost ?: 'localhost',
            'port' => $envPort ?: '3306',
            'user' => $envUser ?: 'root',
            'pass' => $envPass ?? ''
        ];
    }

    // Default fallback configurations (MAMP/XAMPP/Localhost)
    $configs = array_merge($configs, [
        ['host' => '127.0.0.1', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
        ['host' => 'localhost', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
        ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => ''],
        ['host' => 'localhost', 'port' => '3306', 'user' => 'root', 'pass' => ''],
        ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => 'root'],
        ['host' => 'localhost', 'port' => '3306', 'user' => 'root', 'pass' => 'root']
    ]);

    foreach ($configs as $config) {
        try {
            $pdo = null;
            // 1. Coba konek langsung ke database yang sudah dibuat (Standar cPanel)
            try {
                $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$db_name};charset=utf8mb4";
                $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 2
                ]);
            } catch (PDOException $e) {
                // 2. Jika DB belum ada (lingkungan lokal), konek tanpa dbname lalu CREATE DATABASE
                $dsn = "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4";
                $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 2
                ]);
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo->exec("USE `$db_name`");
            }

            if ($pdo) {
                // Buat tabel jika belum ada
                create_tables_if_not_exist($pdo);
                seed_mysql_from_json_if_empty($pdo);
                $pdo_conn = $pdo;
                return $pdo;
            }
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

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            role VARCHAR(20) DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Seed / update admin user in DB
    $defaultUser = 'admin_barru';
    $defaultPassHash = password_hash('iyatawwa10', PASSWORD_BCRYPT);

    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($userCount == 0) {
        $stmt = $pdo->prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$defaultUser, $defaultPassHash, 'Administrator Barru', 'admin']);
    } else {
        // Update password if admin_barru already exists
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
        $stmt->execute([$defaultPassHash, $defaultUser]);
    }

    // Seed regions
    $count = $pdo->query("SELECT COUNT(*) FROM regions")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("INSERT INTO regions (id, code, name) VALUES (1, '7310', 'Kabupaten Barru')");
    }

    // Migration: add is_hidden column to integrated_p_s_t_services if not exists
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM integrated_p_s_t_services LIKE 'is_hidden'")->fetchAll();
        if (empty($cols)) {
            $pdo->exec("ALTER TABLE integrated_p_s_t_services ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER theme_class");
        }
    } catch (Exception $e) { /* ignore */ }

    // Migration: add officer_id column to users table if not exists
    try {
        $colsUser = $pdo->query("SHOW COLUMNS FROM users LIKE 'officer_id'")->fetchAll();
        if (empty($colsUser)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN officer_id INT NULL AFTER role");
        }
    } catch (Exception $e) { /* ignore */ }

    // Migration: add pool_type column to pst_officers table if not exists (K = PST, P = Pengaduan, R = Rekomendasi)
    try {
        $colsPool = $pdo->query("SHOW COLUMNS FROM pst_officers LIKE 'pool_type'")->fetchAll();
        if (empty($colsPool)) {
            $pdo->exec("ALTER TABLE pst_officers ADD COLUMN pool_type VARCHAR(10) NOT NULL DEFAULT 'K' AFTER position");
        }
        // Ensure default seeded officers have correct team pool_type
        $pdo->exec("UPDATE pst_officers SET pool_type = 'P' WHERE id IN (10, 11, 12)");
        $pdo->exec("UPDATE pst_officers SET pool_type = 'R' WHERE id IN (13, 14, 15)");
        $pdo->exec("UPDATE pst_officers SET pool_type = 'K' WHERE id BETWEEN 1 AND 9");
    } catch (Exception $e) { /* ignore */ }

    // PST Officers table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pst_officers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            nip VARCHAR(50) NULL,
            position VARCHAR(150) NULL,
            pool_type VARCHAR(10) NOT NULL DEFAULT 'K',
            phone VARCHAR(30) NULL,
            avatar VARCHAR(255) NULL,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // PST Schedules table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pst_schedules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            k1_officer_id INT NULL,
            k2_officer_id INT NULL,
            p_officer_id INT NULL,
            r_officer_id INT NULL,
            note VARCHAR(255) NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // PST Presensi / Attendance Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pst_presensi (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            officer_id INT NOT NULL,
            role_code VARCHAR(10) NOT NULL,
            check_in_time VARCHAR(10) NOT NULL,
            status VARCHAR(20) DEFAULT 'hadir',
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_officer_day_role (date, officer_id, role_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // PST Holidays / National Days Off Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pst_holidays (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            title VARCHAR(255) NOT NULL,
            type VARCHAR(50) DEFAULT 'national_holiday',
            description TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_holiday_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // PST Swap Requests Table (Shift Swap between officers)
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

    // Seed default national holidays for 2026 if empty
    $holidayCount = $pdo->query("SELECT COUNT(*) FROM pst_holidays")->fetchColumn();
    if ($holidayCount == 0) {
        $defaultHolidays = [
            ['2026-01-01', 'Tahun Baru 2026 Masehi', 'national_holiday'],
            ['2026-01-16', 'Isra Mikraj Nabi Muhammad SAW', 'national_holiday'],
            ['2026-02-17', 'Tahun Baru Imlek 2577 Kongzili', 'national_holiday'],
            ['2026-03-19', 'Hari Suci Nyepi (Tahun Baru Saka 1948)', 'national_holiday'],
            ['2026-03-20', 'Hari Raya Idul Fitri 1447 Hijriah', 'national_holiday'],
            ['2026-03-21', 'Hari Raya Idul Fitri 1447 Hijriah', 'national_holiday'],
            ['2026-04-03', 'Wafat Yesus Kristus', 'national_holiday'],
            ['2026-04-05', 'Hari Paskah (Kebangkitan Yesus Kristus)', 'national_holiday'],
            ['2026-05-01', 'Hari Buruh Internasional', 'national_holiday'],
            ['2026-05-14', 'Kenaikan Yesus Kristus', 'national_holiday'],
            ['2026-05-27', 'Hari Raya Idul Adha 1447 Hijriah', 'national_holiday'],
            ['2026-05-31', 'Hari Raya Waisak 2570 BE', 'national_holiday'],
            ['2026-06-01', 'Hari Lahir Pancasila', 'national_holiday'],
            ['2026-06-16', 'Tahun Baru Islam 1448 Hijriah', 'national_holiday'],
            ['2026-08-17', 'Hari Kemerdekaan Republik Indonesia', 'national_holiday'],
            ['2026-08-25', 'Maulid Nabi Muhammad SAW', 'national_holiday'],
            ['2026-12-25', 'Hari Raya Natal', 'national_holiday']
        ];
        $stmtH = $pdo->prepare("INSERT IGNORE INTO pst_holidays (date, title, type) VALUES (?, ?, ?)");
        foreach ($defaultHolidays as $h) {
            $stmtH->execute($h);
        }
    }

    // Seed default officers if empty
    $officerCount = $pdo->query("SELECT COUNT(*) FROM pst_officers")->fetchColumn();
    if ($officerCount == 0) {
        $defaultOfficers = [
            // Tim K (Konsultasi PST)
            ['Muhamad Feriyanto', '19950815 202012 1 001', 'Pranata Komputer / Tim IT', 'K', '081234567890'],
            ['Ahmad Ridwan, S.St', '19880410 201201 1 002', 'Statistisi Ahli Muda', 'K', '081234567891'],
            ['Nurul Hidayah, S.Si', '19920314 201502 2 003', 'Statistisi Pertama', 'K', '081234567892'],
            ['Andi Baso, S.Sos', '19850620 200903 1 004', 'Pengelola PST & Layanan', 'K', '081234567893'],
            ['Rahmawati, S.E.', '19901105 201402 2 005', 'Statistisi Ahli', 'K', '081234567894'],
            ['Muhammad Nur, A.Md', '19960712 201901 1 006', 'Asisten Statistisi', 'K', '081234567895'],
            ['Sri Wahyuni, S.Stat', '19940918 201802 2 007', 'Statistisi Pertama', 'K', '081234567896'],
            ['Hidayatullah, S.T.', '19910125 201601 1 008', 'Pranata Komputer Ahli', 'K', '081234567897'],
            ['Resky Aulia, S.Tr.Stat', '19970512 202102 2 009', 'Statistisi Ahli Pertama', 'K', '081234567898'],

            // Tim P (Pengaduan)
            ['Ir. Hj. St. Nurbaya', '19680315 199302 2 001', 'Penanggung Jawab Pengaduan', 'P', '081234567899'],
            ['Hasmawati, S.A.P.', '19830510 200801 2 002', 'Petugas Pengaduan & Aspirasi', 'P', '081234567800'],
            ['Bachtiar, S.H.', '19800720 200604 1 003', 'Petugas Layanan Hukum & Pengaduan', 'P', '081234567801'],

            // Tim R (Rekomendasi Statistik)
            ['Dr. Hardiansyah, S.Si., M.Si.', '19750918 199903 1 001', 'Koordinator Rekomendasi Kegiatan', 'R', '081234567802'],
            ['Fitriani, S.Stat.', '19931205 201602 2 002', 'Pemeriksa Rekomendasi Statistik', 'R', '081234567803'],
            ['Lukman Hakim, S.T.', '19890214 201301 1 003', 'Analisis & Rekomendasi Data', 'R', '081234567804']
        ];
        $stmtOff = $pdo->prepare("INSERT INTO pst_officers (name, nip, position, pool_type, phone) VALUES (?, ?, ?, ?, ?)");
        foreach ($defaultOfficers as $off) {
            $stmtOff->execute($off);
        }
    }

    // Seed officer user accounts if not created yet
    $allOff = $pdo->query("SELECT id, name FROM pst_officers")->fetchAll();
    $stmtCheckUser = $pdo->prepare("SELECT id FROM users WHERE officer_id = ? OR username = ?");
    $stmtInsUser = $pdo->prepare("INSERT INTO users (username, password, name, role, officer_id) VALUES (?, ?, ?, 'officer', ?)");
    $defaultPassHash = password_hash('iyatawwa10', PASSWORD_BCRYPT);

    foreach ($allOff as $o) {
        // Generate simple username e.g. "feriyanto", "ridwan", "nurul", "andibaso"
        $parts = explode(' ', strtolower(preg_replace('/[^a-zA-Z ]/', '', $o['name'])));
        $uname = $parts[0];
        if (strlen($uname) < 3 && isset($parts[1])) $uname = $parts[0] . $parts[1];

        $stmtCheckUser->execute([$o['id'], $uname]);
        if (!$stmtCheckUser->fetchColumn()) {
            $stmtInsUser->execute([$uname, $defaultPassHash, $o['name'], $o['id']]);
        }
    }
}

/**
 * Seed MySQL database from local bps_data.json if MySQL indicators table is empty
 */
function seed_mysql_from_json_if_empty($pdo) {
    if (!$pdo) return;
    try {
        $valCount = $pdo->query("SELECT COUNT(*) FROM indicator_values")->fetchColumn();
        if ($valCount > 100) return; // DB already contains complete historical data

        $bpsFile = __DIR__ . '/data/bps_data.json';
        if (!file_exists($bpsFile)) return;

        $json = json_decode(file_get_contents($bpsFile), true);
        if (empty($json)) return;

        $pdo->beginTransaction();

        // 1. Seed categories
        if (!empty($json['categories'])) {
            $stmtCat = $pdo->prepare("INSERT IGNORE INTO categories (id, name, description) VALUES (:id, :name, :description)");
            foreach ($json['categories'] as $cat) {
                $stmtCat->execute([
                    ':id' => $cat['id'],
                    ':name' => $cat['name'],
                    ':description' => $cat['description'] ?? null
                ]);
            }
        }

        // 2. Seed data_tables
        if (!empty($json['data_tables'])) {
            $stmtTbl = $pdo->prepare("INSERT IGNORE INTO data_tables (bps_var_id, name) VALUES (:bps_var_id, :name)");
            foreach ($json['data_tables'] as $tbl) {
                $stmtTbl->execute([
                    ':bps_var_id' => $tbl['bps_var_id'],
                    ':name' => $tbl['name']
                ]);
            }
        }

        // 3. Seed indicators
        if (!empty($json['indicators'])) {
            $stmtInd = $pdo->prepare("
                INSERT IGNORE INTO indicators (id, category_id, bps_var_id, bps_vervar_id, bps_turvar_id, name, description, unit) 
                VALUES (:id, :category_id, :bps_var_id, :bps_vervar_id, :bps_turvar_id, :name, :description, :unit)
            ");
            foreach ($json['indicators'] as $ind) {
                $stmtInd->execute([
                    ':id' => $ind['id'],
                    ':category_id' => $ind['category_id'] ?? 1,
                    ':bps_var_id' => $ind['bps_var_id'] ?? null,
                    ':bps_vervar_id' => $ind['bps_vervar_id'] ?? null,
                    ':bps_turvar_id' => $ind['bps_turvar_id'] ?? null,
                    ':name' => $ind['name'],
                    ':description' => $ind['description'] ?? null,
                    ':unit' => $ind['unit'] ?? null
                ]);
            }
        }

        // 4. Seed indicator_values
        if (!empty($json['values'])) {
            $stmtVal = $pdo->prepare("
                INSERT IGNORE INTO indicator_values (indicator_id, region_id, year, value) 
                VALUES (:indicator_id, 1, :year, :value)
            ");
            foreach ($json['values'] as $val) {
                $stmtVal->execute([
                    ':indicator_id' => $val['indicator_id'],
                    ':year' => $val['year'],
                    ':value' => $val['value']
                ]);
            }
        }

        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
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

    $usersFile = $dataDir . '/users.json';
    $defaultUsers = [
        [
            'id' => 1,
            'username' => 'admin_barru',
            'password' => password_hash('iyatawwa10', PASSWORD_BCRYPT),
            'name' => 'Administrator Barru',
            'role' => 'admin'
        ]
    ];
    file_put_contents($usersFile, json_encode($defaultUsers, JSON_PRETTY_PRINT));

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

function get_pst_services($include_hidden = false) {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        if ($include_hidden) {
            return $pdo->query("SELECT * FROM integrated_p_s_t_services ORDER BY created_at DESC")->fetchAll();
        }
        return $pdo->query("SELECT * FROM integrated_p_s_t_services WHERE is_hidden = 0 ORDER BY created_at DESC")->fetchAll();
    }
    // Fallback JSON
    $pstFile = __DIR__ . '/data/pst_data.json';
    if (file_exists($pstFile)) {
        $all = json_decode(file_get_contents($pstFile), true) ?? [];
        if ($include_hidden) return $all;
        return array_values(array_filter($all, fn($s) => empty($s['is_hidden'])));
    }
    return [];
}

function save_pst_service($id, $title, $url, $description, $logo, $theme_class, $is_hidden = null) {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        if ($id) {
            $hiddenClause = $is_hidden !== null ? ', is_hidden = :is_hidden' : '';
            $stmt = $pdo->prepare("
                UPDATE integrated_p_s_t_services 
                SET title = :title, url = :url, description = :description, logo = COALESCE(:logo, logo), theme_class = :theme_class{$hiddenClause}
                WHERE id = :id
            ");
            $params = [
                ':title' => $title,
                ':url' => $url,
                ':description' => $description,
                ':logo' => $logo,
                ':theme_class' => $theme_class,
                ':id' => $id
            ];
            if ($is_hidden !== null) $params[':is_hidden'] = (int)$is_hidden;
            $stmt->execute($params);
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
 * CRUD Functions for Dataset Indicators
 */
function get_all_indicators_for_crud() {
    $pdo = get_db_connection_safe();
    if ($pdo) {
        seed_mysql_from_json_if_empty($pdo);
        $stmt = $pdo->query("
            SELECT 
                i.id, 
                i.bps_var_id, 
                i.name, 
                i.unit, 
                i.description,
                i.updated_at as updated_at,
                dt.name as table_name,
                c.name as category_name,
                COUNT(iv.id) as value_count,
                MIN(iv.year) as min_year,
                MAX(iv.year) as max_year,
                MAX(iv.updated_at) as last_synced_at
            FROM indicators i
            LEFT JOIN data_tables dt ON i.bps_var_id = dt.bps_var_id
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN indicator_values iv ON i.id = iv.indicator_id
            GROUP BY i.id
            ORDER BY i.id DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // JSON Fallback
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $data = json_decode(file_get_contents($bpsFile), true);
        $tables = $data['data_tables'] ?? [];
        $categories = $data['categories'] ?? [];
        $indicators = $data['indicators'] ?? [];
        $values = $data['values'] ?? [];

        $result = [];
        foreach ($indicators as $ind) {
            $table = array_values(array_filter($tables, fn($t) => (int)($t['bps_var_id'] ?? 0) === (int)($ind['bps_var_id'] ?? 0)))[0] ?? null;
            $cat = array_values(array_filter($categories, fn($c) => (int)($c['id'] ?? 0) === (int)($ind['category_id'] ?? 0)))[0] ?? null;
            $indVals = array_values(array_filter($values, fn($v) => (int)$v['indicator_id'] === (int)$ind['id']));
            $years = array_map(fn($v) => (int)$v['year'], $indVals);

            $result[] = [
                'id' => (int)$ind['id'],
                'bps_var_id' => $ind['bps_var_id'] ?? null,
                'name' => $ind['name'],
                'unit' => $ind['unit'] ?? '',
                'description' => $ind['description'] ?? '',
                'table_name' => $table['name'] ?? 'Indikator Kategori',
                'category_name' => $cat['name'] ?? 'Umum',
                'value_count' => count($indVals),
                'min_year' => $years ? min($years) : null,
                'max_year' => $years ? max($years) : null
            ];
        }
        usort($result, fn($a, $b) => $b['id'] <=> $a['id']);
        return $result;
    }
    return [];
}

function save_indicator_item($data) {
    $pdo = get_db_connection_safe();
    $id = isset($data['id']) && !empty($data['id']) ? (int)$data['id'] : null;
    $name = trim($data['name'] ?? '');
    $unit = trim($data['unit'] ?? '');
    $description = trim($data['description'] ?? '');

    if (empty($name)) {
        throw new Exception('Nama indikator wajib diisi.');
    }

    if ($pdo) {
        if ($id) {
            $stmt = $pdo->prepare("UPDATE indicators SET name = :name, unit = :unit, description = :description WHERE id = :id");
            $stmt->execute([':name' => $name, ':unit' => $unit, ':description' => $description, ':id' => $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO indicators (category_id, bps_var_id, name, unit, description) VALUES (1, 81, :name, :unit, :description)");
            $stmt->execute([':name' => $name, ':unit' => $unit, ':description' => $description]);
        }
        return true;
    }

    // JSON Fallback
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $json = json_decode(file_get_contents($bpsFile), true);
        if ($id) {
            foreach ($json['indicators'] as &$ind) {
                if ((int)$ind['id'] === $id) {
                    $ind['name'] = $name;
                    $ind['unit'] = $unit;
                    $ind['description'] = $description;
                    break;
                }
            }
            unset($ind);
        } else {
            $maxId = 0;
            foreach ($json['indicators'] as $ind) {
                if ($ind['id'] > $maxId) $maxId = $ind['id'];
            }
            $json['indicators'][] = [
                'id' => $maxId + 1,
                'category_id' => 81,
                'bps_var_id' => 81,
                'name' => $name,
                'unit' => $unit,
                'description' => $description
            ];
        }
        file_put_contents($bpsFile, json_encode($json, JSON_PRETTY_PRINT));
        return true;
    }
    return false;
}

function delete_indicator_item($id) {
    $pdo = get_db_connection_safe();
    $id = (int)$id;
    if (!$id) return false;

    if ($pdo) {
        $pdo->prepare("DELETE FROM indicator_values WHERE indicator_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM indicators WHERE id = ?")->execute([$id]);
        return true;
    }

    // JSON Fallback
    $bpsFile = __DIR__ . '/data/bps_data.json';
    if (file_exists($bpsFile)) {
        $json = json_decode(file_get_contents($bpsFile), true);
        $json['indicators'] = array_values(array_filter($json['indicators'] ?? [], fn($i) => (int)$i['id'] !== $id));
        $json['values'] = array_values(array_filter($json['values'] ?? [], fn($v) => (int)$v['indicator_id'] !== $id));
        file_put_contents($bpsFile, json_encode($json, JSON_PRETTY_PRINT));
        return true;
    }
    return false;
}

/**
 * Cleanup duplicate indicators and merge values in MySQL
 */
function clean_duplicate_indicators($pdo) {
    if (!$pdo) return;
    try {
        // 1. Delete duplicate values that would cause key collisions during update
        $pdo->exec("
            DELETE iv1 FROM indicator_values iv1
            JOIN indicator_values iv2 ON iv1.region_id = iv2.region_id AND iv1.year = iv2.year
            JOIN indicators i1 ON iv1.indicator_id = i1.id
            JOIN indicators i2 ON iv2.indicator_id = i2.id
            WHERE i2.id < i1.id
              AND (
                (i1.bps_var_id IS NOT NULL AND i1.bps_var_id = i2.bps_var_id AND COALESCE(i1.bps_vervar_id, 0) = COALESCE(i2.bps_vervar_id, 0) AND COALESCE(i1.bps_turvar_id, 0) = COALESCE(i2.bps_turvar_id, 0))
                OR (i1.category_id = i2.category_id AND i1.name = i2.name)
              )
        ");

        // 2. Update remaining values to point to lowest indicator ID
        $pdo->exec("
            UPDATE indicator_values iv
            JOIN indicators i1 ON iv.indicator_id = i1.id
            JOIN indicators i2 ON (
                (i1.bps_var_id IS NOT NULL AND i1.bps_var_id = i2.bps_var_id AND COALESCE(i1.bps_vervar_id, 0) = COALESCE(i2.bps_vervar_id, 0) AND COALESCE(i1.bps_turvar_id, 0) = COALESCE(i2.bps_turvar_id, 0))
                OR (i1.category_id = i2.category_id AND i1.name = i2.name)
            )
            SET iv.indicator_id = i2.id
            WHERE i2.id < i1.id
        ");

        // 3. Delete duplicate indicator records
        $pdo->exec("
            DELETE i1 FROM indicators i1
            JOIN indicators i2 ON (
                (i1.bps_var_id IS NOT NULL AND i1.bps_var_id = i2.bps_var_id AND COALESCE(i1.bps_vervar_id, 0) = COALESCE(i2.bps_vervar_id, 0) AND COALESCE(i1.bps_turvar_id, 0) = COALESCE(i2.bps_turvar_id, 0))
                OR (i1.category_id = i2.category_id AND i1.name = i2.name)
            )
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
        $cleanName = trim(mb_strtolower($ind['name'] ?? ''));
        $key = ($ind['category_id'] ?? 0) . '_' . ($ind['bps_var_id'] ?? 'null') . '_' . ($ind['bps_vervar_id'] ?? 'null') . '_' . ($ind['bps_turvar_id'] ?? 'null') . '_' . $cleanName;

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
