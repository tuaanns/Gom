<?php

namespace App\Http\Requests\Prediction;

use Illuminate\Foundation\Http\FormRequest;

class PredictRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'model' => ['nullable', 'string', 'in:gemini,gemini3,gemini_lite,llama4'],
            'lang'  => ['nullable', 'string', 'in:vi,en'],
            'is_async' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Vui lòng tải ảnh hiện vật.',
            'image.image'    => 'File phải là hình ảnh.',
            'image.mimes'    => 'Định dạng cho phép: JPG, PNG, WEBP.',
            'image.max'      => 'Kích thước tối đa 10MB.',
        ];
    }
}
