<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\TestCase;

class CmsApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('users', function (Blueprint $table): void {
            $table->increments('id');
            $table->string('username'); $table->string('email'); $table->string('password_hash');
            $table->string('role'); $table->string('status'); $table->string('type');
            $table->string('full_name')->nullable(); $table->string('phone')->nullable();
            $table->string('company_name')->nullable(); $table->timestamps();
            $table->string('account_type')->nullable(); $table->dateTime('registered_at')->nullable();
            $table->string('nik')->nullable(); $table->text('address')->nullable(); $table->string('country')->nullable();
            $table->string('province')->nullable(); $table->string('city')->nullable(); $table->string('district')->nullable();
            $table->string('subdistrict')->nullable(); $table->string('postal_code')->nullable();
            $table->string('pic_name')->nullable(); $table->string('pic_position')->nullable(); $table->string('pic_phone')->nullable();
            $table->string('bank_name')->nullable(); $table->string('bank_account_number')->nullable(); $table->string('bank_account_name')->nullable();
            $table->decimal('aggregator_percentage', 5, 2)->nullable(); $table->decimal('publishing_percentage', 5, 2)->nullable();
            $table->text('rejection_reason')->nullable(); $table->text('block_reason')->nullable(); $table->string('contract_status')->nullable();
            $table->dateTime('rejected_date')->nullable(); $table->dateTime('blocked_at')->nullable(); $table->dateTime('joined_date')->nullable();
            $table->string('ktp_doc_path')->nullable(); $table->string('npwp_doc_path')->nullable(); $table->string('signature_doc_path')->nullable();
            $table->string('nib_doc_path')->nullable(); $table->string('kemenkumham_doc_path')->nullable(); $table->string('contract_doc_path')->nullable();
        });
        Schema::create('releases', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('user_id'); $table->string('title');
            $table->string('type'); $table->string('status'); $table->string('cover_art')->nullable();
            $table->string('cover_url')->nullable(); $table->string('upc')->nullable();
            $table->date('planned_release_date')->nullable(); $table->timestamps();
            $table->string('release_type')->nullable(); $table->integer('current_step')->nullable();
            $table->string('version')->nullable(); $table->text('primary_artists')->nullable();
            $table->string('genre')->nullable(); $table->string('language')->nullable();
            $table->string('label')->nullable(); $table->string('sub_genre')->nullable();
            $table->string('p_line')->nullable(); $table->string('c_line')->nullable();
            $table->date('original_release_date')->nullable();
            $table->string('aggregator')->nullable(); $table->string('rejection_reason')->nullable();
            $table->text('rejection_description')->nullable();
            $table->integer('genre_id')->nullable(); $table->integer('subgenre_id')->nullable();
            $table->integer('record_label_id')->nullable();
        });
        Schema::create('tracks', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('release_id'); $table->string('title');
            $table->string('isrc')->nullable();
            $table->string('track_number')->nullable(); $table->string('audio_file')->nullable();
            $table->string('audio_clip')->nullable(); $table->text('primary_artists')->nullable();
            $table->string('language')->nullable(); $table->boolean('is_instrumental')->nullable();
            $table->boolean('explicit')->nullable(); $table->text('lyrics')->nullable();
            $table->text('writer')->nullable(); $table->text('lyricist')->nullable();
            $table->text('producer')->nullable();
        });
        Schema::create('genres', function (Blueprint $table): void {
            $table->increments('id'); $table->string('name'); $table->integer('sort_order')->default(0); $table->boolean('is_active')->default(true);
        });
        Schema::create('subgenres', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('genre_id'); $table->string('name'); $table->integer('sort_order')->default(0); $table->boolean('is_active')->default(true);
        });
        Schema::create('record_labels', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('user_id'); $table->string('name'); $table->boolean('is_active')->default(true);
        });
        Schema::create('contract_templates', function (Blueprint $table): void {
            $table->increments('id'); $table->string('file_name'); $table->string('file_path'); $table->string('mime_type');
            $table->integer('file_size'); $table->string('checksum_sha256'); $table->string('account_type')->nullable();
            $table->integer('version'); $table->boolean('is_active'); $table->integer('uploaded_by')->nullable(); $table->timestamps();
        });
        Schema::create('user_contracts', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('user_id'); $table->integer('contract_template_id'); $table->integer('version');
            $table->string('status'); $table->string('file_name'); $table->string('file_path'); $table->string('mime_type');
            $table->integer('file_size'); $table->string('checksum_sha256'); $table->text('generated_data_snapshot')->nullable();
            $table->text('error_message')->nullable(); $table->integer('generated_by'); $table->dateTime('generated_at');
            $table->boolean('is_current'); $table->timestamps();
        });
        Schema::create('contract_signing_requests', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('contract_id'); $table->integer('user_id'); $table->string('token_hash');
            $table->string('status'); $table->integer('sent_by'); $table->dateTime('sent_at'); $table->dateTime('expires_at'); $table->dateTime('signed_at')->nullable();
            $table->string('signer_name')->nullable(); $table->string('signer_email')->nullable(); $table->string('signer_ip')->nullable(); $table->text('signer_user_agent')->nullable();
            $table->string('signature_file_path')->nullable(); $table->string('signed_file_path')->nullable(); $table->string('signed_file_name')->nullable();
            $table->integer('signed_file_size')->nullable(); $table->string('signed_checksum_sha256')->nullable();
            $table->string('email_status')->nullable(); $table->text('email_error')->nullable(); $table->string('whatsapp_status')->nullable(); $table->text('whatsapp_error')->nullable(); $table->timestamps();
        });
        Schema::create('report_batches', function (Blueprint $table): void {
            $table->increments('id'); $table->string('aggregator_name'); $table->date('report_period')->nullable(); $table->string('original_file_name'); $table->string('stored_file_path'); $table->string('file_mime_type')->nullable(); $table->integer('file_size')->nullable(); $table->string('file_sha256')->unique(); $table->string('sheet_name')->nullable(); $table->string('status'); $table->integer('total_rows')->default(0); $table->integer('matched_rows')->default(0); $table->integer('no_account_rows')->default(0); $table->integer('conflict_rows')->default(0); $table->integer('invalid_rows')->default(0); $table->text('gross_revenue_summary')->nullable(); $table->decimal('gross_idr_total',24,0)->default(0); $table->decimal('user_revenue_total',24,0)->default(0); $table->decimal('aggregator_revenue_total',24,0)->default(0); $table->text('currency_rates_snapshot')->nullable(); $table->integer('uploaded_by'); $table->integer('finalized_by')->nullable(); $table->dateTime('uploaded_at'); $table->dateTime('finalized_at')->nullable(); $table->text('error_message')->nullable(); $table->timestamps();
        });
        Schema::create('report_rows', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('report_batch_id'); $table->integer('row_number'); foreach(['reporting_month','sales_month','platform','country_region','label_name','artist_name','release_title','track_title','upc_original','upc_normalized','isrc_original','isrc_normalized','streaming_subscription_type','release_type','sales_type','client_payment_currency','match_method','assignment_method','status'] as $c)$table->string($c)->nullable(); $table->decimal('quantity',24,8)->nullable(); $table->decimal('net_revenue',24,8)->nullable(); $table->decimal('exchange_rate',24,8)->nullable(); $table->decimal('gross_idr_decimal',24,8)->nullable(); $table->decimal('gross_idr_final',24,0)->nullable(); $table->integer('matched_user_id')->nullable(); $table->integer('matched_release_id')->nullable(); $table->integer('matched_track_id')->nullable(); $table->text('match_details')->nullable(); $table->decimal('user_percentage',8,4)->nullable(); $table->decimal('aggregator_percentage',8,4)->nullable(); $table->decimal('user_revenue',24,0)->nullable(); $table->decimal('aggregator_revenue',24,0)->nullable(); $table->text('warning_message')->nullable(); $table->text('error_message')->nullable(); $table->timestamps();
        });
        Schema::create('user_revenue_ledger', function (Blueprint $table): void {
            $table->increments('id'); $table->integer('user_id'); $table->integer('report_batch_id'); $table->integer('report_row_id'); $table->string('ledger_type'); foreach(['sales_month','platform','country_region','artist_name','release_title','track_title','upc','isrc','original_currency','status'] as $c)$table->string($c)->nullable(); $table->decimal('quantity',24,8)->nullable(); $table->decimal('original_net_revenue',24,8)->nullable(); $table->decimal('exchange_rate_snapshot',24,8); $table->decimal('gross_idr_snapshot',24,0); $table->decimal('user_percentage_snapshot',8,4); $table->decimal('aggregator_percentage_snapshot',8,4); $table->decimal('user_revenue_idr',24,0); $table->decimal('aggregator_revenue_idr',24,0); $table->dateTime('finalized_at'); $table->timestamps();
        });
        DB::table('users')->insert([
            ['id' => 1, 'username' => 'user@example.test', 'email' => 'user@example.test', 'password_hash' => Hash::make('correct-password'), 'role' => 'User', 'status' => 'Approved', 'type' => 'Personal', 'full_name' => 'User A'],
            ['id' => 2, 'username' => 'admin@example.test', 'email' => 'admin@example.test', 'password_hash' => Hash::make('correct-password'), 'role' => 'Admin', 'status' => 'Active', 'type' => 'Personal', 'full_name' => 'Admin B'],
        ]);
        DB::table('releases')->insert([
            ['id' => 10, 'user_id' => 1, 'title' => 'Own release', 'type' => 'Single', 'status' => 'Pending'],
            ['id' => 11, 'user_id' => 2, 'title' => 'Other release', 'type' => 'Album', 'status' => 'Pending'],
        ]);
        DB::table('genres')->insert([['id' => 1, 'name' => 'Pop', 'sort_order' => 1, 'is_active' => 1]]);
        DB::table('subgenres')->insert([['id' => 1, 'genre_id' => 1, 'name' => 'Indie Pop', 'sort_order' => 1, 'is_active' => 1]]);
        DB::table('record_labels')->insert([['id' => 1, 'user_id' => 1, 'name' => 'User Label', 'is_active' => 1]]);
    }

    public function test_public_health_and_unauthorized_catalogue(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('service', 'laravel');
        $this->getJson('/api/auth/session')->assertOk()->assertJsonPath('user', null);
        $this->getJson('/api/releases')->assertUnauthorized();
    }

    public function test_user_can_only_access_own_releases_and_not_user_index(): void
    {
        $this->withSession(['cms_user_id' => 1])->getJson('/api/releases')->assertOk()->assertJsonCount(1, 'data');
        $this->withSession(['cms_user_id' => 1])->getJson('/api/releases/11')->assertForbidden();
        $this->withSession(['cms_user_id' => 1])->getJson('/api/users')->assertForbidden();
    }

    public function test_admin_can_see_catalogue_and_login_does_not_expose_hash(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'admin@example.test', 'password' => 'correct-password'])
            ->assertOk()->assertDontSee('password_hash');
        $this->withSession(['cms_user_id' => 2])->getJson('/api/releases')->assertJsonCount(2, 'data');
        $this->withSession(['cms_user_id' => 2])->getJson('/api/users')->assertOk()->assertDontSee('password_hash');
    }

    public function test_admin_creates_owned_album_draft_without_audio_or_date_restriction(): void
    {
        $payload = [
            'type' => 'ALBUM', 'userId' => 1, 'title' => 'Test Album',
            'primaryArtist' => 'Sample Artist', 'plannedReleaseDate' => '2020-01-01',
            'tracks' => [['title' => 'Track One'], ['title' => 'Track Two']],
        ];
        $this->withSession(['cms_user_id' => 2])->postJson('/api/releases', $payload)
            ->assertCreated()->assertJsonPath('status', 'Draft');
        $this->assertDatabaseHas('releases', ['title' => 'Test Album', 'user_id' => 1, 'status' => 'Draft']);
        $this->assertDatabaseCount('tracks', 2);
    }

    public function test_regular_user_cannot_claim_another_owner_or_backdate_release(): void
    {
        $payload = ['type' => 'SINGLE', 'title' => 'Test Single', 'tracks' => [['title' => 'Track One']]];
        $this->withSession(['cms_user_id' => 1])->postJson('/api/releases', $payload + ['userId' => 2])->assertForbidden();
        $this->withSession(['cms_user_id' => 1])->postJson('/api/releases', $payload + ['plannedReleaseDate' => '2020-01-01'])->assertUnprocessable();
        $this->withSession(['cms_user_id' => 2])->postJson('/api/releases', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('releases', 2);
    }

    public function test_cover_upload_is_bound_to_session_and_can_be_used_once(): void
    {
        $path = null;
        try {
            $upload = $this->withSession(['cms_user_id' => 2])->postJson('/api/releases/uploads', [
                'kind' => 'cover', 'file' => UploadedFile::fake()->image('cover.jpg'),
            ])->assertOk();
            $path = $upload->json('path');
            $this->assertFileExists(dirname(base_path()).$path);

            $payload = [
                'type' => 'SINGLE', 'userId' => 1, 'title' => 'With Cover',
                'coverPath' => $path, 'tracks' => [['title' => 'Track One']],
            ];
            $this->withSession(['cms_user_id' => 2])->postJson('/api/releases', $payload)->assertCreated();
            $this->assertDatabaseHas('releases', ['title' => 'With Cover', 'cover_art' => $path]);
            $releaseId = DB::table('releases')->where('title', 'With Cover')->value('id');
            $this->withSession(['cms_user_id' => 1])->get('/api/releases/'.$releaseId.'/cover')->assertOk();
            $this->withSession(['cms_user_id' => null])->getJson('/api/releases/'.$releaseId.'/cover')->assertUnauthorized();
            $this->withSession(['cms_user_id' => 2])->postJson('/api/releases', $payload)->assertUnprocessable();
        } finally {
            if ($path && preg_match('#^/uploads/releases/vue/2/[0-9a-f-]+\.jpg$#', $path)) {
                @unlink(dirname(base_path()).$path);
            }
        }
    }

    public function test_audio_preview_is_owner_scoped_and_supports_range_requests(): void
    {
        $name = Str::uuid().'.wav';
        $relative = '/uploads/releases/vue/2/'.$name;
        $absolute = dirname(base_path()).$relative;
        if (!is_dir(dirname($absolute))) mkdir(dirname($absolute), 0750, true);
        file_put_contents($absolute, 'RIFF'.str_repeat('a', 32));
        try {
            DB::table('tracks')->insert(['id' => 20, 'release_id' => 10, 'title' => 'Audio Track', 'audio_file' => $relative]);
            $this->withSession(['cms_user_id' => 1])
                ->get('/api/releases/10/tracks/20/media/master', ['Range' => 'bytes=0-3'])
                ->assertStatus(206);
            $this->withSession(['cms_user_id' => null])
                ->getJson('/api/releases/10/tracks/20/media/master')->assertUnauthorized();
            $this->withSession(['cms_user_id' => 1])
                ->getJson('/api/releases/11/tracks/20/media/master')->assertNotFound();
        } finally {
            @unlink($absolute);
        }
    }

    public function test_admin_can_edit_and_submit_draft_without_audio_and_with_past_date(): void
    {
        $path = null;
        try {
            $path = $this->withSession(['cms_user_id' => 2])->postJson('/api/releases/uploads', [
                'kind' => 'cover', 'file' => UploadedFile::fake()->image('final-cover.png'),
            ])->assertOk()->json('path');
            $draft = [
                'type' => 'SINGLE', 'userId' => 1, 'title' => 'Editable Single',
                'coverPath' => $path, 'tracks' => [['title' => 'Editable Track']],
            ];
            $id = $this->withSession(['cms_user_id' => 2])->postJson('/api/releases', $draft)
                ->assertCreated()->json('id');
            $final = array_merge($draft, [
                'title' => 'Final Single', 'primaryArtist' => 'Final Artist', 'genre' => 'Pop',
                'language' => 'Indonesia', 'label' => 'Dimensi', 'pLine' => '2020 Dimensi',
                'cLine' => '2020 Dimensi', 'plannedReleaseDate' => '2020-01-01',
            ]);
            $this->withSession(['cms_user_id' => 2])->putJson('/api/releases/'.$id, $final)
                ->assertOk()->assertJsonPath('status', 'Draft');
            $this->withSession(['cms_user_id' => 2])->postJson('/api/releases/'.$id.'/submit', $final)
                ->assertOk()->assertJsonPath('status', 'Pending');
            $this->assertDatabaseHas('releases', ['id' => $id, 'title' => 'Final Single', 'status' => 'Pending']);
            $this->assertDatabaseHas('tracks', ['release_id' => $id, 'title' => 'Editable Track', 'audio_file' => null]);
        } finally {
            if ($path) @unlink(dirname(base_path()).$path);
        }
    }

    public function test_regular_user_final_submission_requires_audio(): void
    {
        $path = null;
        try {
            $path = $this->withSession(['cms_user_id' => 1])->postJson('/api/releases/uploads', [
                'kind' => 'cover', 'file' => UploadedFile::fake()->image('user-cover.jpg'),
            ])->assertOk()->json('path');
            $draft = ['type' => 'SINGLE', 'title' => 'User Draft', 'coverPath' => $path, 'tracks' => [['title' => 'Track']]];
            $id = $this->withSession(['cms_user_id' => 1])->postJson('/api/releases', $draft)->assertCreated()->json('id');
            $final = array_merge($draft, [
                'primaryArtist' => 'Artist', 'genre' => 'Pop', 'language' => 'Indonesia', 'label' => 'Label',
                'pLine' => '2026 Label', 'cLine' => '2026 Label', 'plannedReleaseDate' => '2030-01-01',
            ]);
            $this->withSession(['cms_user_id' => 1])->postJson('/api/releases/'.$id.'/submit', $final)
                ->assertUnprocessable()->assertJsonValidationErrors(['tracks.0.masterPath', 'tracks.0.clipPath']);
            $this->assertDatabaseHas('releases', ['id' => $id, 'status' => 'Draft']);
        } finally {
            if ($path) @unlink(dirname(base_path()).$path);
        }
    }

    public function test_only_admin_can_review_and_live_requires_upc_and_all_isrc(): void
    {
        DB::table('tracks')->insert(['id' => 30, 'release_id' => 10, 'title' => 'Review Track']);
        $this->withSession(['cms_user_id' => 1])->patchJson('/api/releases/10/review', ['status' => 'Processing', 'aggregator' => 'SoundOn'])
            ->assertForbidden();
        $this->withSession(['cms_user_id' => 2])->patchJson('/api/releases/10/review', ['status' => 'Request Edit'])
            ->assertUnprocessable();
        $this->withSession(['cms_user_id' => 2])->patchJson('/api/releases/10/review', ['status' => 'Live', 'aggregator' => 'SoundOn'])
            ->assertUnprocessable();
        $this->withSession(['cms_user_id' => 2])->patchJson('/api/releases/10/review', [
            'status' => 'Live', 'aggregator' => 'SoundOn', 'upc' => '123456789012',
            'tracks' => [['id' => 30, 'isrc' => 'IDA012345678']],
        ])->assertOk()->assertJsonPath('status', 'Live');
        $this->assertDatabaseHas('releases', ['id' => 10, 'status' => 'Live', 'upc' => '123456789012']);
        $this->assertDatabaseHas('tracks', ['id' => 30, 'isrc' => 'IDA012345678']);
    }

    public function test_release_reference_data_is_owner_scoped(): void
    {
        $this->withSession(['cms_user_id' => 1])->getJson('/api/reference/release-form')
            ->assertOk()->assertJsonPath('genres.0.name', 'Pop')->assertJsonPath('labels.0.name', 'User Label');
        $this->withSession(['cms_user_id' => 1])->getJson('/api/reference/release-form?user_id=2')->assertForbidden();
        $this->withSession(['cms_user_id' => 2])->getJson('/api/reference/release-form?user_id=1')
            ->assertOk()->assertJsonPath('labels.0.name', 'User Label');
    }

    public function test_wilayah_and_postal_code_proxy_normalize_external_data(): void
    {
        Http::fake([
            'emsifa.github.io/*' => Http::response([['id' => '32', 'name' => 'JAWA BARAT']], 200),
            'kodepos.vercel.app/*' => Http::response(['data' => [[
                'province' => 'Jawa Barat', 'city' => 'Kota Bogor', 'district' => 'Bogor Barat',
                'village' => 'Pasir Jaya', 'postalcode' => '16119',
            ]]], 200),
        ]);
        $this->getJson('/api/wilayah/provinces')->assertOk()
            ->assertJsonPath('data.0.code', '32')->assertJsonPath('data.0.name', 'JAWA BARAT');
        $this->getJson('/api/wilayah/postal-code?province=Jawa%20Barat&city=Kota%20Bogor&district=Bogor%20Barat&village=Pasir%20Jaya')
            ->assertOk()->assertJsonPath('code', '16119');
    }

    public function test_admin_can_approve_user_but_operator_or_user_cannot(): void
    {
        DB::table('users')->where('id', 1)->update(['status' => 'Pending']);
        $payload = ['status' => 'Approved', 'aggregatorPercentage' => 70, 'publishingPercentage' => 60];
        $this->withSession(['cms_user_id' => 1])->patchJson('/api/users/1', $payload)->assertForbidden();
        $this->withSession(['cms_user_id' => 2])->patchJson('/api/users/1', $payload)
            ->assertOk()->assertJsonPath('status', 'Approved');
        $this->assertDatabaseHas('users', ['id' => 1, 'status' => 'Approved', 'aggregator_percentage' => 70]);
        $this->withSession(['cms_user_id' => 2])->patchJson('/api/users/2', $payload)->assertUnprocessable();
    }

    public function test_admin_can_create_staff_and_reset_staff_password(): void
    {
        $payload = ['role' => 'Operator', 'name' => 'Operator Baru', 'email' => 'operator@example.test', 'password' => 'initial-password'];
        $this->withSession(['cms_user_id' => 1])->postJson('/api/admins', $payload)->assertForbidden();
        $id = $this->withSession(['cms_user_id' => 2])->postJson('/api/admins', $payload)
            ->assertCreated()->assertJsonPath('role', 'Operator')->json('id');
        $this->assertDatabaseHas('users', ['id' => $id, 'role' => 'Operator', 'status' => 'Active']);
        $this->withSession(['cms_user_id' => 2])->patchJson('/api/admins/'.$id.'/password', [
            'password' => 'updated-password', 'password_confirmation' => 'updated-password',
        ])->assertOk();
        $this->assertTrue(Hash::check('updated-password', (string) DB::table('users')->where('id', $id)->value('password_hash')));
    }

    public function test_contract_list_is_scoped_and_send_creates_public_signing_link(): void
    {
        DB::table('user_contracts')->insert(['id'=>1,'user_id'=>1,'contract_template_id'=>1,'version'=>1,'status'=>'GENERATED','file_name'=>'contract.docx','file_path'=>'/missing.docx','mime_type'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document','file_size'=>10,'checksum_sha256'=>str_repeat('a',64),'generated_by'=>2,'generated_at'=>now(),'is_current'=>1,'created_at'=>now(),'updated_at'=>now()]);
        $this->withSession(['cms_user_id'=>1])->getJson('/api/contracts')->assertOk()->assertJsonCount(1,'contracts');
        $response=$this->withSession(['cms_user_id'=>2])->postJson('/api/contracts/1/send')->assertOk();
        $this->assertContains($response->json('delivery.email'), ['LOGGED', 'SENT']);
        $this->assertStringContainsString('/contract/sign/',$response->json('signing_url'));
        $this->assertDatabaseHas('contract_signing_requests',['contract_id'=>1,'user_id'=>1,'status'=>'PENDING']);
        $this->assertDatabaseHas('user_contracts',['id'=>1,'status'=>'SENT']);
    }

    public function test_user_royalty_report_is_scoped_and_only_admin_can_import(): void
    {
        DB::table('report_batches')->insert(['id'=>1,'aggregator_name'=>'SoundOn','report_period'=>'2026-08-01','original_file_name'=>'report.xlsx','stored_file_path'=>'/private/report.xlsx','file_sha256'=>str_repeat('b',64),'status'=>'FINALIZED','uploaded_by'=>2,'uploaded_at'=>now(),'created_at'=>now(),'updated_at'=>now()]);
        DB::table('user_revenue_ledger')->insert(['user_id'=>1,'report_batch_id'=>1,'report_row_id'=>1,'ledger_type'=>'ROYALTY','track_title'=>'Own Track','isrc'=>'IDA012345678','quantity'=>100,'original_currency'=>'IDR','original_net_revenue'=>10000,'exchange_rate_snapshot'=>1,'gross_idr_snapshot'=>10000,'user_percentage_snapshot'=>70,'aggregator_percentage_snapshot'=>30,'user_revenue_idr'=>7000,'aggregator_revenue_idr'=>3000,'status'=>'FINALIZED','finalized_at'=>now(),'created_at'=>now()]);
        $this->withSession(['cms_user_id'=>1])->getJson('/api/reports')->assertOk()->assertJsonPath('summary.total_revenue',7000)->assertJsonCount(1,'rows.data');
        $this->withSession(['cms_user_id'=>1])->postJson('/api/reports/import',[])->assertForbidden();
        $this->withSession(['cms_user_id'=>2])->getJson('/api/reports')->assertOk()->assertJsonCount(1,'batches.data');
    }
}
