<?php
// api/BpsClient.php

class BpsClient
{
    private string $apiKey;
    private string $domain;
    private string $baseUrl = 'https://webapi.bps.go.id/v1/api/list/';

    public function __construct(string $apiKey, string $domain = '7310')
    {
        $this->apiKey = $apiKey;
        $this->domain = $domain;
    }

    public function setDomain(string $domain): void
    {
        $this->domain = $domain;
    }

    /**
     * Send HTTP GET request via cURL
     */
    private function get(string $url, array $params = []): ?array
    {
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt_optimize_custom($ch);
        $output = curl_exec($ch);
        curl_close($ch);

        if ($output === false) {
            return null;
        }

        try {
            return json_decode($output, true);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function fetchPaged(string $model, ?string $domain = null): array
    {
        $domain = $domain ?: $this->domain;
        $page = 1;
        $all = [];

        while (true) {
            $json = $this->get($this->baseUrl, [
                'model' => $model,
                'domain' => $domain,
                'page' => $page,
                'key' => $this->apiKey,
            ]);

            if (!$json) {
                break;
            }

            $availability = $json['data-availability'] ?? 'unavailable';
            if ($availability !== 'available') {
                break;
            }

            $rows = $json['data'][1] ?? [];
            if (empty($rows)) {
                break;
            }

            foreach ($rows as $row) {
                $all[] = $row;
            }

            $page++;
            usleep(150 * 1000); // 150ms delay
        }

        return $all;
    }

    public function fetchSubjects(?string $domain = null): array
    {
        return $this->fetchPaged('subject', $domain);
    }

    public function fetchVars(?string $domain = null): array
    {
        return $this->fetchPaged('var', $domain);
    }

    public function fetchYears(?string $domain = null): array
    {
        return $this->fetchPaged('th', $domain);
    }

    private function buildDataVarUrl(string $domain, string $varId, string $thParam): string
    {
        $domain = urlencode($domain);
        $varId  = urlencode($varId);
        $th     = urlencode($thParam);
        $key    = urlencode($this->apiKey);

        return "https://webapi.bps.go.id/v1/api/list/model/data/domain/{$domain}/var/{$varId}/th/{$th}/key/{$key}/";
    }

    /**
     * Fetch time series records for a specific BPS variable ID in target year ranges
     */
    public function exploreVar(string $varId, int $startThId = 100, int $endThId = 125, ?string $domain = null): array
    {
        $domain = $domain ?: $this->domain;
        $results = [];

        // Loop in increments of 2 because BPS Web-API restricts the th parameter to at most 2 years
        for ($thStart = $startThId; $thStart <= $endThId; $thStart += 2) {
            $thEnd = min($endThId, $thStart + 1);
            $thParam = ($thStart === $thEnd) ? (string)$thStart : "{$thStart}:{$thEnd}";

            $url = $this->buildDataVarUrl($domain, $varId, $thParam);
            $json = $this->get($url);

            if (!$json) {
                continue;
            }

            $datacontent = $json['datacontent'] ?? null;
            if (empty($datacontent)) {
                continue;
            }

            $varMeta = $json['var'][0] ?? [];
            $varLabel = $varMeta['label'] ?? "Var {$varId}";
            $unit = $varMeta['unit'] ?? "";
            $subjectId = $varMeta['subj_id'] ?? $json['subject'][0]['val'] ?? 0;
            $definition = $varMeta['def'] ?? $varMeta['note'] ?? '';

            $vervars = $json['vervar'] ?? [['val' => 0, 'label' => null]];
            if (empty($vervars)) $vervars = [['val' => 0, 'label' => null]];

            $turvars = $json['turvar'] ?? [['val' => 0, 'label' => null]];
            if (empty($turvars)) $turvars = [['val' => 0, 'label' => null]];

            $tahuns = $json['tahun'] ?? [];
            $turtahuns = $json['turtahun'] ?? [['val' => 0, 'label' => null]];
            if (empty($turtahuns)) $turtahuns = [['val' => 0, 'label' => null]];

            $labelvervar = $json['labelvervar'] ?? null;

            foreach ($vervars as $v) {
                foreach ($turvars as $t) {
                    foreach ($tahuns as $y) {
                        foreach ($turtahuns as $ty) {
                            $vVal = $v['val'] ?? $v['id'] ?? 0;
                            $tVal = $t['val'] ?? $t['id'] ?? 0;
                            $yVal = $y['val'] ?? $y['id'] ?? 0;
                            $tyVal = $ty['val'] ?? $ty['id'] ?? 0;

                            $compoundKey = $vVal . $varId . $tVal . $yVal . $tyVal;

                            if (isset($datacontent[$compoundKey])) {
                                $results[] = [
                                    'id_tahun'     => $yVal,
                                    'tahun'        => $y['label'] ?? $y['tahun'] ?? $yVal,
                                    'vervar_label' => $v['label'] ?? null,
                                    'vervar_id'    => $vVal > 0 ? (int)$vVal : null,
                                    'turvar_label' => $t['label'] ?? null,
                                    'turvar_id'    => $tVal > 0 ? (int)$tVal : null,
                                    'nilai'        => $datacontent[$compoundKey],
                                    'status'       => null,
                                    'last_update'  => $json['last_update'] ?? null,
                                    'var_label'    => $varLabel,
                                    'unit'         => $unit,
                                    'description'  => $definition,
                                    'subject_id'   => (int)$subjectId,
                                    'subject_label'=> $json['subject'][0]['label'] ?? "Kategori {$subjectId}",
                                    'related'      => $json['related'] ?? [],
                                    'labelvervar'  => $labelvervar
                                ];
                            }
                        }
                    }
                }
            }

            usleep(20 * 1000); // Optimized 20ms throttle delay instead of 100ms to keep sync very fast
        }

        // Sort results by year (tahun) ASC and vervar_id ASC
        usort($results, function ($a, $b) {
            $at = $a['id_tahun'] ?? 0;
            $bt = $b['id_tahun'] ?? 0;
            if ($at === $bt) {
                return ($a['vervar_id'] ?? 0) <=> ($b['vervar_id'] ?? 0);
            }
            return $at <=> $bt;
        });

        return $results;
    }
}

/**
 * Optimize curl options for macOS and PHP 8 environment
 */
function curl_setopt_optimize_custom($ch) {
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 90);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Defensif di localhost MAMP
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept: application/json'
    ]);
}
?>
