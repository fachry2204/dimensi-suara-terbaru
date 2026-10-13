<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReleaseController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $kind = (string) $request->input('kind');
        if (!in_array($kind, ['cover', 'master', 'clip'], true)) {
            return response()->json(['error' => 'Jenis file tidak valid'], 422);
        }
        $rules = $kind === 'cover'
            ? ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png']
            : ['required', 'file', 'max:204800', 'mimes:wav,flac'];
        $data = $request->validate(['file' => $rules]);
        $file = $data['file'];
        $owner = (int) $request->attributes->get('cms_user')->id;
        $directory = dirname(base_path()).'/uploads/releases/vue/'.$owner;
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            return response()->json(['error' => 'Penyimpanan rilis tidak tersedia'], 500);
        }
        $name = Str::uuid().'.'.$file->extension();
        $file->move($directory, $name);
        $path = '/uploads/releases/vue/'.$owner.'/'.$name;
        $uploads = $request->session()->get('release_uploads', []);
        $uploads[$path] = $kind;
        $request->session()->put('release_uploads', $uploads);
        return response()->json(['success' => true, 'path' => $path, 'name' => $file->getClientOriginalName()]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('cms_user');
        $role = strtolower((string) $actor->role);
        if (!in_array($role, ['admin', 'user'], true)) {
            return response()->json(['error' => 'Role ini tidak dapat membuat rilis'], 403);
        }
        $data = $this->validateReleasePayload($request, false, $role);
        if ($error = $this->validateTrackCount($data)) return $error;
        if ($error = $this->validateReleaseDate($data, $role)) return $error;
        $ownerId = $this->resolveOwnerId($data, $actor, $role);
        if ($ownerId instanceof JsonResponse) return $ownerId;
        if ($error = $this->normalizeReferenceData($data, (int) $ownerId)) return $error;

        $usedPaths = $this->collectPaths($data);
        if ($error = $this->validateUploadedPaths($request, $usedPaths, (int) $actor->id)) return $error;

        $id = DB::transaction(function () use ($data, $ownerId): int {
            $artist = trim((string) ($data['primaryArtist'] ?? ''));
            $id = DB::table('releases')->insertGetId($this->releaseValues($data, (int) $ownerId, 'Draft'));
            foreach ($data['tracks'] as $index => $track) {
                DB::table('tracks')->insert($this->trackValues($track, $id, $index, $artist));
            }
            return $id;
        });
        $this->consumeSessionUploads($request, $usedPaths);
        return response()->json(['success' => true, 'id' => $id, 'status' => 'Draft'], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return $this->updateExisting($request, $id, false);
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        return $this->updateExisting($request, $id, true);
    }

    public function review(Request $request, int $id): JsonResponse
    {
        $actor = $request->attributes->get('cms_user');
        if (strtolower((string) $actor->role) !== 'admin') {
            return response()->json(['error' => 'Hanya admin yang dapat memperbarui workflow rilis'], 403);
        }
        if (!DB::table('releases')->where('id', $id)->exists()) {
            return response()->json(['error' => 'Rilis tidak ditemukan'], 404);
        }
        $data = $request->validate([
            'status' => ['required', Rule::in(['Pending', 'Request Edit', 'Processing', 'Live', 'Rejected'])],
            'aggregator' => ['nullable', 'string', 'max:100'],
            'upc' => ['nullable', 'string', 'max:50'],
            'reason' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tracks' => ['nullable', 'array'],
            'tracks.*.id' => ['required_with:tracks', 'integer', 'min:1'],
            'tracks.*.isrc' => ['nullable', 'string', 'max:50'],
        ]);
        if (in_array($data['status'], ['Request Edit', 'Rejected'], true) && trim((string) ($data['reason'] ?? '')) === '') {
            return response()->json(['error' => 'Alasan revisi atau penolakan wajib diisi'], 422);
        }
        if (in_array($data['status'], ['Processing', 'Live'], true) && trim((string) ($data['aggregator'] ?? '')) === '') {
            return response()->json(['error' => 'Aggregator wajib dipilih untuk status ini'], 422);
        }
        if ($data['status'] === 'Live') {
            if (trim((string) ($data['upc'] ?? '')) === '') {
                return response()->json(['error' => 'UPC wajib diisi sebelum rilis ditandai Rilis'], 422);
            }
            $submittedIsrc = collect($data['tracks'] ?? [])->keyBy(fn (array $track) => (int) $track['id']);
            $missing = DB::table('tracks')->where('release_id', $id)->get(['id', 'isrc'])->contains(function (object $track) use ($submittedIsrc): bool {
                $value = $submittedIsrc->get((int) $track->id)['isrc'] ?? $track->isrc;
                return trim((string) $value) === '';
            });
            if ($missing) return response()->json(['error' => 'ISRC seluruh track wajib diisi sebelum rilis ditandai Rilis'], 422);
        }

        DB::transaction(function () use ($data, $id): void {
            $needsNote = in_array($data['status'], ['Request Edit', 'Rejected'], true);
            DB::table('releases')->where('id', $id)->update([
                'status' => $data['status'], 'aggregator' => $data['aggregator'] ?? null,
                'upc' => $data['upc'] ?? null,
                'rejection_reason' => $needsNote ? trim((string) ($data['reason'] ?? '')) : null,
                'rejection_description' => $needsNote ? trim((string) ($data['description'] ?? '')) : null,
            ]);
            foreach ($data['tracks'] ?? [] as $track) {
                DB::table('tracks')->where('release_id', $id)->where('id', (int) $track['id'])
                    ->update(['isrc' => trim((string) ($track['isrc'] ?? '')) ?: null]);
            }
        });
        return response()->json(['success' => true, 'id' => $id, 'status' => $data['status']]);
    }

    private function updateExisting(Request $request, int $id, bool $submit): JsonResponse
    {
        $release = $this->authorizedRelease($request, $id);
        if (!$release) return response()->json(['error' => 'Rilis tidak ditemukan'], 404);
        if (strtolower((string) $release->status) !== 'draft') {
            return response()->json(['error' => 'Hanya rilis berstatus Draft yang dapat diubah atau dikirim'], 422);
        }
        $actor = $request->attributes->get('cms_user');
        $role = strtolower((string) $actor->role);
        if (!in_array($role, ['admin', 'user'], true)) {
            return response()->json(['error' => 'Role ini tidak dapat mengubah rilis'], 403);
        }
        $data = $this->validateReleasePayload($request, $submit, $role);
        if ($error = $this->validateTrackCount($data)) return $error;
        if ($error = $this->validateReleaseDate($data, $role)) return $error;
        $ownerId = $this->resolveOwnerId($data, $actor, $role);
        if ($ownerId instanceof JsonResponse) return $ownerId;
        if ($error = $this->normalizeReferenceData($data, (int) $ownerId)) return $error;

        $usedPaths = $this->collectPaths($data);
        if ($error = $this->validateUploadedPaths($request, $usedPaths, (int) $actor->id, $id)) return $error;

        DB::transaction(function () use ($data, $id, $ownerId, $submit): void {
            $artist = trim((string) ($data['primaryArtist'] ?? ''));
            DB::table('releases')->where('id', $id)->update($this->releaseValues($data, (int) $ownerId, $submit ? 'Pending' : 'Draft'));
            $retainedIds = [];
            foreach ($data['tracks'] as $index => $track) {
                $values = $this->trackValues($track, $id, $index, $artist);
                $trackId = isset($track['id']) ? (int) $track['id'] : 0;
                if ($trackId > 0 && DB::table('tracks')->where('id', $trackId)->where('release_id', $id)->exists()) {
                    DB::table('tracks')->where('id', $trackId)->where('release_id', $id)->update($values);
                    $retainedIds[] = $trackId;
                } else {
                    $retainedIds[] = (int) DB::table('tracks')->insertGetId($values);
                }
            }
            $remove = DB::table('tracks')->where('release_id', $id);
            if ($retainedIds) $remove->whereNotIn('id', $retainedIds);
            $remove->delete();
        });
        $this->consumeSessionUploads($request, $usedPaths);
        return response()->json(['success' => true, 'id' => $id, 'status' => $submit ? 'Pending' : 'Draft']);
    }

    private function validateReleasePayload(Request $request, bool $submit, string $role): array
    {
        $requiredFinal = $submit ? 'required' : 'nullable';
        $audioRule = $submit && $role !== 'admin' ? 'required' : 'nullable';
        return $request->validate([
            'type' => ['required', Rule::in(['SINGLE', 'ALBUM'])],
            'userId' => [$role === 'admin' ? 'required' : 'nullable', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:255'],
            'version' => ['nullable', 'string', 'max:50'],
            'primaryArtist' => [$requiredFinal, 'string', 'max:255'],
            'genreId' => ['nullable', 'integer', 'min:1'],
            'subGenreId' => ['nullable', 'integer', 'min:1'],
            'recordLabelId' => ['nullable', 'integer', 'min:1'],
            'genre' => [$requiredFinal, 'string', 'max:100'],
            'subGenre' => ['nullable', 'string', 'max:100'],
            'language' => [$requiredFinal, 'string', 'max:50'],
            'label' => [$requiredFinal, 'string', 'max:100'],
            'pLine' => [$requiredFinal, 'string', 'max:255'],
            'cLine' => [$requiredFinal, 'string', 'max:255'],
            'plannedReleaseDate' => [$requiredFinal, 'date_format:Y-m-d'],
            'originalReleaseDate' => ['nullable', 'date_format:Y-m-d'],
            'coverPath' => [$requiredFinal, 'string', 'max:255'],
            'tracks' => ['required', 'array', 'min:1', 'max:50'],
            'tracks.*.id' => ['nullable', 'integer', 'min:1'],
            'tracks.*.title' => ['required', 'string', 'max:255'],
            'tracks.*.isrc' => ['nullable', 'string', 'max:50'],
            'tracks.*.masterPath' => [$audioRule, 'string', 'max:255'],
            'tracks.*.clipPath' => [$audioRule, 'string', 'max:255'],
            'tracks.*.language' => ['nullable', 'string', 'max:50'],
            'tracks.*.instrumental' => ['nullable', 'boolean'],
            'tracks.*.explicit' => ['nullable', 'boolean'],
            'tracks.*.lyrics' => ['nullable', 'string', 'max:20000'],
            'tracks.*.writer' => ['nullable', 'string', 'max:1000'],
            'tracks.*.lyricist' => ['nullable', 'string', 'max:1000'],
            'tracks.*.producer' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function validateTrackCount(array $data): ?JsonResponse
    {
        if ($data['type'] === 'SINGLE' && count($data['tracks']) !== 1) {
            return response()->json(['error' => 'Single harus berisi tepat satu track'], 422);
        }
        if ($data['type'] === 'ALBUM' && count($data['tracks']) < 2) {
            return response()->json(['error' => 'Album/EP harus berisi minimal dua track'], 422);
        }
        return null;
    }

    private function validateReleaseDate(array $data, string $role): ?JsonResponse
    {
        if ($role !== 'admin' && !empty($data['plannedReleaseDate']) && $data['plannedReleaseDate'] < now()->toDateString()) {
            return response()->json(['error' => 'Tanggal rilis user tidak boleh di masa lalu'], 422);
        }
        return null;
    }

    private function resolveOwnerId(array $data, object $actor, string $role): int|JsonResponse
    {
        $ownerId = (int) $actor->id;
        if ($role === 'admin') {
            $ownerId = (int) $data['userId'];
            if (!DB::table('users')->where('id', $ownerId)->where('role', 'User')->exists()) {
                return response()->json(['error' => 'User pemilik rilis tidak ditemukan'], 422);
            }
        } elseif (isset($data['userId']) && (int) $data['userId'] !== $ownerId) {
            return response()->json(['error' => 'Tidak boleh memilih pemilik lain'], 403);
        }
        return $ownerId;
    }

    private function collectPaths(array $data): array
    {
        $usedPaths = [];
        if (!empty($data['coverPath'])) {
            $usedPaths[$data['coverPath']] = 'cover';
        }
        foreach ($data['tracks'] as $track) {
            if (!empty($track['masterPath'])) $usedPaths[$track['masterPath']] = 'master';
            if (!empty($track['clipPath'])) $usedPaths[$track['clipPath']] = 'clip';
        }
        return $usedPaths;
    }

    private function normalizeReferenceData(array &$data, int $ownerId): ?JsonResponse
    {
        if (!empty($data['genreId'])) {
            $genre = DB::table('genres')->where('id', (int) $data['genreId'])->where('is_active', 1)->first(['id', 'name']);
            if (!$genre) return response()->json(['error' => 'Genre tidak valid atau sudah tidak aktif'], 422);
            $data['genre'] = $genre->name;
        }
        if (!empty($data['subGenreId'])) {
            $query = DB::table('subgenres')->where('id', (int) $data['subGenreId'])->where('is_active', 1);
            if (!empty($data['genreId'])) $query->where('genre_id', (int) $data['genreId']);
            $subgenre = $query->first(['id', 'name']);
            if (!$subgenre) return response()->json(['error' => 'Subgenre tidak sesuai dengan genre yang dipilih'], 422);
            $data['subGenre'] = $subgenre->name;
        }
        if (!empty($data['recordLabelId'])) {
            $label = DB::table('record_labels')->where('id', (int) $data['recordLabelId'])
                ->where('user_id', $ownerId)->where('is_active', 1)->first(['id', 'name']);
            if (!$label) return response()->json(['error' => 'Label rekaman tidak tersedia untuk user pemilik rilis'], 422);
            $data['label'] = $label->name;
        }
        return null;
    }

    private function validateUploadedPaths(Request $request, array $usedPaths, int $actorId, ?int $releaseId = null): ?JsonResponse
    {
        $sessionUploads = $request->session()->get('release_uploads', []);
        foreach ($usedPaths as $path => $kind) {
            $fresh = ($sessionUploads[$path] ?? null) === $kind && $this->uploadedFileExists($path, $actorId);
            $existing = $releaseId !== null && $this->releaseOwnsPath($releaseId, $path, $kind);
            if (!$fresh && !$existing) {
                return response()->json(['error' => 'File upload tidak valid atau bukan milik sesi ini'], 422);
            }
        }
        return null;
    }

    private function consumeSessionUploads(Request $request, array $usedPaths): void
    {
        $sessionUploads = $request->session()->get('release_uploads', []);
        foreach (array_keys($usedPaths) as $path) {
            if (isset($sessionUploads[$path])) unset($sessionUploads[$path]);
        }
        $request->session()->put('release_uploads', $sessionUploads);
    }

    private function releaseOwnsPath(int $releaseId, string $path, string $kind): bool
    {
        if ($kind === 'cover') {
            return DB::table('releases')->where('id', $releaseId)->where(fn ($query) => $query->where('cover_art', $path)->orWhere('cover_url', $path))->exists();
        }
        $column = $kind === 'master' ? 'audio_file' : 'audio_clip';
        return DB::table('tracks')->where('release_id', $releaseId)->where($column, $path)->exists();
    }

    private function releaseValues(array $data, int $ownerId, string $status): array
    {
        $artist = trim((string) ($data['primaryArtist'] ?? ''));
        return [
            'user_id' => $ownerId, 'title' => trim($data['title']),
            'type' => $data['type'] === 'SINGLE' ? 'Single' : 'Album', 'release_type' => $data['type'],
            'status' => $status, 'current_step' => $status === 'Pending' ? 3 : 1,
            'version' => $data['version'] ?? 'Original',
            'primary_artists' => json_encode($artist === '' ? [] : [$artist]),
            'genre' => $data['genre'] ?? null, 'sub_genre' => $data['subGenre'] ?? null,
            'genre_id' => $data['genreId'] ?? null, 'subgenre_id' => $data['subGenreId'] ?? null,
            'record_label_id' => $data['recordLabelId'] ?? null,
            'language' => $data['language'] ?? null, 'label' => $data['label'] ?? null,
            'p_line' => $data['pLine'] ?? null, 'c_line' => $data['cLine'] ?? null,
            'planned_release_date' => $data['plannedReleaseDate'] ?? null,
            'original_release_date' => $data['originalReleaseDate'] ?? null,
            'cover_art' => $data['coverPath'] ?? null, 'cover_url' => $data['coverPath'] ?? null,
        ];
    }

    private function trackValues(array $track, int $releaseId, int $index, string $artist): array
    {
        return [
            'release_id' => $releaseId, 'title' => trim($track['title']),
            'track_number' => (string) ($index + 1), 'isrc' => $track['isrc'] ?? null,
            'audio_file' => $track['masterPath'] ?? null, 'audio_clip' => $track['clipPath'] ?? null,
            'primary_artists' => json_encode($artist === '' ? [] : [$artist]),
            'language' => $track['language'] ?? null, 'is_instrumental' => !empty($track['instrumental']) ? 1 : 0,
            'explicit' => !empty($track['explicit']) ? 1 : 0, 'lyrics' => $track['lyrics'] ?? null,
            'writer' => $track['writer'] ?? null, 'lyricist' => $track['lyricist'] ?? null,
            'producer' => $track['producer'] ?? null,
        ];
    }

    private function uploadedFileExists(string $path, int $actorId): bool
    {
        if (!preg_match('#^/uploads/releases/vue/'.preg_quote((string) $actorId, '#').'/[0-9a-f-]+\.(?:jpg|jpeg|png|wav|flac)$#i', $path)) {
            return false;
        }
        return is_file(dirname(base_path()).$path);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->attributes->get('cms_user');
        $staff = in_array(strtolower((string) $user->role), ['admin', 'operator'], true);
        $query = DB::table('releases')->leftJoin('users', 'users.id', '=', 'releases.user_id')
            ->select('releases.id', 'releases.user_id', 'releases.title', 'releases.type', 'releases.status', 'releases.cover_art', 'releases.cover_url', 'releases.upc', 'releases.planned_release_date', 'releases.created_at', 'users.full_name as owner_name');
        if (!$staff) {
            $query->where('releases.user_id', (int) $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('releases.user_id', (int) $request->query('user_id'));
        }
        if ($request->filled('q')) {
            $query->where('releases.title', 'like', '%'.trim((string) $request->query('q')).'%');
        }
        return response()->json($query->orderByDesc('releases.id')->paginate(25));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $release = DB::table('releases')->where('id', $id)->first();
        if (!$release) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $user = $request->attributes->get('cms_user');
        if (!in_array(strtolower((string) $user->role), ['admin', 'operator'], true) && (int) $release->user_id !== (int) $user->id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $tracks = DB::table('tracks')->where('release_id', $id)->orderBy('id')->get();
        $owner = DB::table('users')->where('id', $release->user_id)
            ->select('id', 'full_name', 'company_name', 'username', 'email')->first();
        return response()->json(['release' => $release, 'tracks' => $tracks, 'owner' => $owner]);
    }

    public function cover(Request $request, int $id): BinaryFileResponse|JsonResponse
    {
        $release = $this->authorizedRelease($request, $id);
        if (!$release) return response()->json(['error' => 'Rilis tidak ditemukan'], 404);
        $path = $this->resolveStoredFile((string) ($release->cover_art ?: $release->cover_url ?: ''));
        return $path ? $this->serveFile($request, $path) : response()->json(['error' => 'Cover tidak ditemukan'], 404);
    }

    public function trackMedia(Request $request, int $id, int $trackId, string $kind): BinaryFileResponse|JsonResponse
    {
        if (!in_array($kind, ['master', 'clip'], true)) {
            return response()->json(['error' => 'Jenis audio tidak valid'], 404);
        }
        if (!$this->authorizedRelease($request, $id)) {
            return response()->json(['error' => 'Rilis tidak ditemukan'], 404);
        }
        $column = $kind === 'master' ? 'audio_file' : 'audio_clip';
        $stored = DB::table('tracks')->where('id', $trackId)->where('release_id', $id)->value($column);
        $path = $this->resolveStoredFile((string) ($stored ?? ''));
        return $path ? $this->serveFile($request, $path) : response()->json(['error' => 'Audio tidak ditemukan'], 404);
    }

    private function authorizedRelease(Request $request, int $id): ?object
    {
        $release = DB::table('releases')->where('id', $id)->first();
        if (!$release) return null;
        $user = $request->attributes->get('cms_user');
        if (!in_array(strtolower((string) $user->role), ['admin', 'operator'], true) && (int) $release->user_id !== (int) $user->id) {
            return null;
        }
        return $release;
    }

    private function resolveStoredFile(string $stored): ?string
    {
        if (!preg_match('#^/uploads/([A-Za-z0-9_./ -]+)$#', $stored, $matches)) return null;
        $segments = explode('/', $matches[1]);
        if (in_array('..', $segments, true) || in_array('.', $segments, true)) return null;
        $root = dirname(base_path());
        foreach ([$root.'/uploads', $root.'/public/uploads', $root.'/httpdocs/uploads'] as $base) {
            $baseReal = realpath($base);
            if (!$baseReal) continue;
            $file = realpath($base.'/'.$matches[1]);
            if ($file && str_starts_with($file, $baseReal.DIRECTORY_SEPARATOR) && is_file($file)) return $file;
        }
        return null;
    }

    private function serveFile(Request $request, string $path): BinaryFileResponse
    {
        $response = $request->query('download') === '1'
            ? response()->download($path, basename($path))
            : response()->file($path);
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        return $response;
    }
}
