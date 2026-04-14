<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\ContactMessage;

class ContactController extends Controller
{
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string',
        ]);

        $subject = $validated['subject'] ?: 'Không có chủ đề';
        $validated['subject'] = $subject;

        $targetEmail = env('MAIL_USERNAME', 'dongnguyenkh123@gmail.com');

        try {
            Mail::to($targetEmail)->send(new ContactMessage($validated));
            return response()->json(['success' => true, 'message' => 'Email sent successfully']);
        } catch (\Exception $e) {
            \Log::error('Mail sending failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to send email: ' . $e->getMessage()], 500);
        }
    }
}
