<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$imgs = [
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1604076913837-52ab5f21fdaf?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1594751543129-6701ad444259?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1612198188407-72af6ad5bca3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=400&h=300&fit=crop',
];

$lines = \App\Models\CeramicLine::all();
foreach ($lines as $i => $line) {
    $line->update(['image_url' => $imgs[$i % count($imgs)]]);
}
echo "Updated " . count($lines) . " ceramic lines with images.\n";
