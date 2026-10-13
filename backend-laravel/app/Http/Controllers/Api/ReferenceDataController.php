<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReferenceDataController extends Controller
{
    public function releaseForm(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('cms_user');
        $isAdmin = strtolower((string) $actor->role) === 'admin';
        $ownerId = (int) $actor->id;
        if ($isAdmin && $request->filled('user_id')) $ownerId = (int) $request->query('user_id');
        if (!$isAdmin && $request->filled('user_id') && (int) $request->query('user_id') !== $ownerId) {
            return response()->json(['error' => 'Tidak boleh melihat master data user lain'], 403);
        }

        $genres = DB::table('genres')->where('is_active', 1)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']);
        $subgenres = DB::table('subgenres')->where('is_active', 1)->orderBy('sort_order')->orderBy('name')->get(['id', 'genre_id', 'name']);
        $labels = DB::table('record_labels')->where('user_id', $ownerId)->where('is_active', 1)->orderBy('name')->get(['id', 'name']);
        $artists = [];
        $rawArtists = DB::table('releases')->where('user_id', $ownerId)->whereNotNull('primary_artists')
            ->orderByDesc('id')->limit(250)->pluck('primary_artists');
        foreach ($rawArtists as $raw) {
            $decoded = json_decode((string) $raw, true);
            foreach (is_array($decoded) ? $decoded : [] as $artist) {
                $name = is_array($artist) ? ($artist['name'] ?? '') : $artist;
                if (is_string($name) && trim($name) !== '') $artists[mb_strtolower(trim($name))] = trim($name);
            }
        }
        natcasesort($artists);

        return response()->json([
            'genres' => $genres, 'subgenres' => $subgenres, 'labels' => $labels,
            'artists' => array_values($artists),
            'languages' => ['Indonesia', 'United States', 'United Kingdom', 'Japan', 'South Korea', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines', 'China', 'India', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Brazil', 'Argentina', 'Mexico', 'Canada', 'Russia', 'Turkey', 'Saudi Arabia', 'United Arab Emirates', 'South Africa'],
            'versions' => ['Original', 'Remix', 'Live', 'Cover', 'Radio Edit'],
        ]);
    }
}
