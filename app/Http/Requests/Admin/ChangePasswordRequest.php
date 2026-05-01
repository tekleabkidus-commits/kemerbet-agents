<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Validator;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $admin = $this->user();

                if (! Hash::check($this->current_password, $admin->password)) {
                    $validator->errors()->add('current_password', 'Current password is incorrect.');
                }

                if (Hash::check($this->new_password, $admin->password)) {
                    $validator->errors()->add('new_password', 'New password must differ from current.');
                }
            },
        ];
    }
}
