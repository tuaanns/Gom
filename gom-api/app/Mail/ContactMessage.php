<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactMessage extends Mailable
{
    use Queueable, SerializesModels;

    public $contactData;

    public function __construct($data)
    {
        $this->contactData = $data;
    }

    public function build()
    {
        return $this->subject('Tin nhắn liên hệ mới: ' . $this->contactData['subject'])
                    ->view('emails.contact');
    }
}
