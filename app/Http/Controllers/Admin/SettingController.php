<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->buildResponseData()]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            foreach ($validated as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => $value, 'updated_at' => now()],
                );
            }
        });

        Cache::forget('settings.public');

        return response()->json(['data' => $this->buildResponseData()]);
    }

    private function buildResponseData(): array
    {
        return [
            'settings' => $this->allSettings(),
            'embed_base_url' => rtrim(config('app.url'), '/'),
        ];
    }

    private function allSettings(): array
    {
        return Setting::all()
            ->pluck('value', 'key')
            ->all();
    }
}
