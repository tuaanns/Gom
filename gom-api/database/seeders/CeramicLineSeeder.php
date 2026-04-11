<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CeramicLine;

class CeramicLineSeeder extends Seeder
{
    public function run(): void
    {
        $lines = [
            // === VIỆT NAM ===
            [
                'name' => 'Gốm Bát Tràng',
                'origin' => 'Hà Nội',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 14 - nay',
                'description' => 'Làng gốm cổ nổi tiếng nhất Việt Nam, nổi bật với men ngọc, men rạn và gốm hoa lam truyền thống.',
                'style' => 'Men ngọc, Men rạn, Hoa lam',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Biên Hòa',
                'origin' => 'Đồng Nai',
                'country' => 'Việt Nam',
                'era' => 'Đầu thế kỷ 20 - nay',
                'description' => 'Phong cách gốm mỹ thuật kết hợp giữa nghệ thuật Đông Dương và kỹ thuật phương Tây, men màu rực rỡ.',
                'style' => 'Men màu, Chạm khắc nổi',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Phù Lãng',
                'origin' => 'Bắc Ninh',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 13 - nay',
                'description' => 'Nổi tiếng với gốm men da lươn, sản phẩm mang nét mộc mạc, giản dị của vùng Kinh Bắc.',
                'style' => 'Men da lươn, Men nâu',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Chu Đậu',
                'origin' => 'Hải Dương',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 13 - 17',
                'description' => 'Dòng gốm cổ quý giá, từng được xuất khẩu sang Nhật Bản và Trung Đông. Nổi tiếng với hoa văn vẽ chìm.',
                'style' => 'Hoa lam, Men trắng ngà',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Thanh Hà',
                'origin' => 'Quảng Nam',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Làng gốm cổ bên sông Thu Bồn, gần phố cổ Hội An, nổi bật với gốm đất nung truyền thống.',
                'style' => 'Đất nung, Không men',
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Bàu Trúc',
                'origin' => 'Ninh Thuận',
                'country' => 'Việt Nam',
                'era' => 'Hàng nghìn năm',
                'description' => 'Dòng gốm Chăm cổ xưa nhất Đông Nam Á, làm hoàn toàn thủ công không dùng bàn xoay.',
                'style' => 'Thủ công, Đất nung',
                'is_featured' => true,
            ],

            // === TRUNG QUỐC ===
            [
                'name' => 'Sứ Cảnh Đức Trấn',
                'origin' => 'Giang Tây',
                'country' => 'Trung Quốc',
                'era' => 'Thế kỷ 10 - nay',
                'description' => 'Kinh đô sứ của thế giới, nổi tiếng với sứ hoa lam (Blue and White) và sứ men trắng tinh xảo.',
                'style' => 'Hoa lam, Men trắng, Ngũ thái',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Nghi Hưng (Tử Sa)',
                'origin' => 'Giang Tô',
                'country' => 'Trung Quốc',
                'era' => 'Thời Tống',
                'description' => 'Nổi tiếng thế giới với ấm trà tử sa, được làm từ đất sét đặc biệt có màu tím đỏ.',
                'style' => 'Tử sa, Không men',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Long Tuyền (Celadon)',
                'origin' => 'Chiết Giang',
                'country' => 'Trung Quốc',
                'era' => 'Thời Tống - Nguyên',
                'description' => 'Dòng men ngọc bích (celadon) nổi tiếng nhất, với lớp men xanh ngọc trong suốt tuyệt đẹp.',
                'style' => 'Men ngọc, Celadon',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Nhữ Diêu',
                'origin' => 'Hà Nam',
                'country' => 'Trung Quốc',
                'era' => 'Thời Bắc Tống',
                'description' => 'Một trong 5 đại danh lò gốm Trung Quốc, men xanh thiên thanh cực kỳ quý hiếm.',
                'style' => 'Men xanh thiên thanh',
                'is_featured' => false,
            ],

            // === NHẬT BẢN ===
            [
                'name' => 'Gốm Raku',
                'origin' => 'Kyoto',
                'country' => 'Nhật Bản',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Phong cách gốm gắn liền với trà đạo Nhật Bản, thể hiện triết lý wabi-sabi.',
                'style' => 'Raku, Wabi-sabi',
                'is_featured' => true,
            ],
            [
                'name' => 'Sứ Arita (Imari)',
                'origin' => 'Saga',
                'country' => 'Nhật Bản',
                'era' => 'Thế kỷ 17 - nay',
                'description' => 'Sứ xuất khẩu nổi tiếng của Nhật, men nhiều màu rực rỡ với hoa văn Nhật đặc trưng.',
                'style' => 'Sứ vẽ màu, Imari',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Bizen',
                'origin' => 'Okayama',
                'country' => 'Nhật Bản',
                'era' => 'Thời Kamakura',
                'description' => 'Dòng gốm không tráng men, nung ở nhiệt độ cao tạo nên vẻ đẹp tự nhiên độc đáo.',
                'style' => 'Không men, Nung củi',
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Hagi',
                'origin' => 'Yamaguchi',
                'country' => 'Nhật Bản',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Được yêu thích trong giới trà đạo, men rạn tự nhiên thay đổi theo thời gian sử dụng.',
                'style' => 'Men rạn, Trà đạo',
                'is_featured' => false,
            ],

            // === HÀN QUỐC ===
            [
                'name' => 'Gốm Celadon Goryeo',
                'origin' => 'Gangjin',
                'country' => 'Hàn Quốc',
                'era' => 'Thời Goryeo (918-1392)',
                'description' => 'Men ngọc bích hoàng gia Hàn Quốc, kỹ thuật khảm sanggam độc đáo trên thế giới.',
                'style' => 'Men ngọc, Sanggam',
                'is_featured' => true,
            ],
            [
                'name' => 'Sứ trắng Joseon',
                'origin' => 'Gwangju',
                'country' => 'Hàn Quốc',
                'era' => 'Thời Joseon (1392-1897)',
                'description' => 'Sứ trắng tinh khiết phản ánh tinh thần Nho giáo, vẽ hoa lam đậm chất Hàn Quốc.',
                'style' => 'Sứ trắng, Hoa lam',
                'is_featured' => false,
            ],

            // === THÁI LAN ===
            [
                'name' => 'Gốm Sawankhalok',
                'origin' => 'Sukhothai',
                'country' => 'Thái Lan',
                'era' => 'Thế kỷ 13 - 15',
                'description' => 'Gốm cổ Thái Lan thời Sukhothai, ảnh hưởng sâu sắc từ kỹ thuật Trung Hoa.',
                'style' => 'Men xanh celadon, Hoa văn cá',
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Bencharong',
                'origin' => 'Bangkok',
                'country' => 'Thái Lan',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Gốm hoàng gia Thái 5 màu, trang trí công phu với hoa văn truyền thống Thái.',
                'style' => 'Ngũ sắc, Hoàng gia',
                'is_featured' => true,
            ],

            // === CHÂU ÂU ===
            [
                'name' => 'Sứ Meissen',
                'origin' => 'Sachsen',
                'country' => 'Đức',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Nhà sản xuất sứ đầu tiên tại châu Âu, nổi tiếng với biểu tượng hai thanh kiếm chéo.',
                'style' => 'Sứ cứng, Vẽ tay',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Delft',
                'origin' => 'Delft',
                'country' => 'Hà Lan',
                'era' => 'Thế kỷ 17 - nay',
                'description' => 'Gốm men thiếc nổi tiếng với hoa văn xanh-trắng, lấy cảm hứng từ sứ Trung Hoa.',
                'style' => 'Men thiếc, Xanh-trắng',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Majolica',
                'origin' => 'Faenza, Deruta',
                'country' => 'Ý',
                'era' => 'Thời Phục Hưng',
                'description' => 'Gốm tráng men thiếc rực rỡ sắc màu, mang đậm phong cách nghệ thuật Phục Hưng Ý.',
                'style' => 'Men thiếc, Đa sắc',
                'is_featured' => false,
            ],
            [
                'name' => 'Sứ Limoges',
                'origin' => 'Limoges',
                'country' => 'Pháp',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Sứ cao cấp Pháp, men trắng tinh khiết và vẽ tay tinh xảo, biểu tượng xa xỉ châu Âu.',
                'style' => 'Sứ cứng, Vẽ tay',
                'is_featured' => false,
            ],
            [
                'name' => 'Sứ Wedgwood',
                'origin' => 'Staffordshire',
                'country' => 'Anh',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Thương hiệu sứ hoàng gia Anh, nổi tiếng với dòng Jasperware xanh-trắng tân cổ điển.',
                'style' => 'Jasperware, Tân cổ điển',
                'is_featured' => false,
            ],

            // === TRUNG ĐÔNG ===
            [
                'name' => 'Gốm Iznik',
                'origin' => 'Bursa',
                'country' => 'Thổ Nhĩ Kỳ',
                'era' => 'Thế kỷ 15 - 17',
                'description' => 'Gốm Ottoman vĩ đại, hoa văn hoa tulip và cẩm chướng trên men xanh-đỏ rực rỡ.',
                'style' => 'Men xanh-đỏ, Hoa tulip',
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Ba Tư (Kashan)',
                'origin' => 'Isfahan',
                'country' => 'Iran',
                'era' => 'Thế kỷ 12 - 14',
                'description' => 'Gốm men láng Ba Tư với kỹ thuật Mina\'i và Lustre, ảnh hưởng sâu rộng đến gốm Hồi giáo.',
                'style' => 'Lustre, Mina\'i',
                'is_featured' => false,
            ],

            // === CHÂU MỸ ===
            [
                'name' => 'Gốm Pueblo',
                'origin' => 'New Mexico',
                'country' => 'Hoa Kỳ',
                'era' => 'Hàng nghìn năm - nay',
                'description' => 'Gốm thổ dân Pueblo Bắc Mỹ, hoa văn hình học truyền thống trên nền đất nung.',
                'style' => 'Đất nung, Hình học',
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Talavera',
                'origin' => 'Puebla',
                'country' => 'Mexico',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Di sản UNESCO, kết hợp kỹ thuật gốm Tây Ban Nha và nghệ thuật bản địa Mexico.',
                'style' => 'Men thiếc, Đa sắc',
                'is_featured' => false,
            ],
        ];

        foreach ($lines as $line) {
            CeramicLine::create($line);
        }
    }
}
