<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use RuntimeException;
use ZipArchive;

class ContractGenerator
{
    public function generate(object $user, object $template): array
    {
        $source = $this->absolutePath((string) $template->file_path);
        if (!is_file($source)) throw new RuntimeException('File template kontrak tidak ditemukan.');

        $generatedAt = now('Asia/Jakarta');
        $name = trim((string) ($user->full_name ?: $user->company_name ?: $user->username));
        $values = $this->values($user, $generatedAt);
        $directory = dirname(base_path()).'/storage/private/contracts/'.$user->id.'/'.$generatedAt->format('Y');
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new RuntimeException('Folder penyimpanan kontrak tidak dapat dibuat.');
        }
        $fileName = 'Kontrak_Dimensi_Suara_'.$this->safe($name).'_'.$generatedAt->format('Ymd_His').'.docx';
        $target = $directory.'/'.$fileName;
        if (!copy($source, $target)) throw new RuntimeException('Template kontrak tidak dapat disalin.');

        $zip = new ZipArchive();
        if ($zip->open($target) !== true) throw new RuntimeException('Template DOCX tidak dapat dibuka.');
        $xml = $zip->getFromName('word/document.xml');
        if ($xml === false) { $zip->close(); throw new RuntimeException('Isi template DOCX tidak valid.'); }
        [$rendered, $unknown] = $this->renderXml($xml, $values);
        if ($unknown !== []) { $zip->close(); @unlink($target); throw new RuntimeException('Placeholder template belum dikenali: '.implode(', ', $unknown)); }
        $zip->addFromString('word/document.xml', $rendered);
        $zip->close();

        $relative = str_replace('\\', '/', substr($target, strlen(dirname(base_path()))));
        return [
            'file_name' => $fileName, 'file_path' => $relative, 'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'file_size' => filesize($target), 'checksum_sha256' => hash_file('sha256', $target), 'generated_at' => $generatedAt,
            'snapshot' => ['user_id' => $user->id, 'nama_user' => $name, 'template_version' => $template->version, 'generated_at' => $generatedAt->toIso8601String()],
        ];
    }

    private function renderXml(string $xml, array $values): array
    {
        $dom = new DOMDocument();
        $dom->preserveWhiteSpace = true;
        if (!$dom->loadXML($xml)) throw new RuntimeException('XML template kontrak tidak valid.');
        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $unknown = [];
        foreach ($xpath->query('//w:p') as $paragraph) {
            $nodes = iterator_to_array($xpath->query('.//w:t', $paragraph));
            $full = implode('', array_map(fn ($node) => $node->textContent, $nodes));
            if (!preg_match_all('/<([^<>]+)>/u', $full, $matches, PREG_OFFSET_CAPTURE)) continue;
            for ($i = count($matches[0]) - 1; $i >= 0; $i--) {
                $raw = $matches[0][$i][0]; $start = $matches[0][$i][1]; $key = $this->normalize($matches[1][$i][0]);
                if (!array_key_exists($key, $values)) { $unknown[] = $raw; continue; }
                $this->replaceAcrossNodes($nodes, $start, strlen($raw), (string) $values[$key]);
            }
        }
        return [$dom->saveXML(), array_values(array_unique($unknown))];
    }

    private function replaceAcrossNodes(array $nodes, int $start, int $length, string $replacement): void
    {
        $offset = 0; $end = $start + $length; $first = true;
        foreach ($nodes as $node) {
            $text = $node->textContent; $nodeStart = $offset; $nodeEnd = $offset + strlen($text); $offset = $nodeEnd;
            if ($nodeEnd <= $start || $nodeStart >= $end) continue;
            $localStart = max(0, $start - $nodeStart); $localEnd = min(strlen($text), $end - $nodeStart);
            $prefix = substr($text, 0, $localStart); $suffix = substr($text, $localEnd);
            $node->nodeValue = $prefix.($first ? $replacement : '').$suffix; $first = false;
        }
    }

    private function values(object $u, $date): array
    {
        $name = trim((string) ($u->full_name ?: $u->company_name ?: $u->username));
        $agg = (float) ($u->aggregator_percentage ?? 0); $admin = 100 - $agg;
        return [
            'nama user' => $name, 'nik ktp user' => $u->nik ?? '', 'alamat user' => $u->address ?? '',
            'kelurahan/desa user' => $u->subdistrict ?? '', 'kecamatan user' => $u->district ?? '', 'kota user' => $u->city ?? '',
            'provinsi user' => $u->province ?? '', 'kode pos user' => $u->postal_code ?? '', 'email user' => $u->email ?? '',
            'no hp user' => $u->phone ?? '', 'nama user / pic user' => $u->pic_name ?: $name,
            'nama bank user' => $u->bank_name ?? '', 'kantor cabang bank user' => '', 'no rekening user' => $u->bank_account_number ?? '',
            'atas nama rening user' => $u->bank_account_name ?? '', 'atas nama rekening user' => $u->bank_account_name ?? '', 'no npwp user' => '',
            'presentase user' => $this->number($agg), 'terbilang presentase user' => $this->words($agg),
            'presentase admin' => $this->number($admin), 'terbilang presentase admin' => $this->words($admin),
            'jam generat' => 'AGR-'.$date->format('His'), 'tanggal generat' => $date->format('dmY'),
        ];
    }

    private function normalize(string $value): string { return strtolower(trim(preg_replace('/\s+/u', ' ', $value))); }
    private function number(float $number): string { return rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.'); }
    private function words(float $number): string
    {
        $n = (int) round($number); $basic = ['nol','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
        if ($n < 12) return $basic[$n]; if ($n < 20) return $basic[$n - 10].' belas';
        if ($n < 100) return trim($basic[intdiv($n, 10)].' puluh '.($n % 10 ? $basic[$n % 10] : ''));
        return (string) $n;
    }
    private function safe(string $value): string { return trim(preg_replace('/[^A-Za-z0-9_-]+/', '_', $value), '_') ?: 'User'; }
    private function absolutePath(string $stored): string
    {
        if (preg_match('#^[A-Za-z]:[\\/]#', $stored)) return $stored;
        return dirname(base_path()).'/'.ltrim(str_replace('\\', '/', $stored), '/');
    }
}
