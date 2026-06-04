<?php

namespace Database\Seeders;

use App\Models\CeramicLine;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class CeramicLineSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        CeramicLine::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        /**
         * Each key maps to the English Wikipedia article that best represents the ceramic type.
         * fetchWikiImages() calls the Wikipedia REST API concurrently and returns
         * real Wikimedia CDN thumbnail URLs — guaranteed to exist.
         */
        // Each entry is a primary article + optional fallback titles. The first one
        // that returns a thumbnail wins. This guarantees real existing images for
        // Meissen / Iznik / Goryeo where past hardcoded Wikimedia URLs went stale.
        $imgs = $this->fetchWikiImages([
            'bat_trang'   => ['Bát_Tràng'],
            'bien_hoa'    => ['Vietnamese_pottery'],
            'phu_lang'    => ['Vietnamese_pottery'],
            'chu_dau'     => ['Chu_Đậu_ceramics', 'Blue_and_white_porcelain'],
            'thanh_ha'    => ['Terracotta'],
            'bau_truc'    => ['Champa', 'Vietnamese_pottery'],
            'my_thien'    => ['Vietnamese_ceramics', 'Vietnamese_pottery'],
            'jingdezhen'  => ['Jingdezhen_porcelain'],
            'yixing'      => ['Yixing_clay_teapot'],
            'longquan'    => ['Longquan_celadon'],
            'ru_ware'     => ['Ru_ware'],
            'dehua'       => ['Dehua_porcelain', 'Blanc_de_Chine'],
            'raku'        => ['Raku_ware'],
            'arita'       => ['Arita_ware', 'Imari_ware'],
            'bizen'       => ['Bizen_ware'],
            'hagi'        => ['Hagi_ware'],
            'shigaraki'   => ['Shigaraki_ware'],
            'goryeo'      => ['Korean_celadon', 'Goryeo_celadon', 'Goryeo'],
            'joseon'      => ['Joseon_white_porcelain', 'Korean_pottery_and_porcelain'],
            'sawankhalok' => ['Sawankhalok_ware', 'Si_Satchanalai_ware'],
            'bencharong'  => ['Bencharong'],
            'meissen'     => ['Meissen_porcelain', 'Meissen'],
            'delft'       => ['Delftware'],
            'majolica'    => ['Maiolica', 'Majolica'],
            'limoges'     => ['Limoges_porcelain'],
            'wedgwood'    => ['Wedgwood'],
            'iznik'       => ['İznik_pottery', 'Iznik_pottery'],
            'persian'     => ['Persian_pottery'],
            'pueblo'      => ['Pueblo_pottery'],
            'talavera'    => ['Talavera_pottery'],
            'ndebele'     => ['Ndebele_people'],
        ]);

        $lines = [
            // === VIỆT NAM ===
            [
                'name' => 'Gốm Bát Tràng',
                'origin' => 'Hà Nội',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 14 - nay',
                'description' => 'Làng gốm cổ nổi tiếng nhất Việt Nam, nổi bật với men ngọc, men rạn và gốm hoa lam truyền thống.',
                'style' => 'Men ngọc, Men rạn, Hoa lam',
                'image_url' => $imgs['bat_trang'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Biên Hòa',
                'origin' => 'Đồng Nai',
                'country' => 'Việt Nam',
                'era' => 'Đầu thế kỷ 20 - nay',
                'description' => 'Phong cách gốm mỹ thuật kết hợp giữa nghệ thuật Đông Dương và kỹ thuật phương Tây, men màu rực rỡ.',
                'style' => 'Men màu, Chạm khắc nổi',
                'image_url' => $imgs['bien_hoa'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Phù Lãng',
                'origin' => 'Bắc Ninh',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 13 - nay',
                'description' => 'Nổi tiếng với gốm men da lươn, sản phẩm mang nét mộc mạc, giản dị của vùng Kinh Bắc.',
                'style' => 'Men da lươn, Men nâu',
                'image_url' => $imgs['phu_lang'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Chu Đậu',
                'origin' => 'Hải Dương',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 13 - 17',
                'description' => 'Dòng gốm cổ quý giá, từng được xuất khẩu sang Nhật Bản và Trung Đông. Nổi tiếng với hoa văn vẽ chìm.',
                'style' => 'Hoa lam, Men trắng ngà',
                'image_url' => $imgs['chu_dau'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Thanh Hà',
                'origin' => 'Quảng Nam',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Làng gốm cổ bên sông Thu Bồn, gần phố cổ Hội An, nổi bật với gốm đất nung truyền thống.',
                'style' => 'Đất nung, Không men',
                'image_url' => $imgs['thanh_ha'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Bàu Trúc',
                'origin' => 'Ninh Thuận',
                'country' => 'Việt Nam',
                'era' => 'Hàng nghìn năm',
                'description' => 'Dòng gốm Chăm cổ xưa nhất Đông Nam Á, làm hoàn toàn thủ công không dùng bàn xoay.',
                'style' => 'Thủ công, Đất nung',
                'image_url' => $imgs['bau_truc'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Mỹ Thiện',
                'origin' => 'Bình Dương',
                'country' => 'Việt Nam',
                'era' => 'Thế kỷ 19 - nay',
                'description' => 'Gốm sứ truyền thống tỉnh Bình Dương với kỹ thuật vẽ tay tinh xảo, màu sắc phong phú.',
                'style' => 'Men màu, Vẽ tay',
                'image_url' => $imgs['my_thien'],
                'is_featured' => false,
            ],

            // === TRUNG QUỐC ===
            [
                'name' => 'Sứ Cảnh Đức Trấn',
                'origin' => 'Giang Tây',
                'country' => 'Trung Quốc',
                'era' => 'Thế kỷ 10 - nay',
                'description' => 'Kinh đô sứ của thế giới, nổi tiếng với sứ hoa lam (Blue and White) và sứ men trắng tinh xảo.',
                'style' => 'Hoa lam, Men trắng, Ngũ thái',
                'image_url' => $imgs['jingdezhen'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Nghi Hưng (Tử Sa)',
                'origin' => 'Giang Tô',
                'country' => 'Trung Quốc',
                'era' => 'Thời Tống',
                'description' => 'Nổi tiếng thế giới với ấm trà tử sa, được làm từ đất sét đặc biệt có màu tím đỏ.',
                'style' => 'Tử sa, Không men',
                'image_url' => $imgs['yixing'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Long Tuyền (Celadon)',
                'origin' => 'Chiết Giang',
                'country' => 'Trung Quốc',
                'era' => 'Thời Tống - Nguyên',
                'description' => 'Dòng men ngọc bích (celadon) nổi tiếng nhất, với lớp men xanh ngọc trong suốt tuyệt đẹp.',
                'style' => 'Men ngọc, Celadon',
                'image_url' => $imgs['longquan'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Nhữ Diêu',
                'origin' => 'Hà Nam',
                'country' => 'Trung Quốc',
                'era' => 'Thời Bắc Tống',
                'description' => 'Một trong 5 đại danh lò gốm Trung Quốc, men xanh thiên thanh cực kỳ quý hiếm.',
                'style' => 'Men xanh thiên thanh',
                'image_url' => $imgs['ru_ware'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Đức Hóa',
                'origin' => 'Phúc Kiến',
                'country' => 'Trung Quốc',
                'era' => 'Thế kỷ 14 - nay',
                'description' => 'Sứ trắng tinh khiết Blanc de Chine, nổi tiếng với tượng Phật và đồ thờ phụng.',
                'style' => 'Blanc de Chine, Sứ trắng',
                'image_url' => $imgs['dehua'],
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
                'image_url' => $imgs['raku'],
                'is_featured' => true,
            ],
            [
                'name' => 'Sứ Arita (Imari)',
                'origin' => 'Saga',
                'country' => 'Nhật Bản',
                'era' => 'Thế kỷ 17 - nay',
                'description' => 'Sứ xuất khẩu nổi tiếng của Nhật, men nhiều màu rực rỡ với hoa văn Nhật đặc trưng.',
                'style' => 'Sứ vẽ màu, Imari',
                'image_url' => $imgs['arita'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Bizen',
                'origin' => 'Okayama',
                'country' => 'Nhật Bản',
                'era' => 'Thời Kamakura',
                'description' => 'Dòng gốm không tráng men, nung ở nhiệt độ cao tạo nên vẻ đẹp tự nhiên độc đáo.',
                'style' => 'Không men, Nung củi',
                'image_url' => $imgs['bizen'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Hagi',
                'origin' => 'Yamaguchi',
                'country' => 'Nhật Bản',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Được yêu thích trong giới trà đạo, men rạn tự nhiên thay đổi theo thời gian sử dụng.',
                'style' => 'Men rạn, Trà đạo',
                'image_url' => $imgs['hagi'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Shigaraki',
                'origin' => 'Shiga',
                'country' => 'Nhật Bản',
                'era' => 'Thế kỷ 13 - nay',
                'description' => 'Một trong 6 lò gốm cổ Nhật Bản, nổi bật với kết cấu đất thô tự nhiên và vảy tro đặc trưng.',
                'style' => 'Tro tự nhiên, Không men',
                'image_url' => $imgs['shigaraki'],
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
                'image_url' => $imgs['goryeo'],
                'is_featured' => true,
            ],
            [
                'name' => 'Sứ trắng Joseon',
                'origin' => 'Gwangju',
                'country' => 'Hàn Quốc',
                'era' => 'Thời Joseon (1392-1897)',
                'description' => 'Sứ trắng tinh khiết phản ánh tinh thần Nho giáo, vẽ hoa lam đậm chất Hàn Quốc.',
                'style' => 'Sứ trắng, Hoa lam',
                'image_url' => $imgs['joseon'],
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
                'image_url' => $imgs['sawankhalok'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Bencharong',
                'origin' => 'Bangkok',
                'country' => 'Thái Lan',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Gốm hoàng gia Thái 5 màu, trang trí công phu với hoa văn truyền thống Thái.',
                'style' => 'Ngũ sắc, Hoàng gia',
                'image_url' => $imgs['bencharong'],
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
                'image_url' => $imgs['meissen'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Delft',
                'origin' => 'Delft',
                'country' => 'Hà Lan',
                'era' => 'Thế kỷ 17 - nay',
                'description' => 'Gốm men thiếc nổi tiếng với hoa văn xanh-trắng, lấy cảm hứng từ sứ Trung Hoa.',
                'style' => 'Men thiếc, Xanh-trắng',
                'image_url' => $imgs['delft'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Majolica',
                'origin' => 'Faenza, Deruta',
                'country' => 'Ý',
                'era' => 'Thời Phục Hưng',
                'description' => 'Gốm tráng men thiếc rực rỡ sắc màu, mang đậm phong cách nghệ thuật Phục Hưng Ý.',
                'style' => 'Men thiếc, Đa sắc',
                'image_url' => $imgs['majolica'],
                'is_featured' => false,
            ],
            [
                'name' => 'Sứ Limoges',
                'origin' => 'Limoges',
                'country' => 'Pháp',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Sứ cao cấp Pháp, men trắng tinh khiết và vẽ tay tinh xảo, biểu tượng xa xỉ châu Âu.',
                'style' => 'Sứ cứng, Vẽ tay',
                'image_url' => $imgs['limoges'],
                'is_featured' => false,
            ],
            [
                'name' => 'Sứ Wedgwood',
                'origin' => 'Staffordshire',
                'country' => 'Anh',
                'era' => 'Thế kỷ 18 - nay',
                'description' => 'Thương hiệu sứ hoàng gia Anh, nổi tiếng với dòng Jasperware xanh-trắng tân cổ điển.',
                'style' => 'Jasperware, Tân cổ điển',
                'image_url' => $imgs['wedgwood'],
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
                'image_url' => $imgs['iznik'],
                'is_featured' => true,
            ],
            [
                'name' => 'Gốm Ba Tư (Kashan)',
                'origin' => 'Isfahan',
                'country' => 'Iran',
                'era' => 'Thế kỷ 12 - 14',
                'description' => 'Gốm men láng Ba Tư với kỹ thuật Mina\'i và Lustre, ảnh hưởng sâu rộng đến gốm Hồi giáo.',
                'style' => 'Lustre, Mina\'i',
                'image_url' => $imgs['persian'],
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
                'image_url' => $imgs['pueblo'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Talavera',
                'origin' => 'Puebla',
                'country' => 'Mexico',
                'era' => 'Thế kỷ 16 - nay',
                'description' => 'Di sản UNESCO, kết hợp kỹ thuật gốm Tây Ban Nha và nghệ thuật bản địa Mexico.',
                'style' => 'Men thiếc, Đa sắc',
                'image_url' => $imgs['talavera'],
                'is_featured' => false,
            ],

            // === CHÂU PHI & KHÁC ===
            [
                'name' => 'Gốm Ndebele',
                'origin' => 'Zimbabwe',
                'country' => 'Zimbabwe',
                'era' => 'Thế kỷ 19 - nay',
                'description' => 'Gốm truyền thống của người Ndebele với hoa văn hình học đậm màu sắc sặc sỡ đặc trưng châu Phi.',
                'style' => 'Hình học, Đa sắc',
                'image_url' => $imgs['ndebele'],
                'is_featured' => false,
            ],
            [
                'name' => 'Gốm Raku Đương Đại',
                'origin' => 'Toàn cầu',
                'country' => 'Quốc tế',
                'era' => 'Thế kỷ 20 - nay',
                'description' => 'Phong trào gốm Raku đương đại kết hợp kỹ thuật Nhật Bản cổ điển với tư duy nghệ thuật hiện đại.',
                'style' => 'Đương đại, Thử nghiệm',
                'image_url' => $imgs['raku'],
                'is_featured' => false,
            ],
        ];

        $names = [
            'Gốm Bát Tràng' => 'Bat Trang Ceramics',
            'Gốm Biên Hòa' => 'Bien Hoa Ceramics',
            'Gốm Phù Lãng' => 'Phu Lang Ceramics',
            'Gốm Chu Đậu' => 'Chu Dau Ceramics',
            'Gốm Thanh Hà' => 'Thanh Ha Ceramics',
            'Gốm Bàu Trúc' => 'Bau Truc Ceramics',
            'Gốm Mỹ Thiện' => 'My Thien Ceramics',
            'Sứ Cảnh Đức Trấn' => 'Jingdezhen Porcelain',
            'Gốm Nghi Hưng (Tử Sa)' => 'Yixing Clay (Zisha)',
            'Gốm Long Tuyền (Celadon)' => 'Longquan Celadon',
            'Gốm Nhữ Diêu' => 'Ru Ware',
            'Gốm Đức Hóa' => 'Dehua Porcelain',
            'Gốm Raku' => 'Raku Ware',
            'Sứ Arita (Imari)' => 'Arita Ware (Imari)',
            'Gốm Bizen' => 'Bizen Ware',
            'Gốm Hagi' => 'Hagi Ware',
            'Gốm Shigaraki' => 'Shigaraki Ware',
            'Gốm Celadon Goryeo' => 'Goryeo Celadon',
            'Sứ trắng Joseon' => 'Joseon White Porcelain',
            'Gốm Sawankhalok' => 'Sawankhalok Ware',
            'Gốm Bencharong' => 'Bencharong',
            'Sứ Meissen' => 'Meissen Porcelain',
            'Gốm Delft' => 'Delftware',
            'Gốm Majolica' => 'Majolica',
            'Sứ Limoges' => 'Limoges Porcelain',
            'Sứ Wedgwood' => 'Wedgwood Porcelain',
            'Gốm Iznik' => 'Iznik Pottery',
            'Gốm Ba Tư (Kashan)' => 'Persian Pottery (Kashan)',
            'Gốm Pueblo' => 'Pueblo Pottery',
            'Gốm Talavera' => 'Talavera Pottery',
            'Gốm Ndebele' => 'Ndebele Pottery',
            'Gốm Raku Đương Đại' => 'Contemporary Raku',
        ];

        $origins = [
            'Hà Nội' => 'Hanoi',
            'Đồng Nai' => 'Dong Nai',
            'Bắc Ninh' => 'Bac Ninh',
            'Hải Dương' => 'Hai Duong',
            'Quảng Nam' => 'Quang Nam',
            'Ninh Thuận' => 'Ninh Thuan',
            'Bình Dương' => 'Binh Duong',
            'Giang Tây' => 'Jiangxi',
            'Giang Tô' => 'Jiangsu',
            'Chiết Giang' => 'Zhejiang',
            'Hà Nam' => 'Henan',
            'Phúc Kiến' => 'Fujian',
            'Kyoto' => 'Kyoto',
            'Saga' => 'Saga',
            'Okayama' => 'Okayama',
            'Yamaguchi' => 'Yamaguchi',
            'Shiga' => 'Shiga',
            'Gangjin' => 'Gangjin',
            'Gwangju' => 'Gwangju',
            'Sukhothai' => 'Sukhothai',
            'Bangkok' => 'Bangkok',
            'Sachsen' => 'Saxony',
            'Delft' => 'Delft',
            'Faenza, Deruta' => 'Faenza, Deruta',
            'Limoges' => 'Limoges',
            'Staffordshire' => 'Staffordshire',
            'Bursa' => 'Bursa',
            'Isfahan' => 'Isfahan',
            'New Mexico' => 'New Mexico',
            'Puebla' => 'Puebla',
            'Zimbabwe' => 'Zimbabwe',
            'Toàn cầu' => 'Global',
        ];

        $countries = [
            'Việt Nam' => 'Vietnam',
            'Trung Quốc' => 'China',
            'Nhật Bản' => 'Japan',
            'Hàn Quốc' => 'South Korea',
            'Thái Lan' => 'Thailand',
            'Đức' => 'Germany',
            'Hà Lan' => 'Netherlands',
            'Ý' => 'Italy',
            'Pháp' => 'France',
            'Anh' => 'United Kingdom',
            'Thổ Nhĩ Kỳ' => 'Turkey',
            'Iran' => 'Iran',
            'Hoa Kỳ' => 'United States',
            'Mexico' => 'Mexico',
            'Quốc tế' => 'International',
        ];

        $eras = [
            'Thế kỷ 14 - nay' => '14th century - present',
            'Đầu thế kỷ 20 - nay' => 'Early 20th century - present',
            'Thế kỷ 13 - nay' => '13th century - present',
            'Thế kỷ 13 - 17' => '13th - 17th century',
            'Thế kỷ 16 - nay' => '16th century - present',
            'Hàng nghìn năm' => 'Thousands of years',
            'Thế kỷ 19 - nay' => '19th century - present',
            'Thế kỷ 10 - nay' => '10th century - present',
            'Thời Tống' => 'Song dynasty',
            'Thời Tống - Nguyên' => 'Song - Yuan dynasty',
            'Thời Bắc Tống' => 'Northern Song dynasty',
            'Thời Kamakura' => 'Kamakura period',
            'Thời Goryeo (918-1392)' => 'Goryeo dynasty (918-1392)',
            'Thời Joseon (1392-1897)' => 'Joseon dynasty (1392-1897)',
            'Thế kỷ 13 - 15' => '13th - 15th century',
            'Thế kỷ 18 - nay' => '18th century - present',
            'Thế kỷ 17 - nay' => '17th century - present',
            'Thời Phục Hưng' => 'Renaissance period',
            'Thế kỷ 15 - 17' => '15th - 17th century',
            'Thế kỷ 12 - 14' => '12th - 14th century',
            'Hàng nghìn năm - nay' => 'Thousands of years - present',
            'Thế kỷ 20 - nay' => '20th century - present',
        ];

        $styles = [
            'Men ngọc, Men rạn, Hoa lam' => 'Celadon, Cracked glaze, Blue-and-white',
            'Men màu, Chạm khắc nổi' => 'Colored glazes, Relief carving',
            'Men da lươn, Men nâu' => 'Eel-skin glaze, Brown glaze',
            'Hoa lam, Men trắng ngà' => 'Blue-and-white, Ivory white glaze',
            'Đất nung, Không men' => 'Terracotta, Unglazed',
            'Thủ công, Đất nung' => 'Handcrafted, Terracotta',
            'Men màu, Vẽ tay' => 'Colored glazes, Hand-painted',
            'Hoa lam, Men trắng, Ngũ thái' => 'Blue-and-white, White glaze, Wucai',
            'Tử sa, Không men' => 'Zisha (purple clay), Unglazed',
            'Men ngọc, Celadon' => 'Celadon',
            'Men xanh thiên thanh' => 'Sky blue glaze',
            'Blanc de Chine, Sứ trắng' => 'Blanc de Chine, White porcelain',
            'Raku, Wabi-sabi' => 'Raku, Wabi-sapi',
            'Sứ vẽ màu, Imari' => 'Painted porcelain, Imari',
            'Không men, Nung củi' => 'Unglazed, Wood-fired',
            'Men rạn, Trà đạo' => 'Cracked glaze, Tea ceremony',
            'Tro tự nhiên, Không men' => 'Natural ash glaze, Unglazed',
            'Men ngọc, Sanggam' => 'Celadon, Sanggam (inlaid)',
            'Sứ trắng, Hoa lam' => 'White porcelain, Blue-and-white',
            'Men xanh celadon, Hoa văn cá' => 'Celadon, Fish motifs',
            'Ngũ sắc, Hoàng gia' => 'Bencharong (5 colors), Royal',
            'Sứ cứng, Vẽ tay' => 'Hard-paste porcelain, Hand-painted',
            'Men thiếc, Xanh-trắng' => 'Tin-glazed, Blue-and-white',
            'Men thiếc, Đa sắc' => 'Tin-glazed, Polychrome',
            'Jasperware, Tân cổ điển' => 'Jasperware, Neoclassical',
            'Men xanh-đỏ, Hoa tulip' => 'Blue-and-red glaze, Tulip motifs',
            'Lustre, Mina\'i' => 'Lustre ware, Mina\'i',
            'Đất nung, Hình học' => 'Terracotta, Geometric motifs',
            'Hình học, Đa sắc' => 'Geometric patterns, Polychrome',
            'Đương đại, Thử nghiệm' => 'Contemporary, Experimental',
        ];

        $descriptions = [
            'Làng gốm cổ nổi tiếng nhất Việt Nam, nổi bật với men ngọc, men rạn và gốm hoa lam truyền thống.' => 'The most famous ancient ceramic village in Vietnam, famous for its traditional celadon, crackle glaze, and blue-and-white ceramics.',
            'Phong cách gốm mỹ thuật kết hợp giữa nghệ thuật Đông Dương và kỹ thuật phương Tây, men màu rực rỡ.' => 'Artistic ceramic style combining Indochinese art and Western techniques, featuring vibrant colored glazes.',
            'Nổi tiếng với gốm men da lươn, sản phẩm mang nét mộc mạc, giản dị của vùng Kinh Bắc.' => 'Famous for its eel-skin glazed ceramics, presenting the rustic and simple character of Kinh Bac region.',
            'Dòng gốm cổ quý giá, từng được xuất khẩu sang Nhật Bản và Trung Đông. Nổi tiếng với hoa văn vẽ chìm.' => 'A precious ancient ceramic line, once exported to Japan and the Middle East. Renowned for its underglaze designs.',
            'Làng gốm cổ bên sông Thu Bồn, gần phố cổ Hội An, nổi bật với gốm đất nung truyền thống.' => 'An ancient pottery village by Thu Bon river, near Hoi An ancient town, famous for its traditional terracotta.',
            'Dòng gốm Chăm cổ xưa nhất Đông Nam Á, làm hoàn toàn thủ công không dùng bàn xoay.' => 'The oldest Cham ceramic line in Southeast Asia, made entirely by hand without a potter\'s wheel.',
            'Gốm sứ truyền thống tỉnh Bình Dương với kỹ thuật vẽ tay tinh xảo, màu sắc phong phú.' => 'Traditional ceramics of Binh Duong province with delicate hand-painted techniques and rich colors.',
            'Kinh đô sứ của thế giới, nổi tiếng với sứ hoa lam (Blue and White) và sứ men trắng tinh xảo.' => 'The porcelain capital of the world, famous for blue-and-white porcelain and exquisite white porcelain.',
            'Nổi tiếng thế giới với ấm trà tử sa, được làm từ đất sét đặc biệt có màu tím đỏ.' => 'World-famous for Yixing purple clay teapots, crafted from a special reddish-purple clay.',
            'Dòng men ngọc bích (celadon) nổi tiếng nhất, với lớp men xanh ngọc trong suốt tuyệt đẹp.' => 'The most famous celadon ceramic line, featuring a beautiful translucent green jade glaze.',
            'Một trong 5 đại danh lò gốm Trung Quốc, men xanh thiên thanh cực kỳ quý hiếm.' => 'One of the five famous great kilns of China, featuring an extremely rare sky-blue glaze.',
            'Sứ trắng tinh khiết Blanc de Chine, nổi tiếng với tượng Phật và đồ thờ phụng.' => 'Pure white Blanc de Chine porcelain, famous for Buddhist statues and ritual items.',
            'Phong cách gốm gắn liền với trà đạo Nhật Bản, thể hiện triết lý wabi-sabi.' => 'Ceramic style closely linked to the Japanese tea ceremony, embodying the philosophy of wabi-sabi.',
            'Sứ xuất khẩu nổi tiếng của Nhật, men nhiều màu rực rỡ với hoa văn Nhật đặc trưng.' => 'Famous Japanese export porcelain, featuring brilliant polychrome glazes with distinctive Japanese motifs.',
            'Dòng gốm không tráng men, nung ở nhiệt độ cao tạo nên vẻ đẹp tự nhiên độc đáo.' => 'An unglazed ceramic line fired at high temperatures, creating unique natural beauty.',
            'Được yêu thích trong giới trà đạo, men rạn tự nhiên thay đổi theo thời gian sử dụng.' => 'Highly favored in tea ceremony circles, featuring a natural crackle glaze that changes over time with use.',
            'Một trong 6 lò gốm cổ Nhật Bản, nổi bật với kết cấu đất thô tự nhiên và vảy tro đặc trưng.' => 'One of the Six Ancient Kilns of Japan, distinguished by its natural coarse clay texture and characteristic ash flakes.',
            'Men ngọc bích hoàng gia Hàn Quốc, kỹ thuật khảm sanggam độc đáo trên thế giới.' => 'Korean royal jade celadon, featuring the world\'s unique sanggam inlay technique.',
            'Sứ trắng tinh khiết phản ánh tinh thần Nho giáo, vẽ hoa lam đậm chất Hàn Quốc.' => 'Pure white porcelain reflecting Confucian spirit, decorated with blue-and-white designs of distinct Korean character.',
            'Gốm cổ Thái Lan thời Sukhothai, ảnh hưởng sâu sắc từ kỹ thuật Trung Hoa.' => 'Ancient Thai ceramics of the Sukhothai period, heavily influenced by Chinese techniques.',
            'Gốm hoàng gia Thái 5 màu, trang trí công phu với hoa văn truyền thống Thái.' => 'Thai royal five-color ceramics, elaborately decorated with traditional Thai patterns.',
            'Nhà sản xuất sứ đầu tiên tại châu Âu, nổi tiếng với biểu tượng hai thanh kiếm chéo.' => 'The first manufacturer of porcelain in Europe, famous for its crossed swords logo.',
            'Gốm men thiếc nổi tiếng với hoa văn xanh-trắng, lấy cảm hứng từ sứ Trung Hoa.' => 'Tin-glazed earthenware famous for blue-and-white designs, inspired by Chinese porcelain.',
            'Gốm tráng men thiếc rực rỡ sắc màu, mang đậm phong cách nghệ thuật Phục Hưng Ý.' => 'Brightly colored tin-glazed earthenware, reflecting the artistic style of the Italian Renaissance.',
            'Sứ cao cấp Pháp, men trắng tinh khiết và vẽ tay tinh xảo, biểu tượng xa xỉ châu Âu.' => 'Premium French porcelain, featuring pure white glaze and exquisite hand-painting, a symbol of European luxury.',
            'Thương hiệu sứ hoàng gia Anh, nổi tiếng với dòng Jasperware xanh-trắng tân cổ điển.' => 'British royal porcelain brand, famous for its neoclassical blue-and-white Jasperware line.',
            'Gốm Ottoman vĩ đại, hoa văn hoa tulip và cẩm chướng trên men xanh-đỏ rực rỡ.' => 'Magnificent Ottoman pottery, featuring tulip and carnation motifs on brilliant blue-and-red glaze.',
            'Gốm men láng Ba Tư với kỹ thuật Mina\'i và Lustre, ảnh hưởng sâu rộng đến gốm Hồi giáo.' => 'Persian glazed ceramics using Mina\'i and Lustre techniques, deeply influencing Islamic pottery.',
            'Gốm thổ dân Pueblo Bắc Mỹ, hoa văn hình học truyền thống trên nền đất nung.' => 'North American Pueblo Native pottery, decorated with traditional geometric designs on a terracotta body.',
            'Di sản UNESCO, kết hợp kỹ thuật gốm Tây Ban Nha và nghệ thuật bản địa Mexico.' => 'A UNESCO World Heritage craft, combining Spanish glazing techniques with native Mexican art.',
            'Gốm truyền thống của người Ndebele với hoa văn hình học đậm màu sắc sặc sỡ đặc trưng châu Phi.' => 'Traditional Ndebele pottery featuring vibrant, colorful geometric patterns characteristic of Africa.',
            'Phong trào gốm Raku đương đại kết hợp kỹ thuật Nhật Bản cổ điển với tư duy nghệ thuật hiện đại.' => 'Contemporary Raku movement combining classic Japanese techniques with modern artistic concepts.',
        ];

        foreach ($lines as $line) {
            $line['name_en'] = $names[$line['name']] ?? null;
            $line['origin_en'] = $origins[$line['origin']] ?? null;
            $line['country_en'] = $countries[$line['country']] ?? null;
            $line['era_en'] = $eras[$line['era']] ?? null;
            $line['style_en'] = $styles[$line['style']] ?? null;
            $line['description_en'] = $descriptions[$line['description']] ?? null;

            CeramicLine::create($line);
        }
    }

    /**
     * Fetch Wikipedia thumbnail images.
     *
     * Accepts either string (single article title) or array (article + fallback titles)
     * per key. The first article whose Wikipedia summary returns a thumbnail wins.
     * Falls back to a generic ceramic photo on full failure.
     */
    private function fetchWikiImages(array $keyMap): array
    {
        $fallback = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800';
        $result = [];

        // Normalize: every value becomes an array of titles to try in order.
        $tries = [];
        foreach ($keyMap as $key => $value) {
            $tries[$key] = is_array($value) ? array_values($value) : [(string) $value];
        }

        // Issue all FIRST-choice requests in parallel; collect misses.
        $firstTitles = array_map(fn ($arr) => $arr[0], $tries);
        $firstResp = $this->fetchSummariesPool(array_values($firstTitles));

        $keys = array_keys($tries);
        $misses = [];
        foreach ($keys as $i => $key) {
            $resp = $firstResp[$i] ?? null;
            $src = $this->extractThumb($resp);
            if ($src) {
                $result[$key] = $src;
            } else {
                $misses[$key] = array_slice($tries[$key], 1); // fallback titles
            }
        }

        // For each miss, try fallback titles sequentially (still bounded — at most 1-2 each).
        foreach ($misses as $key => $fallbackTitles) {
            $found = null;
            foreach ($fallbackTitles as $title) {
                $single = $this->fetchSummariesPool([$title]);
                $src = $this->extractThumb($single[0] ?? null);
                if ($src) {
                    $found = $src;
                    break;
                }
            }
            $result[$key] = $found ?: $fallback;
        }

        return $result;
    }

    /** Pool a list of Wikipedia summary requests. */
    private function fetchSummariesPool(array $titles): array
    {
        if (empty($titles)) return [];
        try {
            return Http::pool(function ($pool) use ($titles) {
                return array_map(
                    fn ($t) => $pool->withoutVerifying()->timeout(8)
                        ->withHeaders(['User-Agent' => 'GomApp-Seeder/1.0 (ceramic-db-seed)'])
                        ->get('https://en.wikipedia.org/api/rest_v1/page/summary/' . urlencode($t)),
                    $titles
                );
            });
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Pull thumbnail.source from a Wikipedia summary response, returning null if missing. */
    private function extractThumb($resp): ?string
    {
        if (!$resp || $resp instanceof \Throwable || !method_exists($resp, 'ok') || !$resp->ok()) {
            return null;
        }
        $src = $resp->json()['thumbnail']['source'] ?? null;
        return $src ?: null;
    }
}
