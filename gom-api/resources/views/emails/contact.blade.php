<!DOCTYPE html>
<html>
<head>
    <title>Tin nhắn liên hệ mới</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #0F265C;">Có một tin nhắn liên hệ mới từ The Archivist Web</h2>
    <p><strong>Họ và tên:</strong> {{ $contactData['name'] }}</p>
    <p><strong>Email người gửi:</strong> {{ $contactData['email'] }}</p>
    <p><strong>Chủ đề:</strong> {{ $contactData['subject'] }}</p>
    <hr>
    <p><strong>Nội dung:</strong></p>
    <p style="white-space: pre-wrap;">{{ $contactData['message'] }}</p>
</body>
</html>
