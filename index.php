<?php
// index.php

// Cek apakah file build React dist/index.html sudah ada
if (file_exists(__DIR__ . '/dist/index.html')) {
    // Baca dan sajikan file build React
    readfile(__DIR__ . '/dist/index.html');
} else {
    // Tampilkan petunjuk setup jika belum melakukan build
    header("Content-Type: text/html; charset=UTF-8");
    ?>
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Setup Barru Bercerita 2</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f1f5f9;
                color: #0f172a;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
            }
            .card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                padding: 2.5rem;
                max-width: 500px;
                width: 100%;
                box-sizing: border-box;
            }
            h1 {
                font-size: 1.5rem;
                margin-top: 0;
                color: #007aff;
            }
            p {
                line-height: 1.6;
                color: #334155;
            }
            code {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                padding: 0.2rem 0.4rem;
                font-family: monospace;
                color: #0f172a;
            }
            pre {
                background-color: #0f172a;
                color: #f8fafc;
                padding: 1rem;
                border-radius: 8px;
                overflow-x: auto;
                margin: 1rem 0;
            }
            .btn {
                display: inline-block;
                background-color: #007aff;
                color: white;
                text-decoration: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                margin-top: 1rem;
                text-align: center;
            }
            .btn:hover {
                background-color: #0066d6;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Frontend React Belum Dibangun (Built)</h1>
            <p>PHP Backend API Anda sudah siap dan berfungsi di folder <code>api/</code>.</p>
            <p>Langkah selanjutnya untuk menjalankan frontend React:</p>
            <ol>
                <li>Buka Terminal pada direktori project ini.</li>
                <li>Jalankan perintah berikut untuk mengunduh package dependencies dan membangun project:</li>
            </ol>
            <pre>npm install && npm run build</pre>
            <p>Setelah proses build selesai, halaman ini akan otomatis memuat antarmuka React.</p>
            <a href="api/pst.php" class="btn" target="_blank">Uji Endpoint API (PST)</a>
        </div>
    </body>
    </html>
    <?php
}
?>
