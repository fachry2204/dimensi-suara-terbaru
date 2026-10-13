<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class WilayahController extends Controller
{
    public function provinces(): JsonResponse { return $this->regionList('provinces', 'provinces.json'); }
    public function regencies(string $code): JsonResponse { return $this->codedList('regencies', $code); }
    public function districts(string $code): JsonResponse { return $this->codedList('districts', $code); }
    public function villages(string $code): JsonResponse { return $this->codedList('villages', $code); }

    private function codedList(string $kind, string $code): JsonResponse
    {
        if (!preg_match('/^\d+(?:\.\d+)*$/', $code)) return response()->json(['error' => 'Kode wilayah tidak valid'], 422);
        return $this->regionList($kind.':'.$code, $kind.'/'.$code.'.json');
    }

    private function regionList(string $key, string $path): JsonResponse
    {
        try {
            $data = Cache::remember('wilayah:'.$key, now()->addDays(7), function () use ($path): array {
                $response = Http::acceptJson()->timeout(12)->retry(2, 200)->get('https://emsifa.github.io/api-wilayah-indonesia/api/'.$path);
                $response->throw();
                return collect($response->json())->map(fn ($item) => [
                    'code' => trim((string) ($item['id'] ?? $item['code'] ?? '')),
                    'name' => trim((string) ($item['name'] ?? '')),
                ])->filter(fn ($item) => $item['code'] !== '' && $item['name'] !== '')->values()->all();
            });
            return response()->json(['data' => $data]);
        } catch (\Throwable) {
            return response()->json(['data' => [], 'error' => 'Gagal memuat data wilayah'], 502);
        }
    }

    public function postalCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'province' => ['nullable', 'string', 'max:100'], 'city' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'], 'village' => ['required', 'string', 'max:100'],
        ]);
        $queries = collect([
            [$data['village'], $data['district'] ?? '', $data['city'] ?? '', $data['province'] ?? ''],
            [$data['village'], $data['district'] ?? '', $data['city'] ?? ''],
            [$data['village'], $data['district'] ?? ''], [$data['village']],
        ])->map(fn ($parts) => collect($parts)->map(fn ($part) => $this->normalize((string) $part))->filter()->join(' '))->filter()->unique();
        try {
            $allRows = [];
            foreach ($queries as $query) {
                $rows = Cache::remember('postal:'.sha1($query), now()->addDay(), function () use ($query): array {
                    $response = Http::acceptJson()->timeout(12)->retry(2, 200)->get('https://kodepos.vercel.app/search', ['q' => $query]);
                    if (!$response->successful()) return [];
                    $payload = $response->json();
                    return is_array($payload['data'] ?? null) ? $payload['data'] : (is_array($payload['results'] ?? null) ? $payload['results'] : (array_is_list($payload ?? []) ? $payload : []));
                });
                $allRows = array_merge($allRows, $rows);
                if ($match = $this->matchingPostalRow($rows, $data)) return response()->json(['code' => $this->rowPostalCode($match)]);
            }
            $match = $this->matchingPostalRow($allRows, $data);
            return response()->json(['code' => $match ? $this->rowPostalCode($match) : '']);
        } catch (\Throwable) {
            return response()->json(['code' => '', 'error' => 'Kode pos tidak ditemukan'], 502);
        }
    }

    private function matchingPostalRow(array $rows, array $expected): ?array
    {
        foreach ($rows as $row) {
            $actual = [
                'village' => $row['village'] ?? $row['kelurahan'] ?? $row['urban'] ?? '',
                'district' => $row['district'] ?? $row['kecamatan'] ?? $row['subdistrict'] ?? '',
                'city' => $row['regency'] ?? $row['city'] ?? $row['kabupaten'] ?? '',
                'province' => $row['province'] ?? $row['provinsi'] ?? '',
            ];
            $matches = $this->compact((string) $actual['village']) === $this->compact((string) $expected['village']);
            foreach (['district', 'city', 'province'] as $field) {
                $wanted = $this->compact((string) ($expected[$field] ?? ''));
                $found = $this->compact((string) $actual[$field]);
                $matches = $matches && ($wanted === '' || $found === '' || $wanted === $found);
            }
            if ($matches && $this->rowPostalCode($row) !== '') return $row;
        }
        return null;
    }

    private function rowPostalCode(array $row): string
    {
        return trim((string) ($row['postalcode'] ?? $row['postal_code'] ?? $row['kodepos'] ?? $row['kode_pos'] ?? $row['code'] ?? $row['zip'] ?? ''));
    }

    private function compact(string $value): string { return preg_replace('/\s+/', '', $this->normalize($value)) ?? ''; }
    private function normalize(string $value): string
    {
        $value = strtolower(trim(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value));
        $value = preg_replace('/^(kabupaten|kab\.?|kota administratif|kota|kecamatan|kelurahan|desa)\s+/i', '', $value) ?? $value;
        return trim(preg_replace('/[^a-z0-9]+/', ' ', $value) ?? '');
    }
}
