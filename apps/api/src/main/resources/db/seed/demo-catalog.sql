-- Demo catalog seed — chạy bằng ./scripts/seed.sh (KHÔNG phải Flyway migration).
-- Sinh tự động từ ảnh Shopee thật; idempotent; bảng users được GIỮ NGUYÊN.
BEGIN;

TRUNCATE cart_items, carts, related_products, product_images, product_variants,
         products, categories, coupons RESTART IDENTITY CASCADE;

-- categories
INSERT INTO categories (id, name, slug, position) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Đồ mặc', 'apparel', 0),
  ('11111111-1111-1111-1111-111111111102', 'Phụ kiện', 'accessories', 1),
  ('11111111-1111-1111-1111-111111111103', 'Đồ lót & định hình', 'underwear', 2);

-- products — giá = minor units ×100 (ADR 0003 VND)
INSERT INTO products (id, name, slug, description, short_description, status, category_id, created_at) VALUES
  ('66666666-6666-6666-6666-000000000001', 'Áo khoác thể thao zip', 'ao-khoac-the-thao', 'Áo khoác chống nắng tia UV tay dài bằng vải lụa lạnh thoáng khí họ nu ôm body
-Tữun co giãn 4 chiều cực kỳ thoải mái

Xuất xứ: Trung Quốc (Xuất xứ)
Dành cho: Unisex
Xuất xứ: Trung Quốc
Kích thước:
Chiều dài tay áo (82cm)
Chiều dài (64cm)
Cân nặng thích hợp (45-70kg)

1. Không thể tránh khỏi sự khác biệt về màu sắc vì màn hình máy tính và màn hình điện thoại di động của mọi người là khác nhau
2. Ngoài ra cũng không thể tránh khỏi đối với sai số kích thước khoảng 1~3 cm do đo lường thủ công.
Nếu bạn phiền, xin vui lòng không đặt hàng, cảm ơn bạn đã hợp tác!

Nếu bạn có bất kỳ câu hỏi nào, xin vui lòng liên hệ bộ phận chăm sóc khách hàng!
Chúng tôi sẽ giao hàng trong thời gian sớm nhất.
*Các cậu nhận được hàng đừng quên quay video unbox sản phẩm để được hỗ trợ tốt nhất nhé ạ .
Hi vọng sẽ làm hài lòng các nàng, chúc các nàng mua sắm vui vẻ !', 'Áo khoác chống nắng tia UV tay dài bằng vải lụa lạnh thoáng khí họ nu ôm body', 'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '28 days'),
  ('66666666-6666-6666-6666-000000000002', 'Áo thể thao Hanabi', 'ao-the-thao-hanabi', 'Thiết kế liền mạch, hấp dẫn và quyến rũ.
Chất liệu mềm mại, vải thoáng khí, tạo cảm giác thoải mái khi mặc.
Thiết kế gợi cảm và thời trang giúp bạn trở nên quyến rũ hơn.
Loại sản phẩm: Áo ngực kiểu Pháp.

THÔNG TIN SẢN PHẨM
Chất liệu: BÔNG + Nylon
Phong cách: Gợi cảm, Thời trang, Đẩy lên.
Màu Sắc: Đen, Da, Hồng, Xanh
Size: M ( 40-50Kg) - L (50-60Kg) - XL (60-70Kg)', 'Thiết kế liền mạch, hấp dẫn và quyến rũ.', 'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '27 days'),
  ('66666666-6666-6666-6666-000000000003', 'Áo croptop chống nắng cánh dơi', 'ao-croptop-chong-nang', 'PHÂN BIỆT ÁO LOẠI 1

-   MẶC CẢ NGÀY KO ĐỔ MỒ HÔI
-   CHẤT VẢI SỜ VÀO LÁNG MỊN, NẶNG TAY
-   PHOM ÁO MAY ĐẸP, GỌN
-    TAY ÁO DÀI TAI CHE ĐC CẢ BÀN TAY
-    ÁO CÓ MAY THOÁT HƠI HƠI BÊN THÂN
-    DÂY KÉO MƯỢT MÀ, KO RÍT

Áo khoác chống nắng tia UV tay dài có mũ trùm đầu bằng vải lụa lạnh thoáng khí

Xuất xứ: Trung Quốc (Xuất xứ)
Dành cho: Unisex
Xuất xứ: Trung Quốc
Kích thước:
Chiều dài tay áo (82cm)
Chiều dài (64cm)
Cân nặng thích hợp (40-65kg)

Nếu bạn cần mua trên 10 sản phẩm, bạn có thể tham khảo ý kiến của chúng tôi để có giá tốt hơn!!

1. Không thể tránh khỏi sự khác biệt về màu sắc vì màn hình máy tính và màn hình điện thoại di động của mọi người là khác nhau
2. Ngoài ra cũng không thể tránh khỏi đối với sai số kích thước khoảng 1~3 cm do đo lường thủ công.
Nếu bạn phiền, xin vui lòng không đặt hàng, cảm ơn bạn đã hợp tác!

Nếu bạn có bất kỳ câu hỏi nào, xin vui lòng liên hệ bộ phận chăm sóc khách hàng!
Chúng tôi sẽ giao hàng trong thời gian sớm nhất.
*Các cậu nhận được hàng đừng quên quay video unbox sản phẩm để được hỗ trợ tốt nhất nhé ạ .
Hi vọng sẽ làm hài lòng các nàng, chúc các nàng mua sắm vui vẻ !', 'PHÂN BIỆT ÁO LOẠI 1', 'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '26 days'),
  ('66666666-6666-6666-6666-000000000004', 'Quần độn mỏng cạp cao chất su mịn', 'quan-don-mong-cap-cao', 'Quần độn mông gen bụng nữ, quần nịt bụng nâng mông độn mông lên dáng tự nhiên không bị lộ 2in1
MÔ TẢ SẢN PHẨM:
-  Thiết kế quyến rũ: Với vòng 3 khiêm tốn, các bạn nữ e ngại khi diện đồ bó sát và không được sexy như mong muốn !! Hiểu được nhu cầu đó nên nhà HANABI đã có sản phẩm quần chip độn mông và hông, giúp các nàng giảm bớt lo lắng về vòng 3 không như mong muốn của mình.

-  Quần độn mông hông gen bụng su đúc dạng đùi 2in1 giúp bạn tăng kích cỡ vòng mông hông lên 2-3 cm, đồng thời thon gọn vòng eo.
-
Quần chất liệu mút ép cao cấp, thoáng khí, siêu nhẹ, chị em có thể xuống nước tung tăng mà không bị nặng nề.

Đặc biệt, quần lót độn mông hông nữ có miếng đệm mông đúc su liền khối nên tạo cảm giác tự nhiên như thật, chạy nhảy cả ngày thoải mái mà không bị xô lệch. Đây là ưu điểm vượt trội giúp mẫu quần độn mông hông này luôn giữ vững vị trí bán chạy nhất hiện nay.

-  Thiết kế dạng đùi giúp bạn có thể vừa độn mông vừa kín đáo như quần đùi mặc váy, hoàn toàn tự tin khi mặc các trang phục mỏng, ôm sát vòng mông và thoải mái với quần jean, váy body ôm sát, váy công sở... Mặc em này vào sẽ tôn dáng thêm cho chị em thêm vài điểm, thu hút ánh nhìn của cánh mày râu vì đường cong hút hồn mà không sợ lộ. Bên cạnh đó, chị em lại có ngay vòng eo thu gọn vài phân, tạo đường cong chữ S quyến rũ hơn.
Quần độn mông su đúc gen bụng cạp cao thông hơi, thoáng khí, mặc thoải mái cả ngày mùa hè mà không sợ bí nóng.
Chất liệu vải Lycra mềm mại, mát lạnh kháng khuẩn cao cấp.
Nhà HANABI về 2 màu với 3 sz cho các nàng thoải mái lựa chọn:
-  Size:  S (38-45Kg)    M ( 46-50kg)     L ( > 50kg)
-  Màu sắc: Da, Đen.

⚡ Hướng dẫn sử dụng:
- Không giặt nước nóng;
- Không sử dụng bột giặt có chất tẩy cao;
- Không được giặt khô;
- Không được sấy nóng;
- Không được là/ủi.

HANABI Cam kết:
– Sản phẩm cam kết chất lượng cao, an toàn cho người tiêu dùng.
– Hàng thật giống hình 100%.
– Tư vấn nhiệt tình và vui vẻ.', 'Quần độn mông gen bụng nữ, quần nịt bụng nâng mông độn mông lên dáng tự nhiên không bị lộ 2in1', 'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '25 days'),
  ('66666666-6666-6666-6666-000000000005', 'Set 5 đôi tất Hanabi', 'set-tat-hanabi-5-doi', 'Sét 5 Đôi Tất / Vớ Nữ  HANABI Gấu Trắng Cổ Cao Phong Cách Hàn Quốc.

THÔNG TIN SẢN PHẨM:

- Tất hay còn được gọi là vớ chân, bít tất là phụ kiện thời trang có mặt trong tủ đồ của mọi người tiêu dùng.
- Tất chân thường được sử dụng với mục đích giữ ấm bàn chân, bảo vệ sức khỏe hoặc đơn giản là thấm hút mồ hôi trong quá trình bạn đi giày.
- Tất vớ đi kèm với các loại giày tránh đau chân, hạn chế hôi chân và làm thoải mái chân.
- Thời trang, các loại tất vớ thời trang làm tôn lên vẻ đẹp của người sử dụng.

ƯU ĐIỂM CỦA SẢN PHẨM:

- Thiết kế tinh tế cực kỳ đáng yêu, trẻ trung, năng động và đặc biệt rất thời trang
- Tất vớ mỏng thoáng, phần chun mảnh không gây hằn, đau khi sử dụng
- Tất vớ được làm từ chất liệu 100% cotton giúp khử mùi kháng khuẩn rất tốt
- Chất liệu vải mềm, nhẹ, co giãn 4 chiều, thấm hút mồ hơi cực tốt
- Tất - vớ mềm mại, thấm hút mồ hôi mang lại cảm giác mát mẻ khô thoáng suốt 4 mùa
- Chất vải mịn màng, không bị xù lông khi sử dụng', 'Sét 5 Đôi Tất / Vớ Nữ  HANABI Gấu Trắng Cổ Cao Phong Cách Hàn Quốc.', 'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '24 days'),
  ('66666666-6666-6666-6666-000000000006', 'Khẩu trang chống nắng UV UPF50', 'khau-trang-chong-nang-uv', 'Sản Phẩm: Khẩu trang chống nắng chống tia UV UPF50+, mặt nạ chống nắng vải lụa băng thoáng khí bảo vệ da mặt

- Màu sắc: Đen, Hồng, Xám, Ghi

- Size: Ngang 24, Cao 14, Có dây rút điều chỉnh phù hợp mọi kích thước mặt

- Chất liệu: Lụa Băng
Khẩu trang vải chống nắng chống tia UV UPF50+ là sản phẩm không thể thiếu cho những ai thường xuyên di chuyển ngoài trời nắng nóng. Được thiết kế với kiểu dáng ôm sát khuôn mặt, khẩu trang giúp che chắn toàn bộ phần mặt, cổ và tai, bảo vệ da khỏi tác hại của tia UV, bụi bẩn và các tác nhân gây hại khác từ môi trường.

🔥 Đặc điểm nổi bật:

-  Chống nắng hiệu quả: Chất liệu vải cao cấp với khả năng chống tia UV UPF 50+, giúp bảo vệ da khỏi 98% tia UV, ngăn ngừa tình trạng nám da, tàn nhang, lão hóa da và ung thư da. 🙂
- Thoáng mát và thoải mái: Chất liệu vải mềm mại, thoáng khí, giúp thoát mồ hôi nhanh chóng, tạo cảm giác thoải mái khi sử dụng trong thời gian dài. 😂
Thiết kế ôm sát: Kiểu dáng ôm sát khuôn mặt giúp khẩu trang luôn cố định, không bị xê dịch khi vận động mạnh. 🎉
- Có thể giặt và tái sử dụng: Khẩu trang có thể giặt nhiều lần mà không bị bai dão, tiết kiệm chi phí so với khẩu trang dùng một lần. 👏
- Nhiều màu sắc và kiểu dáng: Khẩu trang có nhiều màu sắc và kiểu dáng đa dạng, phù hợp với sở thích nam nữ đều thích hợp để sử dụng 👍
🔥 Lợi ích khi sử dụng:

- Bảo vệ da mặt khỏi tác hại của tia UV, bụi bẩn và các tác nhân gây hại khác từ môi trường.
- Ngăn ngừa tình trạng nám da, tàn nhang, lão hóa da và ung thư da.
- Giữ cho da mặt luôn mềm mại và mịn màng.
✔️ CHÍNH SÁCH ĐỔI TRẢ
-Điều kiện đổi/trả: Sản phẩm được đổi/trả trong vòng 7 ngày kể từ ngày nhận hàng nếu phát hiện lỗi từ nhà sản xuất hoặc không đúng với mô tả sản phẩm.
- Đổi trả hoàn toàn miễn phí khi sản phẩm thực tế khác với ảnh, chấp nhận đổi trả khi còn đầy đủ bao bì, vỏ hộp, không bị trầy xước, móp méo, hỏng hóc bên ngoài, đổ vỡ...

- Tạo cảm giác thoải mái và tự tin khi di chuyển ngoài trời.', 'Sản Phẩm: Khẩu trang chống nắng chống tia UV UPF50+, mặt nạ chống nắng vải lụa băng thoáng khí bảo vệ da mặt', 'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '23 days'),
  ('66666666-6666-6666-6666-000000000007', 'Khẩu trang vành che nắng 3D kháng khuẩn', 'khau-trang-vanh-che-3d', 'Chất liệu: Nylon 88% +spandex 12%
Upf50 +, Che chắn hiệu quả hơn 99% tia cực tím
Chức năng: Khô nhanh, Thoáng khí, Bảo vệ Uv, Chống gió, Che nắng
Phong cách: Bìa đầy đủ
Phong cách: Tự nhiên, Ngọt ngào, Nhỏ và Tươi
Tính năng sản phẩm: Vành kéo dài Vinyl, Chặn mắt hiệu quả; Sụn không khí, Khuôn mặt nhỏ, Không trang điểm; Dây tai có thể điều chỉnh
Kích thước:
Vành: 6cm
Chiều cao mặt nạ: 17,2cm
Chiều dài: 25,5cm

ĐẶC ĐIỂM VÀ TÍNH NĂNG SẢN PHẨM:
Khẩu trang chống tia UV là loại khẩu trang được làm từ các loại sợi tổng hợp có khả năng phản chiếu tia UV, tia cực tím. Nên bạn có thể giặt sạch và tái sử dụng nhiều lần. Đây cũng là một phương pháp bảo vệ môi trường tuyệt đối và tiết kiệm chi phí hơn các loại khẩu trang dùng 1 lần.
✔ Chỉ số chống nắng đạt chuẩn UPF 50+, giúp chống các tia cực tím, tia UV lên đến 99%, đồng thời giảm thiểu độ nóng từ ánh nắng mặt trời.
✔ Thiết kế đặc biệt, trẻ trung, chất liệu mát mẻ phù hợp cho cả nam và nữ.
✔ Dây đeo lên tai có thể điều chỉnh độ dài ngắn
✔ Chất liệu thấm hút mồ hôi và khô nhanh
✔ Bảo vệ làn da với khả năng ngăn tia UV lên đến 99% so với khẩu trang vải thường hay khẩu trang y tế chỉ được 50%
✔ Che cả những vùng như khoé mắt, trán, thái dương( những khu vực dễ bị nắng gây nám)
✔ Sản phẩm có công dụng chống nắng dựa trên chất liệu ( không dựa trên độ dày của vải).
✔ Sản phẩm không chỉ chống nắng & ngăn tia cực tím, tia UVA-UVB, mà còn chống bụi mịn.
✔ Lý tưởng để đi xe đạp, đạp xe và các hoạt động ngoài trời khác', 'Chất liệu: Nylon 88% +spandex 12%', 'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '22 days'),
  ('66666666-6666-6666-6666-000000000008', 'Dép da xỏ ngón', 'dep-da-xo-ngon', 'Combo 10 Đôi Vớ Da Xỏ Ngón Chống Nắng Mềm Mịn HANABI, Chất Liệu Vải Cotton Êm Chân Thoáng Mát

Mô Tả Sản Phẩm

Loại tất cổ cao da chân siêu ngắn thích hợp cho các chị em chống nắng, và phù hợp khi làm công sở, đi chơi, đi dã ngoại,... đặc biệt là phù hợp với nhiều loại giày, dép (dép kẹp),... dễ dàng sử dụng.

TÊN SẢN PHẨM: Vớ Nữ Xỏ Ngón Chống Nắng Mềm Mịn HANABI
SIZE: FreeSize từ 36 đến 41 ( Tất co giãn theo size chân)

CAO: Sản phẩm cao qua mắt cá từ 8cm đến 10cm tùy size chân

** Quý KH lưu ý, tem mác sản phẩm có thể thay đổi tùy theo lô sản xuất.

ĐẶC ĐIỂM NỔI BẬT

– Vớ Nữ xỏ ngón mềm mại, thấm hút mồ hôi tốt mang lại cảm giác mát mẻ, dễ chịu khô thoáng suốt 4 mùa

– Chất liệu: Tất xỏ ngón cổ cao nữ được làm từ 100% cotton cao cấp có độ đàn hồi cực cao, dai, khó rách, co giãn tốt

– Sản phẩm mịn mà, mang cực kì êm chân

– Không bị xù lông khi giặt bằng máy, tính đàn hồi tốt và có độ bền cao, có chức năng kháng khuẩn và khử mùi, đem lại cảm giác tự tin và thoải mái cho chị em.

ƯU ĐIỂM

– Thiết kế tinh tế, trẻ trung, năng động, thời trang.

– Vớ nữ mỏng thoáng, phần chun mảnh không gây hằn, đau khi sử dụng.

– Chất liệu: Tất chống nắng được làm từ chất vải Cotton cao cấp, đảm bảo chống nắng cực kì hiệu quả.

– Chất liệu vải mềm, nhẹ, co giãn 4 chiều , thấm hút mồ hôi, bền màu.

– Sản phẩm rất tốt và tiện lợi cho các bạn.

HƯỚNG DẪN GIẶT VÀ BẢO QUẢN TẤT

- Giặt ở nhiệt độ dưới 40 độ C cùng với đồ có màu tương tự

- Có thể giặt với máy giặt với chu kỳ trung bình và vòng quay ngắn (Khuyên dùng với túi giặt máy)

- Không nên dùng hóa chất tẩy hoặc ngâm tất quá lâu và lộn mặt trái khi phơi tránh bị phai màu

- Hạn chế phơi tất ở ngoài trời nắng quá lâu, và sử dụng máy sấy & bàn ủi (Nên dùng là, ủi ở nhiệt độ dưới 150 độ C)

Combo 10 Đôi Vớ Da Xỏ Ngón Chống Nắng Mềm Mịn HANABI, Chất Liệu Vải Cotton Êm Chân Thoáng Mát', 'Combo 10 Đôi Vớ Da Xỏ Ngón Chống Nắng Mềm Mịn HANABI, Chất Liệu Vải Cotton Êm Chân Thoáng Mát', 'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '21 days'),
  ('66666666-6666-6666-6666-000000000009', 'Tất gấu cổ ngắn kèm túi rút', 'tat-gau-co-ngan-tui-rut', '🐻Gấu có thể chưa có, nhưng tất gấu thì phải có thật nhiều đôi các chị nhé 🍀
🍀Mẫu tất ngắn, hoạ tiết đáng yêu mà các bạn vẫn thường í ới
🍀Chất co giãn 4 chiều đi cực thích, bạn nào hay đi giày thể thao thì loại này hợp quá nhé.
🍀Đối với những bạn làm việc trong môi trường công sở cũng như những bạn thường xuyên mang giày thể thao thì đôi vớ là một item không thể thiếu trong bộ trang phục hàng ngày
🍀Được làm từ chất liệu thun cotton co giãn và thoải mái, sẽ giúp cho đôi chân bạn luôn dễ chịu, khô thoáng, phù hợp với nhu cầu sử dụng.
🍀🍀Ưu điểm của sản phẩm
🍀Đa dạng đủ 10 màu sắc đẹp thay đỗi mối ngày cả tuần vẫn không hết hihi
🍀Chất liệu Cotton 100% mềm mịn, thấm hút mồ hôi, chống hôi chân nữa nha.
🍀MẤY CHỊ EM ĐẶT HÀNG NHỚ CHỌN VÀO PHẦN MÃ ĐỂ LẤY MÃ FREESHIP NHÉ

ĐẶC ĐIỂM NỔI BẬT

– Mềm mại, thấm hút mồ hôi mang lại cảm giác mát mẻ khô thoáng suốt 4 mùa

– Chất liệu: Vớ nữ được từ chất cotton cao cấp có độ đàn hồi cực cao, thấm hút mồ hôi tốt

– Sản phẩm mịn màng, không bị xù lông khi dùng

– Đa dạng màu sắc, mẫu mã rất dễ dàng phối đồ.

ƯU ĐIỂM

– Thiết kế tinh tế, trẻ trung, năng động, thời trang.

– Tất nữ mỏng thoáng, phần chun mảnh không gây hằn, đau khi sử dụng.

– Chất liệu: Cotton. Đảm bảo khử mùi hiệu quả, kháng khuẩn.

– Chất liệu vải mềm, nhẹ, co giãn 4 chiều , thấm hút mồ hôi, bền màu.

– Sản phẩm rất tốt và tiện lợi cho các bạn.

Set 10 Đôi Vớ Tất Gấu Cổ Ngắn Kèm Túi Rút Đựng Mềm Mịn, Chất Liệu Vải Cotton Êm Chân Thoáng Mát', 'Gấu có thể chưa có, nhưng tất gấu thì phải có thật nhiều đôi các chị nhé 🍀', 'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '20 days'),
  ('66666666-6666-6666-6666-000000000010', 'Hộp 5 đôi dán ngực silicon hoa', 'dan-nguc-silicon-5-doi', '🍄🍄🍄Hộp 5 Đôi Dán Nhũ Hoa Silicon hình hoa mai HANABI

🍂🍂Nếu bạn muốn có những khoảng thời gian thoát khỏi chiếc áo ngực hằng ngày, miếng dán ngực silicon che đầu ngực sẽ là giải pháp hoàn hảo giúp bạn thoát khỏi áo ngực mà vẫn kín đáo che đầu ngực.

1.Chất liệu silicon màu da, hoàn toàn ẩn mình dưới các lớp vải ngoài ,Có thể sử dụng nhiều lần

2. Gắn liền trực tiếp với ngực, không rơi rớt khi hoạt động mạnh.

4. Không kích ứng da, an toàn tuyệt đối đến sức khoẻ.

5. Dễ dàng làm sạch, lau khô, dùng để đi tiệc hoặc diện những bộ cánh hở lưng.

6. Mềm mại và cực kỳ thoải mái.

7. Nhỏ gọn, tiện lợi.

💎💎💎Hướng dẫn sử dụng:

🌱🌱Lau sạch, khô vùng ngực .

🌱🌱Tháo lớp bảo vệ keo miếng dán silicon (nhớ giữ lớp bọc lại nhé ^^!) , dán trực tiếp lên đầu ngực trước, kéo miếng dán phía trên nâng lên tới độ cao như bạn mong muốn rồi dán chặt vào da.

🌱🌱Sau khi dùng xong, làm sạch và lau khô miếng dán. Dán lớp bọc bảo vệ lại như ban đầu, bỏ vào túi. Lớp keo sẽ tự phục hồi 👍.

❌Lưu ý: Không để nơi nhiệt độ cao, tránh gió và ánh nắng trực tiếp, không ma sát lên bề mặt keo dán, và tuyệt đối không sử dụng chất tẩy rửa.

🔘 Kích cỡ: Freesize (đường kính 6,5cm).

🔘 Thời hạn sử dụng: dùng được nhiều lần.', 'Hộp 5 Đôi Dán Nhũ Hoa Silicon hình hoa mai HANABI', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '19 days'),
  ('66666666-6666-6666-6666-000000000011', 'Miếng dán ti silicone tai thỏ Hanabi', 'dan-ti-silicone-hanabi', 'Miếng Dán Ti Silicone Tai Thỏ HANABI Sử Dụng Nhiều Lần, Miếng Dán Nhũ Hoa Nâng Ngực Tạo Khe Bám Chắc Chống Mồ Hôi

MÔ TẢ SẢN PHẨM
- Màu sắc: Đen và Da
- Size: 8.5cm và 10cm
- Chất liệu: Su, Silicon
- Cải thiện hiệu quả, giúp nâng ngực.
- Gắn liền trực tiếp với ngực, không rơi rớt khi hoạt động mạnh.
- Không kích ứng da, an toàn tuyệt đối đến sức khoẻ.
- Dễ dàng làm sạch, lau khô, dùng để đi tiệc hoặc diện những bộ cánh hở lưng. Tái sử dụng được nhiều lần
- Mềm mại và cực kỳ thoải mái.
- Nhỏ gọn, tiện lợi

☑️ Hướng Dẫn Bảo Quản Miếng Dán Ngực:
- Làm sạch vùng ngực bằng nước và xà phòng để lấy đi chất nhờn và bụi bẩn trên da. Lau khô bằng khăn
- Tháo lớp bảo vệ keo miếng dán ngực silicon (nhớ giữ lớp bọc lại nhé) , dán trực tiếp lên đầu ngực trước, kéo miếng dán phía trên nâng lên tới độ cao như bạn mong muốn rồi dán chặt vào da
Sau khi dùng xong, làm sạch bằng nước khômg chà xát để khô tự nhiên miếng dán. Dán lớp bọc bảo vệ lại như ban đầu để lần sau có thể sử dụng lại

Miếng Dán Ti Silicone Tai Thỏ Sử Dụng Nhiều Lần, Miếng Dán Nhũ Hoa Nâng Ngực Tạo Khe Bám Chắc Chống Mồ Hôi', 'Miếng Dán Ti Silicone Tai Thỏ HANABI Sử Dụng Nhiều Lần, Miếng Dán Nhũ Hoa Nâng Ngực Tạo Khe Bám Chắc Chống Mồ Hôi', 'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '18 days'),
  ('66666666-6666-6666-6666-000000000012', 'Áo lót su đúc không gọng đệm mỏng', 'ao-lot-su-duc-khong-gong', 'Áo Lót Nâng Ngực Trơn Su Đúc Cao Cấp Không Gọng Không Đường May Đệm Mỏng Định Hình Ngực Có Giãn Thoáng Mát
Size 34: vòng 1: chân ngực 70-75cm, đỉnh ngực 75-85cm
Size 36: vòng 1: chân ngực 75-82cm, đỉnh ngực 85-92cm
Size 38: vòng 1: chân ngực 80-87, đỉnh ngực 92-99cm

• Ưu Điểm:
Không hằn, không viền may, không lộ mỡ thừa, không gây áp lực lên lưng và ngực
Thiết kế với các đường cong liền mạch giảm thiếu tối đa áp lực lên cơ thể.
Mềm mại nhẹ nhàng, ngay cả mẹ bầu sau sinh và các chị em sau khi nâng ngực cũng có thể sử dụng tốt.
Phần mút áo cao su hình giọt nước có thể tháo rời, tạo độ cong tự nhiên, định hình và nâng ngực.
Quả áo phù hợp với hầu hết dáng ngực, ngực nhỏ hay ngực to đều mặc được.
Áo không gọng, độ bền cao, có thể giặt máy.

=> Hãy INBOX hoặc gọi điện để shop tư vấn nếu bạn chưa chắc chắn về size hoặc sản phẩm phù hợp chưa
=> Nếu gặp vấn đề khi nhận hàng, đừng vội đánh giá shop, hãy liên hệ shop Không gian eva để được giải quyết sớm nhất
dolotthai', 'Áo Lót Nâng Ngực Trơn Su Đúc Cao Cấp Không Gọng Không Đường May Đệm Mỏng Định Hình Ngực Có Giãn Thoáng Mát', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '17 days'),
  ('66666666-6666-6666-6666-000000000013', 'Áo ngực su đúc không gọng đệm 3cm', 'ao-nguc-su-duc-nang', 'Áo Lót Nữ Su Cotton Mút 3 phân Nâng Đẩy V1 shop là sự lựa chọn hoàn hảo cho phái đẹp, mang đến sự thoải mái và hỗ trợ tối ưu.

Chất liệu cao cấp: Được làm từ cotton mềm mại, thoáng khí.

Thiết kế nâng đẩy: Mút 5 phân giúp tạo đường cong quyến rũ.

Công nghệ tiên tiến: Mang lại cảm giác dễ chịu khi mặc cả ngày dài.

Sản phẩm này không chỉ đảm bảo phong cách mà còn phù hợp với nhu cầu sử dụng hàng ngày của bạn. Hãy trải nghiệm và cảm nhận sự khác biệt ngay hôm nay!

1. THÔNG TIN SẢN PHẨM:

- Chất liệu Su non mềm mát, siêu thoáng khí, mềm mại khi chạm vào

- Thiết kế đơn giản môt màu nhưng nổi bật với thiết kế nan sóng sang trọng

- Dáng áo không viền không gọng , giúp chi em thoải mái khi diện đồ

- Màu sắc sang trọng basic cho chị em năng lượng tích cực khỏe khoắn

- Lót áo mềm mại ôm trọn v1 giúp tôn v1 chị em

2. MÀU SẮC & KÍCH THƯỚC

- Áo có 5 màu: Đen / Kem / Nâu / Đỏ / Xám nhạt ( Như ảnh)

- Hướng dẫn chọn size:

3. CÁCH BẢO QUẢN:

Chị em có thể giặt máy nhưng lên giặt với túi giặt riêng và nước giặt chuyên dụng.

4. ĐẶC QUYỀN KHI CHỌN MUA SẢN PHẨM TẠI Shop

- Shop bảo hành sản phẩm trong vòng 30 ngày với tất cả các lỗi từ nhà sản xuất

- Sử dụng chất liệu an toàn với da, thiết kế phù hợp với số đo phụ nữ Việt

- Được tư vấn nhiệt tình, luôn luôn lắng nghe mọi yêu cầu của nàng

- Giao hàng nhanh chóng, nhận nhiều quà tặng hấp dẫn

- Đổi hàng linh hoạt TẠI NHÀ toàn bộ đơn hàng trong 7 ngày

- Sản phẩm đổi phải còn nguyên tag mác, chưa qua sử dụng, sản phẩm còn nguyên vẹn không có mùi lạ hoặc dính bẩn

- KHÔNG áp dụng đổi trả sản phẩm QUẦN LÓT và phụ kiện dưới mọi hình thức.

- KHÔNG áp dụng đổi trả sản phẩm trong các chương trình khuyến mại , giảm giá, quà tặng.

️ LƯU Ý: Khi nhận hàng nếu có điều gì chưa hài lòng, mong nàng khoan đánh giá vội, mình hãy liên hệ shop để được hỗ trợ tốt nhất nhé ️', 'Áo Lót Nữ Su Cotton Mút 3 phân Nâng Đẩy V1 shop là sự lựa chọn hoàn hảo cho phái đẹp, mang đến sự thoải mái và hỗ trợ tối ưu.', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '16 days'),
  ('66666666-6666-6666-6666-000000000014', 'Đai nịt bụng thông hơi chống cuộn', 'dai-nit-bung-thong-hoi', 'Đai Nịt Bụng Thông Hơi Chống Cuộn - Đai Nịt Bụng sau sinh Latex giảm mỡ bụng định hình siết eo chống cuộn

- Giảm mỡ cho các mẹ sau sinh hoặc chị em mỡ bụng hiệu quả nhanh so với các biện pháp thông thường.
- Gen nịt bụng sau sinh rất hợp với phụ nữ sau sinh, chỉ cần chịu khó dùng Gen nịt bụng bạn sẽ sớm lấy lại được vóc dáng như ý.
- Không bị đau mỏi , dễ dàng và tiện lợi khi sử dụng.
- Có tác dụng từ phần dưới ngực đến hông , và đặc biệt là ở vùng eo .
- Sản phẩm có 2 màu da và đen : dễ kết hợp bên trong hoặc bên ngoài khi mặc đồ.
- Kết cấu nhiều lỗ thoáng khí giúp thoát mồ hôi nhanh cho bạn cảm giác khô thoáng, dễ chịu.
- Hai bên sườn có 4 thanh chống cuộn.
- Chất liệu mịn màng, thoáng mát, đàn hồi tốt, tuyệt đối không dị ứng với da.

Bảng size theo số đo vòng bụng (số đo phần to nhất của bụng thường dưới rốn 3 cm) Có thể xê dịch nếu bụng mỡ mềm hay cứng khi chọn size đai nịt bụng)
- Size: M ,L ,XL

Size M : 43-53Kg , vòng eo 60- 70cm

Size L :  54-64Kg , vòng eo 71- 80cm

Size XL: 65-74Kg , vòng eo 81- 90cm', 'Đai Nịt Bụng Thông Hơi Chống Cuộn - Đai Nịt Bụng sau sinh Latex giảm mỡ bụng định hình siết eo chống cuộn', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '15 days'),
  ('66666666-6666-6666-6666-000000000015', 'Dây áo ngực trong suốt móc sắt', 'day-ao-nguc-trong-suot', 'Dây áo ngực nữ trong suốt móc sắt (một cặp) HANABI
Chiều rộng dây: 1 cm
Thiết kế trong suốt tiệp màu da, nhưng không gây cảm giác dính vào da.
Màu sắc: không màu
Có thể điều chỉnh đến 45 cm

Làm bằng Chất liệu: TPU chất lượng cao
Hàng nguyên mới 100% chất lượng cao
Mềm mại và vững chắc, độ bền cao, không phai màu
Dễ sử dụng và phù hợp với hầu hết kích thước của các loại áo ngực vì dây đeo có thể điều chỉnh
Cũng có thể được dùng để thay thế dây đeo áo ngực vải của bạn, hoặc sử dụng cho áo quây, khi bạn muốn đảm bảo cho áo quây không bị tuột xuống.
CAM KẾT:
- Sản phẩm 100% giống mô tả.
- Đảm bảo vải chất lượng 100%
- Quần lót nữ được kiểm tra kĩ càng, cẩn thận và tư vấn nhiệt tình trước khi gói hàng giao cho Quý Khách
- Hàng có sẵn, giao hàng ngay khi nhận được đơn
- Hoàn tiền nếu sản phẩm không giống với mô tả
- Hỗ trợ đổi trả theo quy định của Shopee

1. Điều kiện áp dụng (trong vòng 03 ngày kể từ khi nhận sản phẩm)
- Hàng hoá vẫn còn mới, chưa qua sử dụng
- Hàng hoá bị lỗi hoặc hư hỏng do nhà sản xuất.
- Có video hình ảnh khui hàng

2. Trường hợp không đủ điều kiện đổi trả:
- Quá 03 ngày kể từ khi Quý khách nhận hàng
- Gửi lại hàng không đúng mẫu mã, không phải sản phẩm của shop
- Không thích, không hợp, đặt nhầm mã, nhầm màu,...', 'Dây áo ngực nữ trong suốt móc sắt (một cặp) HANABI', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '14 days'),
  ('66666666-6666-6666-6666-000000000016', 'Gen nịt bụng latex định hình eo', 'gen-nit-bung-latex', 'Gen Nịt Bụng Latex Định Hình Eo Tích Nhiệt Giảm Mỡ Bụng, Quần Gen Nịt Bụng Co Giãn Tốt Không Gây Khó Chịu

✅ Mô tả sản phẩm:
-Quần lót gen nịt bụng siêu eo và  phần bụng dưới, có tác dụng thon gọn tức thì. nếu sử dụng lâu dài hỗ trợ giảm mỡ hiệu quả nhất là đối với phụ nữ sau sinh
-Chất liệu thun co giãn cực tốt không gây khó chịu.
-Quần định hình đáy có lớp lót có thể dùng như quần lót thường.
-Phụ hợp với mọi trang phục váy, đầm body mà không lo bị lộ.

✅ Màu sắc: Đen,Nâu( 📍khách lưu ý giúp shop là màu Nâu như video và hình thật ở cuối nhé ạ)
✅ Size:Tham khảo bảng size (tuỳ vào thể trạng mỗi người, chị/em có thể chat với shop để được tư vấn size ạ)
Size               ||  Vòng eo (trên rốn tầm 5 cm)

32- S            |  69-75 cm

34 - M          |  76-80 cm

36 -L            |  81-88 cm

38 - XL        |  89-95 cm

🌺🌺🌺 Shop sẽ che tên hoàn toàn tất cả sản phẩm trên đơn hàng, Khách hàng yên tâm nhận sản phẩm nhé.

⛔ CHÍNH SÁCH BẢO HÀNH:
- Bảo hành sản phẩm 1 năm.
- Phiếu bảo hành ghi rõ thông tin: Tên khách hàng - Sđt - Địa chỉ - Ngày bán sản phẩm.
- Nếu sản phẩm có vấn đề, khách hàng gửi trực tiếp về nhà sản xuất để được bảo hành theo chính sách ghi trên phiếu bảo hành sản phẩm.

"#quần_lót_đúc_su_nữ #quần_lót_đúc_su_thun_lạnh #quần_lót_đúc_su_không_lộ_viền #quần_lót_đúc_su_thông_hơi #quần_lót_đúc_su_bigsize #quần_lót_đúc_su_không_đường_may #quần_đúc_su #quần_lót_su_đúc_là_gì #quần_lót_nữ_đúc_su #quần_lót_thun_lạnh_nữ #quần_lót_thun_lạnh_bigsize #quần_lót_thun_lạnh_không_viền #quần_lót_thun_lạnh_lưng_cao', 'Gen Nịt Bụng Latex Định Hình Eo Tích Nhiệt Giảm Mỡ Bụng, Quần Gen Nịt Bụng Co Giãn Tốt Không Gây Khó Chịu', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '13 days'),
  ('66666666-6666-6666-6666-000000000017', 'Quần gen nịt bụng đúc su móc cài', 'quan-gen-nit-bung-moc-cai', 'QUẦN GEN NỊT BỤNG, GEN ĐỊNH HÌNH HANABI với mục đích lấy lại vóc dáng tuổi xuân của chị em một cách nhanh chóng, hiệu quả nhất với 3 tiêu chí:
- KHÔNG LỘ
- KHÔNG CỘM
- AN TOÀN TUYỆT ĐỐI VỚI DA

👉👉👉 QUẦN GEN NỊT BỤNG ĐÚC SU LỤA NGUYÊN KHỐI GỒM 2 MÀU DA VÀ ĐEN
Tỷ lệ vải Đai nịt: 70% Polyester + 30% Sợi Spandex: bổ sung nylon trơn cho chất vải mềm mịn, co giãn cực tốt, nịt bụng + nâng mông một cách tự nhiên nhất

*** LƯU Ý: Hiện có rất nhiều sp nhái của shop, shop đã mua thử và so sánh thì vải dễ sần, mặc chất bị nóng, chị em cân nhắc nha ạ ***

👉👉👉 HƯỚNG DẪN CHỌN SIZE (*)

M:  45 - 56 kg     ( vòng 3 75cm - 90cm )
L :  57 -  68 kg    ( vòng 3 90 cm -100cm )
XL: 69 - 80 kg     ( vòng 3 95cm - 120cm )

(*)  Bảng size Áp dụng cho người cao 1m60, khách hàng có chiều cao thấp hoặc cao hơn tùy chỉnh size lên hoặc xuống cho phù hợp
Bracherry

Chị em xem thêm "bảng quy đổi kích cỡ" vòng EO và BỤNG để chọn size phù hợp nhất nhé !!!', 'QUẦN GEN NỊT BỤNG, GEN ĐỊNH HÌNH HANABI với mục đích lấy lại vóc dáng tuổi xuân của chị em một cách nhanh chóng, hiệu quả nhất với 3 tiêu chí:', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '12 days'),
  ('66666666-6666-6666-6666-000000000018', 'Quần nano sinh nhiệt tan mỡ bụng', 'quan-nano-sinh-nhiet-tan-mo', 'Quần Tập HANABI Sinh Nhiệt Đánh Tan Mỡ, Quần Tập  Sinh Nhiệt Tráng Bạc Đổ Mồ Hôi Giảm Mỡ Siêu Tốc

+ Quần Đùi ,Ngố ,Dài tập thể thao Đốt Cháy Mỡ Bụng Giảm Eo Siêu Nhanh Quần Tập Thể Dục Đổ Mồ Hôi Tan Mỡ Bụng là sản phẩm quần tập thể thao Giúp tăng nhiệt độ cơ thể trong một khoảng thời gian ngắn, thúc đẩy việc tiết mồ hôi, cách ly hiệu quả nhiệt độ bên ngoài để duy trì nhiệt độ cơ thể
*Áo Và Quần Đều có  2 size phục vụ khách
Size M: dưới 55kg
Size L: từ 55kg -  65kg
Size XL từ 65kg - 78kg
MÀu Sắc Đen
✔Chất liệu vải công nghệ 3 lớp chỉ dày 1,3 mm cho bạn cảm giác mềm mại và thoải mái.
✔️ Giúp giải độc và giữ ẩm, ngăn ngừa cảm lạnh, đẩy nhanh quá trình trao đổi chất, thúc đẩy quá trình tiêu hoá, đốt cháy chất béo.

-------------------------------

🎁 LỜI MUỐN NÓI!
Nhận hàng  xong mong các bạn sẽ có những phản hồi tích cực như Feedback hình ảnh hoặc đánh giá 5* nếu cảm thấy OK. Mọi vấn đề bạn chưa vừa lòng xin hãy inbox để được hỗ trợ trước khi đánh giá nhé.
Cảm ơn bạn đã đặt hàng . Đừng quên nhấn theo shop dõi nha! Có rất nhiều ưu đãi đến từ shop đó ạ ^-^
Mọi ý kiến thắc mắc vui lòng ib cho shop nhé

🔔QUÝ KHÁCH LƯU Ý
🔴 Sản phẩm vẫn còn hiển thị ở trên shop nghĩa là vẫn còn hàng nên Quý khách cứ yên tâm mua hàng nha
⏱ Thời gian giao hàng cho khách hàng là do các nhà vận chuyển giao, shop không trực tiếp giao hàng ạ.
🚛 Phí ship và thời gian nhận hàng sẽ được Shopee báo cụ thể khi bạn đặt đơn hàng.

*Các cậu nhận được hàng đừng quên quay video unbox sản phẩm để được hỗ trợ tốt nhất nhé ạ .
Hi vọng sẽ làm hài lòng các nàng, chúc các nàng mua sắm vui vẻ !', 'Quần Tập HANABI Sinh Nhiệt Đánh Tan Mỡ, Quần Tập  Sinh Nhiệt Tráng Bạc Đổ Mồ Hôi Giảm Mỡ Siêu Tốc', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '11 days'),
  ('66666666-6666-6666-6666-000000000019', 'Quần lót cotton không đường may', 'quan-lot-cotton-khong-duong-may', 'Chào mừng bạn đã đến với gian Hàng của chúng mình
Quần Lót Cotton Không Đường May Lưng Vừa Co Giãn, Quần Lót Nữ In Họa Tiết Gấu Dễ Thương Thoải Mái Cho Nữ HANABI

🥕 Chất liệu cotton thấm hút mồ hôi tốt, thông thoáng, đảm bảo sức khỏe.
🥕 Họa tiết cute, dễ thương, trẻ trung, bắt mắt, màu sắc tươi sáng
🥕 Thiết kế đơn giản, hợp lý, phần đũng và mông quần to ôm nhẹ nhàng, thoải mái tối đa.
Lưu ý: Trong Set có thể bao gồm 4 kiểu dáng khác nhau
hot đẹp siêu hot
CAM KẾT
- Hình ảnh sản phẩm giống 100%.
- Chất lượng sản phẩm tốt 100%.
- Sản phẩm luôn có sẵn trong kho hàng.
- Giao hàng ngay khi nhận được đơn hàng.
- Hoàn tiền ngay nếu sản phẩm không giống với mô tả.
- Gửi hàng siêu tốc.

Quần Lót Cotton Không Đường May Lưng Vừa Co Giãn, Quần Lót Nữ In Họa Tiết Gấu Dễ Thương Thoải Mái Cho Nữ Ada_Bikini

⛔ CHÍNH SÁCH BẢO HÀNH: - Bảo hành sản phẩm 1 năm. - Phiếu bảo hành ghi rõ thông tin: Tên khách hàng - Sđt - Địa chỉ - Ngày bán sản phẩm. - Nếu sản phẩm có vấn đề, khách hàng gửi trực tiếp về nhà sản xuất để được bảo hành theo chính sách ghi trên phiếu bảo hành sản phẩm.

Cảm ơn bạn đã ghé qua. Nhớ ủng hộ shop nha', 'Chào mừng bạn đã đến với gian Hàng của chúng mình', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '10 days'),
  ('66666666-6666-6666-6666-000000000020', 'Quần lót mặc trong váy chống lộ', 'quan-lot-mac-trong-vay', 'Quần Lót Mặc Trong Váy Chống lộ, Quần Lót Bảo Hộ Mặc Váy Thun Su Co Dãn

Nàng có biết không, khi lần đầu nhìn thấy hình ảnh của em quần bảo hộ vạt trước này thì mình kiểu "Quàooooo!!! Con người thật là thông minh! Cái gì cũng nghĩ ra được!!!'' Giờ thì Nàng không phải lo bị kém duyên khi mặc váy mà đi lại lộ khe váy nữa rồi nha!

À, nếu Nàng nào lo rằng quần mặc váy sẽ khiến Nàng khó di chuyển, vướng víu thì hãy yên tâm nhé, chất liệu co dãn 4 chiều sẽ giúp nàng thoải mái  - mặc như chiếc quần lót thường thui nè!

🍀 Màu : Đen, Da

🍀Kích thước: freesize

🍀 SIZE:

+ Size L: 40 - 55kg

+ Size XL: 56 - 65kg

- Đặc điểm:

+ Quần mặc váy không đường may, không lộ viền

+ Quần mặc váy ôm sát 3 vòng định hình nâng mông

+ Quần mặc váy mềm mại không co cuộn tạo cảm giác dễ chịu

+ Quần mặc váy chất liệu vải cao cấp khi mặc quần không hề có cảm giác bí bách dù bạn mặc nó vào mùa hè hay mùa đông!!!!

* HƯỚNG DẪN BẢO QUẢN  Quần mặc trong váy chất thun su 2 lớp bảo hộ an toàn co giãn cho nữ

- Không để quần mặc trong váy nữ trên sàn nhà hoặc nơi mất vệ sinh, nơi ẩm mốc.

- Giặt quần an toàn trong túi giặt để giữ sản phẩm không bị giãn, giặt cùng các sản phẩm cùng màu, cùng chất để không bị ám màu phai hoặc bai form

- Giặt quần bảo hộ trong váy cho nữ ngay sau khi sử dụng

- Phơi khô quần lót váy nữ ngay sau khi giặt ở nơi khô thoáng, tránh nơi ẩm mốc và tránh ánh nắng mặt trời

🔆 Sản phẩm do SHOP tự chụp nên 💯 giống hình ảnh và mô tả

🔆 Chất lượng vải đã được kiểm tra cẩn thận, kĩ thuật may tiêu chuẩn bền và đẹp

🔆 Tư vấn hỗ trợ khách hàng nhiệt tình, chu đáo

🔆 Giao hàng COD trên toàn quốc

🔆 Hỗ trợ Quý khách đổi/trả hàng trong 0️⃣7️⃣ ngày kể từ khi nhận sản phẩm theo đúng quy định của Shopee

Do màn hình và điều kiện ánh sáng khác nhau, màu sắc thực tế của sản phẩm có thể chênh lệch khoảng 3-5%', 'Quần Lót Mặc Trong Váy Chống lộ, Quần Lót Bảo Hộ Mặc Váy Thun Su Co Dãn', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '9 days'),
  ('66666666-6666-6666-6666-000000000021', 'Quần lót Air tăng hình lai băng siêu nhẹ', 'quan-lot-air-tang-hinh', 'Quần Lót Nữ Air Tàng Hình Lụa Băng Siêu Nhẹ
🔸Chất Liệu: Su lụa siêu mịn siêu mềm , thoáng mát
🔸Size:
+ Size M : 38 - 50kg
+ Szie L : 51 - 63kg
+ Size XL : 64-70kg
🔸Màu: Da, Nâu , Hồng , Xanh , Đen , Tím
🔸 Đặc điểm nổi bật:
- Quần lót không viền chất liệu đúc su lụa sữa, mềm mịn
- Quần cạp cao pha ren họa tiết tim, ôm trọn phần bụng dưới
- Đáy quần là lớp cotton kháng khuẩn, chống viêm nhiễm, nấm ngứa
- Quần thấm hút mồ hôi cho ngày năng động. Quần mặc full vòng 3
- Quần không đường viền nên thoải thích mặc đồ Body không lo lộ ngấn
- Quần lót phù hợp cho dân công sở, bà mẹ nội trợ, dân kinh doanh muốn cả ngày vận động không lo bí, nóng nực.', 'Quần Lót Nữ Air Tàng Hình Lụa Băng Siêu Nhẹ', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '8 days'),
  ('66666666-6666-6666-6666-000000000022', 'Quần lót cotton kháng khuẩn', 'quan-lot-cotton-khang-khuan', 'Hộp 5 Quần Lót Cotton Thiên Nga Kháng Khuẩn Dễ Thương Co Giãn 4 Chiều Cao Cấp
MÔ TẢ SẢN PHẨM
👙 Hộp 5 quần lót nữ hồng hạc cotton viền ren kháng khuẩn siêu xinh 👙
SHOP SẼ GIAO MÀU NGẪU NHIÊN Ạ

SIÊU CO DÃN, MỀM MẠI SIÊU SƯỚNG LUÔN Ạ!
🌸🌸Hộp gồm 5 quần lót với chất liệu cotton mềm mại, thấm hút và co giãn tốt giúp chị em tự tin mặc váy, body mà không lo bị hằn vết. Hàng nội địa cao cấp .
- Chất liệu: vải cotton đàn hồi, co giãn 4 chiều tạo cảm giác thoải mái, dễ chịu khi mặc.
- Thiết kế thông minh với công nghệ ép mượt tạo cảm giác nhẹ như không, mềm mịn thoải mái vô cùng.
- Không để lại vết hằn trên vòng 3 khi diện váy ngắn, váy body, váy dự tiệc, quần ôm sát, giúp tôn dáng cho chị em tự tin hơn.
- Sản phẩm có đóng hộp cực xinh, thích hợp làm quà tặng ý nghĩa.
Freesize : 40- 58kg
Màu sắc tươi tắn đơn giản , dễ chịu
theo khuyến cáo chỉ nên mặc quần chip trong vòng 3 - 4 tháng là phải thay ạ. Nên các mẹ sắm 1 sét này tha hồ mặc luôn', 'Hộp 5 Quần Lót Cotton Thiên Nga Kháng Khuẩn Dễ Thương Co Giãn 4 Chiều Cao Cấp', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '7 days'),
  ('66666666-6666-6666-6666-000000000023', 'Quần lót đúc su tăng hình chống lộ vi', 'quan-lot-duc-su-chong-lo', 'Quần Lót Nữ Đúc Su Tàng Hình Chống Lộ Viền, Quần lót nữ đúc su thun lạnh không đường may cao cấp

Size
+ M: 40-48kg
+ L: 48-55kg
+ XL: 55-65kg

- Màu sắc : ngẫu nhiên

* Đặc điểm nổi bật :

+ Chất liệu Polyamide + nylon, miếng lót trong 100% vải bông tự nhiên

+Vải thun cao cấp phong cách nữ tính, trẻ trung,viền được ép keo trên dây truyền công nghệ hiện đại nhất

+  Quần chip liền mảnh không đường may, chất vải suôn mềm, siêu thoáng, cực co giãn, không rão. Không bị lộ viền khi mặc quần, váy bó sát.

+ Cho bạn cảm giác thoải mái, mát lạnh, dễ chịu; cho cảm nhận khác biệt hoàn toàn khi so sánh với các hàng phổ thông khác.

Kích thước có thể có sai số 1-2cm

- KHÁCH HÀNG CHÚ Ý:
+ Sản phẩm có thể còn màu nhuộm thừa bám trên bề mặt nên những lần giặt đầu bạn hãy giặt riêng từng màu để tránh bị lem màu không mong muốn.
🧨🧨Quý khách lưu ý
-  Ảnh sản phẩm do Tipi Shop tự chụp, đảm bảo sản phẩm giống hình, chất lượng tốt.
- Khi đặt hàng vui lòng nhắn tin nếu có ghi chú về màu sắc, số lượng.. hoặc cần tư vấn về sản phẩm
- Khi nhận hàng vui lòng giữ lại vỏ gói hàng và nhắn tin cho shop nếu có bất kì khiếu nại hoặc thắc mắc liên quan đến sản phẩm.

ANGEL_BOUTIQUE SHOP đảm bảo
- Hình ảnh sản phẩm giống 100%.
- Chất lượng sản phẩm tốt 100%.
- Sản phẩm được kiểm tra kĩ càng, nghiêm ngặt trước khi giao hàng.
- Sản phẩm luôn có sẵn trong kho hàng.
- Giao hàng ngay khi nhận được đơn hàng.
- Hoàn tiền ngay nếu sản phẩm không giống với mô tả.
- Giao hàng toàn quốc, nhận hàng thanh toán.
- Hỗ trợ đổi trả theo quy định.
- Gửi hàng siêu tốc', 'Quần Lót Nữ Đúc Su Tàng Hình Chống Lộ Viền, Quần lót nữ đúc su thun lạnh không đường may cao cấp', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '6 days'),
  ('66666666-6666-6666-6666-000000000024', 'Quần lót Hanabi su lụa cao cấp', 'quan-lot-hanabi-su-lua', 'Quần Lót Nữ HANABI Su lụa Cao Cấp Thiết Kế Mỏng Mát Tôn Dáng Mềm Mại Thoáng Mát

MÔ TẢ SẢN PHẨM:

- Quần lót với thiết kế cạp ren quyến rũ kết hợp nơ thêm phần xinh xắn
- Chất Liệu Vải: su lụa, siêu co giãn, mỏng mát, tôn dáng siêu gợi cảm
- Freesize<58kg
- Form chuẩn phù hợp với vóc dáng phụ nữ Việt Nam.
-  Sản Xuất : Hàng Quảng Châu Cao Cấp

CAM KẾT:

- Hình ảnh sản phẩm giống 100%.
- Chất lượng sản phẩm tốt 100%.
- Sản phẩm được kiểm tra kĩ càng, nghiêm ngặt trước khi giao hàng.
- Sản phẩm luôn có sẵn trong kho hàng.
- Giao hàng ngay khi nhận được đơn hàng.
- Hoàn tiền ngay nếu sản phẩm không giống với mô tả.
- Giao hàng toàn quốc, nhận hàng thanh toán.
- Hỗ trợ đổi trả theo quy định.

LƯU Ý
- Shop ưu tiên giao theo đơn khách đặt, không nhận giao hàng theo ghi chú và tin nhắn.
- Màu sắc của sản phẩm thực tế có thể đậm, nhạt hơn ảnh mô tả do ánh sáng và màn hình thiết bị khác nhau.
- Kích thước sản phẩm dung sai cho phép ±1-2cm.', 'Quần Lót Nữ HANABI Su lụa Cao Cấp Thiết Kế Mỏng Mát Tôn Dáng Mềm Mại Thoáng Mát', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '5 days'),
  ('66666666-6666-6666-6666-000000000025', 'Quần lót đúc su tím thun lụa', 'quan-lot-duc-su-tim', 'Quần Lót Nữ - Quần lót Đúc Su Tim Thun Lạnh Viền Sóng Gợi Cảm Đính Trái Tim Nhỏ Dễ Thương

Mô tả sản Phẩm

️ Mã Sản Phẩm:  Quần lót Su tim viền sóng

️ Chất Liệu Vải: đúc su, siêu co giãn, mỏng mát, tôn dáng siêu gợi cảm, không lộ viền khi mặc quần áo

️ Size:

M(38-48kg)

L(48-58kg)

XL(59-70kg)

️Kiểu Dáng: Form chuẩn phù hợp với vóc dáng phụ nữ Việt Nam.

️ Shop CAM KẾT

️ Về chất lượng sản phẩm:

Shop cam kết cả về CHẤT LIỆU cũng như HÌNH DÁNG (đúng với mô tả, hình ảnh sản phẩm chân thực, video, ảnh thật do SHOP tự quay và chụp)

️ Về dịch vụ: Shop sẽ cố gắng phản hồi mọi thắc mắc của quý khách nhanh nhất có thể

️ Thời gian chuẩn bị hàng: Hàng có sẵn, thời gian chuẩn bị tối ưu nhất.

️ Quyền Lợi của Khách Hàng:

Chính sách bao đổi trả hàng khi sản phẩm kém chất lượng và không giống hình, nhầm size, số lượng, lỗi từ xưởng sản xuất...

LƯU Ý KHI SỬ DỤNG CÁC SẢN PHẨM CỦA SHOP

- Đối với sản phẩm thường có thể giặt máy thoải mái và nên phân loại sản phẩm cùng màu, cùng loại vải khi giặt.

- Đối vơi sản phẩm cao cấp, sang chảnh, đa dạng về chất liệu, kiểu dáng, cách bảo quản sản phẩm tốt nhất là giặt tay với bột (nước) giặt nhẹ để giữ được độ bền của vải, tránh bị phai màu từ các loại quần áo khác.

- Nên phơi sản phẩm ở nơi thoáng mát, tránh để ẩm ướt kéo dài gây mốc, nên làm khô quần áo bằng cách phơi ở những điểm đón gió sẽ giữ được màu vải tốt hơn.', 'Quần Lót Nữ - Quần lót Đúc Su Tim Thun Lạnh Viền Sóng Gợi Cảm Đính Trái Tim Nhỏ Dễ Thương', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '4 days'),
  ('66666666-6666-6666-6666-000000000026', 'Quần lót su cạp cao năng mỏng gen', 'quan-lot-su-cap-cao', 'Quần Lót Nữ Su Cạp Cao - Nâng Mông - Gen Nịt Bụng - Giảm Mỡ Bụng HANABI

2️⃣ Hỗ trợ đổi trả khi không vừa, hàng lỗi

3️⃣ Chỉ bán hàng CAO CẤP, LOẠI 1 => KHÔNG bán loại 2

4️⃣Hàng SẴN KHO - Giao cho vận chuyển trong 2h -24h

5️⃣ Tư vấn nhiệt tình và luôn lắng nghe khách hàng để phục vụ tốt nhất có thể

📌 Ấn Like và theo dõi để ủng hộ shop và tham khảo các sản phẩm mới của shop rất hân hạnh được phục vụ quý khách.

Quần gen nịt bụng siết eo mặc váy định hình không cuộn cao su non mát lạnh

✅ CÓ 2 LOẠI:

2 Xương: Ôm nhẹ, mát và dễ chịu như quần lót cạp cao

4 Xương: Ôm chặt hơn,  gọn tự nhiên

✅ SIze:

✅ Ưu điểm nổi bật:

Quần lót gen bụng định hình cạp cao đến 15cm với khả năng co giãn đàn hồi cực tốt, ôm vừa phải giúp tạo sự thon gọn tự nhiên, k hằn mỡ lưng

- Có thanh chống cuộn mềm dẻo vô cùng dễ chịu

- Phần mông quần có thiết kế đặc biệt giúp nâng mông cao tròn, chống sệ

- Sản phẩm được dệt liền khối không có đường may, không hằn vết lên da hay lộ viền khi mặc quần áo bên ngoài.

- Chất liệu: Cao su non - spandex mát lạnh, mặc thay quần lót dù mùa hè hay mùa đông đều thoải mái

- Màu : Đen và Da
- Size M dành cho người có trọng lượng dưới 58kg / size L dành cho người có trọng lượng dưới 68kg / size XL dành cho người có trọng lượng dưới 75kg

👉Mỗi quần 1 túi zip xin xò

✅ Nhận hàng ưng ý cho shop 1 đánh giá 5* nhé Nàng ơi :*

✅ Hướng dẫn bảo quản áo bralette, áo ngực, đồ lót nữ:

Sản phẩm đồ lót chỉ thích hợp giặt bằng tay, trong trường hợp giặt máy cần sử dụng túi giặt dành riêng cho đồ lót.

Giặt sản phẩm bralette ở nhiệt độ không quá 40°C.

✅Cam kết của shop

- Hàng tuyển chọn đã check chất lượng và sử dụng thử

- Chất lượng tốt nhất, màu sắc, mẫu mã sản phẩm y như hình

- Do màn hình và điều kiện ánh sáng khác nhau, màu sắc thực tế của sản phẩm có thể chênh lệch khoảng 5-10%

✅Hỗ trợ đổi trả theo quy định của shopee:

1. Điều kiện áp dụng (trong vòng 07 ngày kể từ khi nhận sản phẩm)

Hàng hoá chưa qua sử dụng, còn nguyên tem mác, chưa giặt.

Sản phẩm bị lỗi hoặc hư hỏng do vận chuyển hoặc do nhà sản xuất.

2. Trường hợp được chấp nhận:

Hàng không đúng size, kiểu dáng như quý khách đặt hàng

Không đủ số lượng, không đủ bộ như trong đơn hàng

3. Trường hợp không đủ điều kiện áp dụng chính sách:

Quá 07 ngày kể từ khi Quý khách nhận hàng

Gửi lại hàng không đúng mẫu mã, không phải sản phẩm của shop

Không thích, không hợp, đặt nhầm mã, nhầm màu,...

✅Mọi trường hợp khiếu nại hay chưa hài lòng xin hãy phản hồi lại với shop', 'Quần Lót Nữ Su Cạp Cao - Nâng Mông - Gen Nịt Bụng - Giảm Mỡ Bụng HANABI', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '3 days'),
  ('66666666-6666-6666-6666-000000000027', 'Set 4 quần lót su full hộp quà gấu Cookie', 'set-4-quan-lot-hop-qua', 'Set 4 Quần Lót Su Full Hộp Gấu Cookie Cao Cấp, Quần Lót Su Kháng Khuẩn Nâng Mông Không Viền Quyến Rũ

Việc mặc những chiếc quần bó hoặc váy ôm mà để lộ đường viền quần trong nhìn rất phản cảm. Quần chíp không viền  đã khắc phục những nhược điểm này với những đặc điểm thiết kế:
- Với chất liệu mềm mịn mặc vô cùng thoải mái, tiếp xúc với da siêu êm
- Độ co giãn tốt không gây cảm giác khó chịu cho người mặc, không có cảm giác bó, vừa đủ để không tụt, không quăn, không cuộn mép.
- Đặc biệt với thiết kế không có đường may, không có vòng chun, không viền.
- Chất liệu đồng nhất, tiếp xúc cơ thể đồng nhất, không chỗ chặt chỗ lỏng.

size 42-66kg
Set 4 quần đủ 4 màu khác nhau!', 'Set 4 Quần Lót Su Full Hộp Gấu Cookie Cao Cấp, Quần Lót Su Kháng Khuẩn Nâng Mông Không Viền Quyến Rũ', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '2 days'),
  ('66666666-6666-6666-6666-000000000028', 'Set 6 quần chip su thạch tan', 'set-6-quan-chip', 'Set 6 Quần Chip Quần Lót Nữ Su Thạch Tàng Hình Không Đường May Không Lộ Viền Kèm Hộp Mini

☘️ Mẫu quần lót su thiết kế không đường may thông minh không để lại vết hằn mỗi khi diện váy ngắn hay quần bó sát

☘️C.ô.n.g nghệ ép mượt giúp quần nhẹ như không. Đem đến cảm giác tự nhiên chỉ với một lần chạm

☘️Thiết kế ngàn lỗ giúp thoáng khí , lót đũng  cotton kháng khuẩn, thấm hút cho "cô bé " khô thoáng, sạch sẽ

☘️Form quốc dân phù hợp mọi dáng v3

☘️ Set màu pastel, thanh nhẹ, tươi mát

🦋Chất lượng sản phẩm 1.0.0% như hình

🦋Nàng inbox HANABI team tư vấn và hỗ trợ đặt hàng giúp mình ạ🤍

+ Size: Freesize - Phù hợp vòng 3 từ 85-110cm, cân nặng tham khảo 45-60kg
+ Màu sắc: Đen, Trắng, Da đậm, Kem, Cam,  Ghi

HANABI CAM KẾT:

• Cam kết hàng đúng mô tả như trên hình ảnh, video

• Chất lượng đảm bảo 100%

• Sản phẩm được kiểm tra kỹ càng, cẩn thận và tư vấn nhiệt tình trước khi gói hàng giao cho Quý khách

• Hỗ trợ quý khách đổi size nếu mặc không vừa

HỖ TRỢ ĐỔI TRẢ THEO QUY ĐỊNH CỦA SHOPEE :

1. Điều kiện áp dụng (trong vòng 03 ngày kể từ khi nhận sản phẩm) :

+ Hàng hoá vẫn còn nguyên tem mác, chưa qua sử dụng

+ Hàng hoá bị lỗi hoặc hư hỏng do vận chuyển hoặc do nhà sản xuất

+ Quý khách lưu ý phải có video xác minh quay lại quá trình mở gói hàng mới được đổi trả

2. Trường hợp được chấp nhận:

+ Hàng không đúng size, mã và màu sản phẩm như quý khách đặt

+ Không đủ số lượng như trong đơn hàng

3. Trường hợp không đủ điều kiện áp dụng chính sách:

+ Quá 03 ngày kể từ khi Quý khách nhận hàng

+ Không thích, không hợp, đặt nhầm mã, nhầm màu,...

+ Gửi lại hàng không đúng mẫu mã, không phải sản phẩm của HANABI', 'Set 6 Quần Chip Quần Lót Nữ Su Thạch Tàng Hình Không Đường May Không Lộ Viền Kèm Hộp Mini', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '1 days'),
  ('66666666-6666-6666-6666-000000000029', 'Set túi 3 quần lót su đúc mặt lạnh', 'set-3-quan-lot-mat-lanh', 'Set túi 3 quần lót nữ su đúc mát lạnh viền ren phối nơ thiết kế cao cấp thoáng mát thấm hút mồ hôi bán chạy giá rẻ.

️SET 3 QUẦN LÓT NỮ SU ĐÚC MÁT LẠNH️
Chất Liệu: su thạch cao cấp
Size: Freesize cân nặng tham khảo 40-65kg
Màu: pastel hiện đại phối ba màu như hình
Đặc điểm nổi bật:
- Quần lót viền ren chất liệu đúc su thạch mát lạnh, mềm mịn, siêu co giãn
- Quần dáng tam giác siêu mỏng tàng hình cho bạn cảm giác mặc như không mặc
- Đáy quần là lớp cotton kháng khuẩn, chống viêm nhiễm, nấm ngứa đồng thời được cắt laze rất nhiền lỗ thông hơi vô cùng thông thoáng
- Quần thấm hút mồ hôi cho ngày năng động.
- Quần không đường viền nên thoải thích mặc đồ Body không lo lộ ngấn
- Quần lót phù hợp cho dân công sở, bà mẹ nội trợ, dân kinh doanh muốn cả ngày vận động không lo bí, nóng nực.

️HƯỚNG DẪN BẢO QUẢN️
- Giặt bằng tay ở nhiệt độ thường
- Không sử dụng chất tẩy
- Không ủi
- Nên phơi ở nơi khô ráo, thoáng mát
- Không giặt cùng quần áo khác màu
- Nên thay sau 3 tháng sử dụng

️CAM KẾT️
Hình ảnh sản phẩm giống 100%.
Chất lượng sản phẩm tốt 100%.
Sản phẩm được kiểm tra kĩ càng, nghiêm ngặt trước khi giao hàng.
Sản phẩm luôn có sẵn trong kho hàng.
Giao hàng ngay khi nhận được đơn hàng.', 'Set túi 3 quần lót nữ su đúc mát lạnh viền ren phối nơ thiết kế cao cấp thoáng mát thấm hút mồ hôi bán chạy giá rẻ.', 'ACTIVE', '11111111-1111-1111-1111-111111111103', now() - interval '0 days');

-- variants
INSERT INTO product_variants (id, product_id, sku, price_cents, compare_at_price_cents, stock, attributes) VALUES
  ('77777777-7777-7777-7777-000000000001', '66666666-6666-6666-6666-000000000001', 'AOKHOA-01', 13900000, 17400000, 1234, '{"color": "Ghi form ôm"}'),
  ('77777777-7777-7777-7777-000000000002', '66666666-6666-6666-6666-000000000001', 'AOKHOA-02', 19900000, 24900000, 0, '{"color": "Trắng"}'),
  ('77777777-7777-7777-7777-000000000003', '66666666-6666-6666-6666-000000000001', 'AOKHOA-03', 13900000, NULL, 1234, '{"color": "Trắng form ôm"}'),
  ('77777777-7777-7777-7777-000000000004', '66666666-6666-6666-6666-000000000001', 'AOKHOA-04', 13900000, 17400000, 1231, '{"color": "Đen form ôm"}'),
  ('77777777-7777-7777-7777-000000000005', '66666666-6666-6666-6666-000000000001', 'AOKHOA-05', 13900000, 17400000, 1233, '{"color": "Hồng form ôm"}'),
  ('77777777-7777-7777-7777-000000000006', '66666666-6666-6666-6666-000000000002', 'AOTHET-01', 15500000, 19400000, 12314, '{"color": "Đen có chữ", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000007', '66666666-6666-6666-6666-000000000002', 'AOTHET-02', 14500000, 18100000, 12319, '{"color": "Nâu su đúc", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000008', '66666666-6666-6666-6666-000000000002', '166242-DEN-XL-61-69KG', 9900000, NULL, 23156, '{"color": "Đen", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000009', '66666666-6666-6666-6666-000000000002', '166242-HONG-XL-61-69KG', 9900000, 12400000, 23158, '{"color": "Hồng", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000010', '66666666-6666-6666-6666-000000000002', 'AOTHET-05', 15900000, 19900000, 12317, '{"color": "Đen su đúc", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000011', '66666666-6666-6666-6666-000000000002', '166242-DA-M-40-50-KG', 9900000, NULL, 22562, '{"color": "Da", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000012', '66666666-6666-6666-6666-000000000002', 'AOTHET-07', 15500000, 19400000, 12311, '{"color": "Trắng có chữ", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000013', '66666666-6666-6666-6666-000000000002', 'AOTHET-08', 15500000, 19400000, 12317, '{"color": "Trắng có chữ", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000014', '66666666-6666-6666-6666-000000000002', '166242-XANH-LA-XL-61-69KG', 9900000, NULL, 23133, '{"color": "Xanh lá", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000015', '66666666-6666-6666-6666-000000000002', 'AOTHET-10', 15500000, 19400000, 154997, '{"color": "Đen có chữ", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000016', '66666666-6666-6666-6666-000000000002', 'AOTHET-11', 15900000, 19900000, 12316, '{"color": "Kem su đúc", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000017', '66666666-6666-6666-6666-000000000002', '166242-DEN-M-40-50-KG', 9900000, NULL, 23148, '{"color": "Đen", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000018', '66666666-6666-6666-6666-000000000002', '166242-DA-XL-61-69KG', 9900000, 12400000, 22944, '{"color": "Da", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000019', '66666666-6666-6666-6666-000000000002', '166242-XANH-LA-M-40-50-KG', 9900000, 12400000, 23091, '{"color": "Xanh lá", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000020', '66666666-6666-6666-6666-000000000002', '166242-HONG-L-51-60-KG', 9900000, NULL, 22997, '{"color": "Hồng", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000021', '66666666-6666-6666-6666-000000000002', 'AOTHET-16', 15500000, 19400000, 12315, '{"color": "Trắng có chữ", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000022', '66666666-6666-6666-6666-000000000002', '166242-DA-L-51-60-KG', 9900000, 12400000, 22587, '{"color": "Da", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000023', '66666666-6666-6666-6666-000000000002', '166242-DEN-L-51-60-KG', 9900000, NULL, 23079, '{"color": "Đen", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000024', '66666666-6666-6666-6666-000000000002', 'AOTHET-19', 15900000, 19900000, 12314, '{"color": "Đen su đúc", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000025', '66666666-6666-6666-6666-000000000002', 'AOTHET-20', 14900000, 18600000, 12313, '{"color": "Xám có chữ", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000026', '66666666-6666-6666-6666-000000000002', 'AOTHET-21', 15900000, NULL, 12309, '{"color": "Kem su đúc", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000027', '66666666-6666-6666-6666-000000000002', 'AOTHET-22', 15900000, 19900000, 12304, '{"color": "Kem su đúc", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000028', '66666666-6666-6666-6666-000000000002', 'AOTHET-23', 14900000, 18600000, 12318, '{"color": "Xám có chữ", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000029', '66666666-6666-6666-6666-000000000002', 'AOTHET-24', 15900000, NULL, 12315, '{"color": "Đen su đúc", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000030', '66666666-6666-6666-6666-000000000002', 'AOTHET-25', 14500000, 18100000, 12315, '{"color": "Nâu su đúc", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000031', '66666666-6666-6666-6666-000000000002', '166242-HONG-M-40-50-KG', 9900000, 12400000, 23143, '{"color": "Hồng", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000032', '66666666-6666-6666-6666-000000000002', 'AOTHET-27', 14900000, NULL, 12317, '{"color": "Xám có chữ", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000033', '66666666-6666-6666-6666-000000000002', '166242-XANH-LA-L-51-60-KG', 9900000, 12400000, 23054, '{"color": "Xanh lá", "size": "L (51 - 60 kg)"}'),
  ('77777777-7777-7777-7777-000000000034', '66666666-6666-6666-6666-000000000002', 'AOTHET-29', 15500000, 19400000, 12315, '{"color": "Đen có chữ", "size": "XL ( 61 - 69kg)"}'),
  ('77777777-7777-7777-7777-000000000035', '66666666-6666-6666-6666-000000000002', 'AOTHET-30', 14500000, NULL, 12317, '{"color": "Nâu su đúc", "size": "M (40 - 50 kg)"}'),
  ('77777777-7777-7777-7777-000000000036', '66666666-6666-6666-6666-000000000003', '166239-TRANG-CROPTOP', 23900000, 29900000, 2243, '{"color": "Xám Đậm croptop"}'),
  ('77777777-7777-7777-7777-000000000037', '66666666-6666-6666-6666-000000000003', '166239-TIM-CROPTOP', 23900000, 29900000, 2258, '{"color": "Tím croptop"}'),
  ('77777777-7777-7777-7777-000000000038', '66666666-6666-6666-6666-000000000003', '166239-XANH-REU-CROPTOP', 23900000, NULL, 2236, '{"color": "Xanh rêu croptop"}'),
  ('77777777-7777-7777-7777-000000000039', '66666666-6666-6666-6666-000000000003', '166239-HONG-CROPTOP', 23900000, 29900000, 2212, '{"color": "Hồng croptop"}'),
  ('77777777-7777-7777-7777-000000000040', '66666666-6666-6666-6666-000000000003', '166239-DA-CROPTOP', 23900000, 29900000, 2271, '{"color": "Da croptop"}'),
  ('77777777-7777-7777-7777-000000000041', '66666666-6666-6666-6666-000000000003', '166239-DEN-FORM-OM', 16900000, NULL, 12287, '{"color": "Đen Form Ôm"}'),
  ('77777777-7777-7777-7777-000000000042', '66666666-6666-6666-6666-000000000003', '166239-HONG-FORM-OM', 16900000, 21100000, 12295, '{"color": "Hồng Form Ôm"}'),
  ('77777777-7777-7777-7777-000000000043', '66666666-6666-6666-6666-000000000003', '166239-TRANG-FORM-OM', 16900000, 21100000, 12302, '{"color": "Trắng Form Ôm"}'),
  ('77777777-7777-7777-7777-000000000044', '66666666-6666-6666-6666-000000000004', '166227-DEN-XL-55-61KG', 19900000, 24900000, 2130, '{"color": "Đen", "size": "XL (55 - 61kg)"}'),
  ('77777777-7777-7777-7777-000000000045', '66666666-6666-6666-6666-000000000004', '166227-DA-M-42-47KG', 19900000, 24900000, 2131, '{"color": "Da", "size": "M ( 42 - 47kg)"}'),
  ('77777777-7777-7777-7777-000000000046', '66666666-6666-6666-6666-000000000004', '166227-DA-L-48-54KG', 19900000, NULL, 2130, '{"color": "Da", "size": "L ( 48 - 54kg)"}'),
  ('77777777-7777-7777-7777-000000000047', '66666666-6666-6666-6666-000000000004', '166227-DA-XL-55-61KG', 19900000, 24900000, 2131, '{"color": "Da", "size": "XL (55 - 61kg)"}'),
  ('77777777-7777-7777-7777-000000000048', '66666666-6666-6666-6666-000000000004', '166227-DEN-M-42-47KG', 19900000, 24900000, 2130, '{"color": "Đen", "size": "M ( 42 - 47kg)"}'),
  ('77777777-7777-7777-7777-000000000049', '66666666-6666-6666-6666-000000000004', '166227-DEN-L-48-54KG', 19900000, NULL, 2130, '{"color": "Đen", "size": "L ( 48 - 54kg)"}'),
  ('77777777-7777-7777-7777-000000000050', '66666666-6666-6666-6666-000000000005', '166246-1-DOI-NGAU-NHIEN', 2000000, 2500000, 3225, '{"size": "1 đôi (ngẫu nhiên)"}'),
  ('77777777-7777-7777-7777-000000000051', '66666666-6666-6666-6666-000000000005', '166246-SET-5-DOI', 9000000, 11200000, 3229, '{"size": "Set 5 đôi"}'),
  ('77777777-7777-7777-7777-000000000052', '66666666-6666-6666-6666-000000000006', '166231-2-GHI', 18900000, 23600000, 2282, '{"size": "2 Ghi"}'),
  ('77777777-7777-7777-7777-000000000053', '66666666-6666-6666-6666-000000000006', '166231-GHI', 9900000, 12400000, 2598, '{"color": "Ghi"}'),
  ('77777777-7777-7777-7777-000000000054', '66666666-6666-6666-6666-000000000006', '166231-1-HONG-1-DEN', 18900000, NULL, 2255, '{"size": "1 Hồng + 1 Đen"}'),
  ('77777777-7777-7777-7777-000000000055', '66666666-6666-6666-6666-000000000006', '166231-2-DEN', 18900000, 23600000, 2274, '{"size": "2 Đen"}'),
  ('77777777-7777-7777-7777-000000000056', '66666666-6666-6666-6666-000000000006', '166231-2-HONG', 18900000, 23600000, 2288, '{"size": "2 Hồng"}'),
  ('77777777-7777-7777-7777-000000000057', '66666666-6666-6666-6666-000000000006', '166231-1-HONG-1-GHI', 18900000, NULL, 2622, '{"size": "1 Hồng + 1 Ghi"}'),
  ('77777777-7777-7777-7777-000000000058', '66666666-6666-6666-6666-000000000006', '166231-HONG', 9900000, 12400000, 2239, '{"color": "Hồng"}'),
  ('77777777-7777-7777-7777-000000000059', '66666666-6666-6666-6666-000000000006', '166231-1-DEN-1-GHI', 18900000, 23600000, 2181, '{"size": "1 Đen + 1 Ghi"}'),
  ('77777777-7777-7777-7777-000000000060', '66666666-6666-6666-6666-000000000006', '166231-DEN', 9900000, NULL, 2079, '{"color": "Đen"}'),
  ('77777777-7777-7777-7777-000000000061', '66666666-6666-6666-6666-000000000007', '166226-HONG', 15900000, 19900000, 23231, '{"color": "Hồng"}'),
  ('77777777-7777-7777-7777-000000000062', '66666666-6666-6666-6666-000000000007', '166226-XAM', 15900000, 19900000, 0, '{"color": "Xám"}'),
  ('77777777-7777-7777-7777-000000000063', '66666666-6666-6666-6666-000000000007', '166226-TRANG', 15900000, NULL, 0, '{"color": "Trắng"}'),
  ('77777777-7777-7777-7777-000000000064', '66666666-6666-6666-6666-000000000007', '166226-DEN', 15900000, 19900000, 23222, '{"color": "Đen"}'),
  ('77777777-7777-7777-7777-000000000065', '66666666-6666-6666-6666-000000000008', '166245-10-DOI', 10900000, 13600000, 2432, '{"size": "10 đôi"}'),
  ('77777777-7777-7777-7777-000000000066', '66666666-6666-6666-6666-000000000008', '166245-5-DOI', 6900000, 8600000, 2426, '{"size": "5 đôi"}'),
  ('77777777-7777-7777-7777-000000000067', '66666666-6666-6666-6666-000000000009', 'TATGAU-01', 9000000, 11200000, 5467, '{"size": "Free size"}'),
  ('77777777-7777-7777-7777-000000000068', '66666666-6666-6666-6666-000000000010', 'DANNGU-01', 5900000, 7400000, 1216, '{"size": "Free size"}'),
  ('77777777-7777-7777-7777-000000000069', '66666666-6666-6666-6666-000000000011', '166243-1-CAP-MAU-DA', 8900000, 11100000, 2420, '{"size": "1 cặp màu Da"}'),
  ('77777777-7777-7777-7777-000000000070', '66666666-6666-6666-6666-000000000011', '166243-1-CAP-MAU-DEN', 8900000, 11100000, 2433, '{"size": "1 cặp màu Đen"}'),
  ('77777777-7777-7777-7777-000000000071', '66666666-6666-6666-6666-000000000012', 'AOLOT-01', 16900000, 21100000, 1320, '{"color": "Đen", "size": "36 (V1 76 - 85cm)"}'),
  ('77777777-7777-7777-7777-000000000072', '66666666-6666-6666-6666-000000000012', 'AOLOT-02', 15900000, 19900000, 1321, '{"color": "Nâu", "size": "38 (V1 86 - 92cm)"}'),
  ('77777777-7777-7777-7777-000000000073', '66666666-6666-6666-6666-000000000012', 'AOLOT-03', 16900000, NULL, 1319, '{"color": "Màu nude", "size": "34 (V1 70-75cm)"}'),
  ('77777777-7777-7777-7777-000000000074', '66666666-6666-6666-6666-000000000012', 'AOLOT-04', 16900000, 21100000, 1321, '{"color": "Đen", "size": "34 (V1 70-75cm)"}'),
  ('77777777-7777-7777-7777-000000000075', '66666666-6666-6666-6666-000000000012', 'AOLOT-05', 16900000, 21100000, 1314, '{"color": "Màu nude", "size": "36 (V1 76 - 85cm)"}'),
  ('77777777-7777-7777-7777-000000000076', '66666666-6666-6666-6666-000000000012', 'AOLOT-06', 16900000, NULL, 1321, '{"color": "Đen", "size": "38 (V1 86 - 92cm)"}'),
  ('77777777-7777-7777-7777-000000000077', '66666666-6666-6666-6666-000000000012', 'AOLOT-07', 15900000, 19900000, 1321, '{"color": "Nâu", "size": "36 (V1 76 - 85cm)"}'),
  ('77777777-7777-7777-7777-000000000078', '66666666-6666-6666-6666-000000000012', 'AOLOT-08', 15900000, 19900000, 1321, '{"color": "Nâu", "size": "34 (V1 70-75cm)"}'),
  ('77777777-7777-7777-7777-000000000079', '66666666-6666-6666-6666-000000000012', 'AOLOT-09', 16900000, NULL, 1318, '{"color": "Màu nude", "size": "38 (V1 86 - 92cm)"}'),
  ('77777777-7777-7777-7777-000000000080', '66666666-6666-6666-6666-000000000013', 'AONGUC-01', 16900000, 21100000, 1228, '{"color": "Màu nude", "size": "36 (V1 83 - 88 cm)"}'),
  ('77777777-7777-7777-7777-000000000081', '66666666-6666-6666-6666-000000000013', 'AONGUC-02', 16900000, 21100000, 1230, '{"color": "Màu nude", "size": "38 (V1 89 - 94 cm)"}'),
  ('77777777-7777-7777-7777-000000000082', '66666666-6666-6666-6666-000000000013', 'AONGUC-03', 16900000, NULL, 1229, '{"color": "Đen", "size": "36 (V1 83 - 88 cm)"}'),
  ('77777777-7777-7777-7777-000000000083', '66666666-6666-6666-6666-000000000013', 'AONGUC-04', 16900000, 21100000, 1229, '{"color": "Đen", "size": "38 (V1 89 - 94 cm)"}'),
  ('77777777-7777-7777-7777-000000000084', '66666666-6666-6666-6666-000000000013', 'AONGUC-05', 16900000, 21100000, 1227, '{"color": "Màu nude", "size": "34 (V1 77 - 82 cm)"}'),
  ('77777777-7777-7777-7777-000000000085', '66666666-6666-6666-6666-000000000013', 'AONGUC-06', 16900000, NULL, 1230, '{"color": "Đen", "size": "34 (V1 77 - 82 cm)"}'),
  ('77777777-7777-7777-7777-000000000086', '66666666-6666-6666-6666-000000000013', 'AONGUC-07', 15900000, 19900000, 1231, '{"color": "Xám", "size": "34 (V1 77 - 82 cm)"}'),
  ('77777777-7777-7777-7777-000000000087', '66666666-6666-6666-6666-000000000013', 'AONGUC-08', 15900000, 19900000, 1231, '{"color": "Xám", "size": "36 (V1 83 - 88 cm)"}'),
  ('77777777-7777-7777-7777-000000000088', '66666666-6666-6666-6666-000000000013', 'AONGUC-09', 15900000, NULL, 1231, '{"color": "Xám", "size": "38 (V1 89 - 94 cm)"}'),
  ('77777777-7777-7777-7777-000000000089', '66666666-6666-6666-6666-000000000014', '166225-DEN-M-43-53-KG', 10900000, 13600000, 25362, '{"color": "Đen", "size": "M (43-53 kg)"}'),
  ('77777777-7777-7777-7777-000000000090', '66666666-6666-6666-6666-000000000014', '166225-DEN-L-54-64-KG', 10900000, 13600000, 25380, '{"color": "Đen", "size": "L (54-64 kg)"}'),
  ('77777777-7777-7777-7777-000000000091', '66666666-6666-6666-6666-000000000014', '166225-TRANG-M-43-53-KG', 10900000, NULL, 25266, '{"color": "Trắng", "size": "M (43-53 kg)"}'),
  ('77777777-7777-7777-7777-000000000092', '66666666-6666-6666-6666-000000000014', '166225-TRANG-L-54-64-KG', 10900000, 13600000, 25322, '{"color": "Trắng", "size": "L (54-64 kg)"}'),
  ('77777777-7777-7777-7777-000000000093', '66666666-6666-6666-6666-000000000014', '166225-TRANG-XL-65-75-KG', 10900000, 13600000, 25437, '{"color": "Trắng", "size": "XL (65-75 kg)"}'),
  ('77777777-7777-7777-7777-000000000094', '66666666-6666-6666-6666-000000000014', '166225-DEN-XL-65-75-KG', 10900000, NULL, 25416, '{"color": "Đen", "size": "XL (65-75 kg)"}'),
  ('77777777-7777-7777-7777-000000000095', '66666666-6666-6666-6666-000000000015', 'DAYAO-01', 900000, 1100000, 3124, '{"size": "Free size"}'),
  ('77777777-7777-7777-7777-000000000096', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-L-DA', 17900000, 22400000, 2311, '{"color": "Da", "size": "Combo 2 L"}'),
  ('77777777-7777-7777-7777-000000000097', '66666666-6666-6666-6666-000000000016', '166236-L-64-72-KG-DA', 9900000, 12400000, 2277, '{"color": "Da", "size": "L (64-72 kg)"}'),
  ('77777777-7777-7777-7777-000000000098', '66666666-6666-6666-6666-000000000016', '166236-XL-73-85-KG-DA', 9900000, NULL, 2295, '{"color": "Da", "size": "XL (73-85 kg)"}'),
  ('77777777-7777-7777-7777-000000000099', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-XL-DEN', 17900000, 22400000, 2303, '{"color": "Đen", "size": "Combo 2 XL"}'),
  ('77777777-7777-7777-7777-000000000100', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-M-DA', 17900000, 22400000, 2286, '{"color": "Da", "size": "Combo 2 M"}'),
  ('77777777-7777-7777-7777-000000000101', '66666666-6666-6666-6666-000000000016', '166236-M-55-63-KG-DA', 9900000, NULL, 2666, '{"color": "Da", "size": "M (55-63 kg)"}'),
  ('77777777-7777-7777-7777-000000000102', '66666666-6666-6666-6666-000000000016', '166236-M-55-63-KG-DEN', 9900000, 12400000, 2695, '{"color": "Đen", "size": "M (55-63 kg)"}'),
  ('77777777-7777-7777-7777-000000000103', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-L-DEN', 17900000, 22400000, 2315, '{"color": "Đen", "size": "Combo 2 L"}'),
  ('77777777-7777-7777-7777-000000000104', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-M-DEN', 17900000, NULL, 2314, '{"color": "Đen", "size": "Combo 2 M"}'),
  ('77777777-7777-7777-7777-000000000105', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-S-DA', 17900000, 22400000, 2291, '{"color": "Da", "size": "Combo 2 S"}'),
  ('77777777-7777-7777-7777-000000000106', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-S-DEN', 17900000, 22400000, 2309, '{"color": "Đen", "size": "Combo 2 S"}'),
  ('77777777-7777-7777-7777-000000000107', '66666666-6666-6666-6666-000000000016', '166236-XL-73-85-KG-DEN', 9900000, NULL, 2294, '{"color": "Đen", "size": "XL (73-85 kg)"}'),
  ('77777777-7777-7777-7777-000000000108', '66666666-6666-6666-6666-000000000016', '166236-S-54-KG-DA', 9900000, 12400000, 2553, '{"color": "Da", "size": "S (<54 kg)"}'),
  ('77777777-7777-7777-7777-000000000109', '66666666-6666-6666-6666-000000000016', '166236-S-54-KG-DEN', 9900000, 12400000, 3514, '{"color": "Đen", "size": "S (<54 kg)"}'),
  ('77777777-7777-7777-7777-000000000110', '66666666-6666-6666-6666-000000000016', '166236-L-64-72-KG-DEN', 9900000, NULL, 2308, '{"color": "Đen", "size": "L (64-72 kg)"}'),
  ('77777777-7777-7777-7777-000000000111', '66666666-6666-6666-6666-000000000016', '166236-COMBO-2-XL-DA', 17900000, 22400000, 2320, '{"color": "Da", "size": "Combo 2 XL"}'),
  ('77777777-7777-7777-7777-000000000112', '66666666-6666-6666-6666-000000000017', '166241-DEN-L-57-68-KG', 13500000, 16900000, 12320, '{"color": "Đen", "size": "L :  57 -  68 kg"}'),
  ('77777777-7777-7777-7777-000000000113', '66666666-6666-6666-6666-000000000017', '166241-DEN-XL-69-80-KG', 13500000, 16900000, 12322, '{"color": "Đen", "size": "XL: 69 - 80 kg"}'),
  ('77777777-7777-7777-7777-000000000114', '66666666-6666-6666-6666-000000000017', '166241-DA-M-45-56-KG', 13500000, NULL, 12312, '{"color": "Da", "size": "M:  45 - 56 kg"}'),
  ('77777777-7777-7777-7777-000000000115', '66666666-6666-6666-6666-000000000017', '166241-DA-L-57-68-KG', 13500000, 16900000, 12316, '{"color": "Da", "size": "L :  57 -  68 kg"}'),
  ('77777777-7777-7777-7777-000000000116', '66666666-6666-6666-6666-000000000017', '166241-DA-XL-69-80-KG', 13500000, 16900000, 12320, '{"color": "Da", "size": "XL: 69 - 80 kg"}'),
  ('77777777-7777-7777-7777-000000000117', '66666666-6666-6666-6666-000000000017', '166241-DEN-M-45-56-KG', 13500000, NULL, 12317, '{"color": "Đen", "size": "M:  45 - 56 kg"}'),
  ('77777777-7777-7777-7777-000000000118', '66666666-6666-6666-6666-000000000018', '166248-DUI-XL-64-73KG', 7900000, 9900000, 136423, '{"color": "Đùi", "size": "XL: 64 - 73kg"}'),
  ('77777777-7777-7777-7777-000000000119', '66666666-6666-6666-6666-000000000018', '166248-LUNG-M-40-53KG', 7900000, 9900000, 136434, '{"color": "Lửng", "size": "M: 40 - 53kg"}'),
  ('77777777-7777-7777-7777-000000000120', '66666666-6666-6666-6666-000000000018', '166248-LUNG-L-53-63KG', 7900000, NULL, 136430, '{"color": "Lửng", "size": "L: 53 - 63kg"}'),
  ('77777777-7777-7777-7777-000000000121', '66666666-6666-6666-6666-000000000018', '166248-LUNG-XL-64-73KG', 7900000, 9900000, 136432, '{"color": "Lửng", "size": "XL: 64 - 73kg"}'),
  ('77777777-7777-7777-7777-000000000122', '66666666-6666-6666-6666-000000000018', '166248-DUI-M-40-53KG', 7900000, 9900000, 136411, '{"color": "Đùi", "size": "M: 40 - 53kg"}'),
  ('77777777-7777-7777-7777-000000000123', '66666666-6666-6666-6666-000000000018', '166248-DUI-L-53-63KG', 7900000, NULL, 136421, '{"color": "Đùi", "size": "L: 53 - 63kg"}'),
  ('77777777-7777-7777-7777-000000000124', '66666666-6666-6666-6666-000000000019', '166249-1-CAI-NGAU-NHIEN', 8900000, 11100000, 2317, '{"size": "1 cái ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000125', '66666666-6666-6666-6666-000000000019', '166249-SET-3-CAI-MIX-MAU', 16900000, 21100000, 2317, '{"size": "Set 3 cái (mix màu)"}'),
  ('77777777-7777-7777-7777-000000000126', '66666666-6666-6666-6666-000000000020', '166234-DA-XL-56-65-KG', 10700000, 13400000, 58523, '{"color": "Da", "size": "XL (56-65 kg)"}'),
  ('77777777-7777-7777-7777-000000000127', '66666666-6666-6666-6666-000000000020', '166234-DEN-L-40-55-KG', 10700000, 13400000, 58539, '{"color": "Đen", "size": "L (40-55 kg)"}'),
  ('77777777-7777-7777-7777-000000000128', '66666666-6666-6666-6666-000000000020', '166234-DEN-XL-56-65-KG', 10700000, NULL, 58536, '{"color": "Đen", "size": "XL (56-65 kg)"}'),
  ('77777777-7777-7777-7777-000000000129', '66666666-6666-6666-6666-000000000020', '166234-DA-L-40-55-KG', 10700000, 13400000, 58539, '{"color": "Da", "size": "L (40-55 kg)"}'),
  ('77777777-7777-7777-7777-000000000130', '66666666-6666-6666-6666-000000000021', '166233-XL-64-70-KG-SET-5-CAI-MIX-MAU', 23900000, 29900000, 2665, '{"color": "XL (64-70 kg)", "size": "Set 5 cái mix màu"}'),
  ('77777777-7777-7777-7777-000000000131', '66666666-6666-6666-6666-000000000021', '166233-M-38-50-KG-1-CAI-MAU-NGAU-NHIEN', 4900000, 6100000, 2291, '{"color": "M (38-50 kg)", "size": "1 cái màu ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000132', '66666666-6666-6666-6666-000000000021', '166233-M-38-50-KG-SET-5-CAI-MIX-MAU', 23900000, NULL, 2227, '{"color": "M (38-50 kg)", "size": "Set 5 cái mix màu"}'),
  ('77777777-7777-7777-7777-000000000133', '66666666-6666-6666-6666-000000000021', '166233-L-51-63-KG-1-CAI-MAU-NGAU-NHIEN', 4900000, 6100000, 2270, '{"color": "L (51-63 kg)", "size": "1 cái màu ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000134', '66666666-6666-6666-6666-000000000021', '166233-L-51-63-KG-SET-5-CAI-MIX-MAU', 23900000, 29900000, 2209, '{"color": "L (51-63 kg)", "size": "Set 5 cái mix màu"}'),
  ('77777777-7777-7777-7777-000000000135', '66666666-6666-6666-6666-000000000021', '166233-XL-64-70-KG-1-CAI-MAU-NGAU-NHIEN', 4900000, NULL, 2285, '{"color": "XL (64-70 kg)", "size": "1 cái màu ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000136', '66666666-6666-6666-6666-000000000022', 'QUANKH-01', 16900000, 21100000, 2315, '{"size": "Set 5 cái(ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000137', '66666666-6666-6666-6666-000000000022', 'QUANKH-02', 3900000, 4900000, 2321, '{"size": "1 cái(ngẫu nhiên)"}'),
  ('77777777-7777-7777-7777-000000000138', '66666666-6666-6666-6666-000000000023', '166237-L-49-55KG-SET-5-CAI-MIX-MAU', 17500000, 21900000, 1225, '{"color": "L (49 - 55kg)", "size": "Set 5 cái (mix màu)"}'),
  ('77777777-7777-7777-7777-000000000139', '66666666-6666-6666-6666-000000000023', '166237-XL-56-70KG-1-CAI-NGAU-NHIEN', 3500000, 4400000, 1228, '{"color": "XL (56 - 70kg)", "size": "1 cái (ngẫu nhiên)"}'),
  ('77777777-7777-7777-7777-000000000140', '66666666-6666-6666-6666-000000000023', '166237-XL-56-70KG-SET-5-CAI-MIX-MAU', 17500000, NULL, 1221, '{"color": "XL (56 - 70kg)", "size": "Set 5 cái (mix màu)"}'),
  ('77777777-7777-7777-7777-000000000141', '66666666-6666-6666-6666-000000000023', '166237-M-40-48KG-1-CAI-NGAU-NHIEN', 3500000, 4400000, 1226, '{"color": "M (40 - 48kg)", "size": "1 cái (ngẫu nhiên)"}'),
  ('77777777-7777-7777-7777-000000000142', '66666666-6666-6666-6666-000000000023', '166237-M-40-48KG-SET-5-CAI-MIX-MAU', 17500000, 21900000, 1220, '{"color": "M (40 - 48kg)", "size": "Set 5 cái (mix màu)"}'),
  ('77777777-7777-7777-7777-000000000143', '66666666-6666-6666-6666-000000000023', '166237-L-49-55KG-1-CAI-NGAU-NHIEN', 3500000, NULL, 1216, '{"color": "L (49 - 55kg)", "size": "1 cái (ngẫu nhiên)"}'),
  ('77777777-7777-7777-7777-000000000144', '66666666-6666-6666-6666-000000000024', 'QUANLU-01', 2900000, 3600000, 3230, '{"size": "1c màu ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000145', '66666666-6666-6666-6666-000000000024', 'QUANLU-02', 8900000, 11100000, 3227, '{"size": "Set 3c ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000146', '66666666-6666-6666-6666-000000000025', '166235-SET-5-CAI-MIX-MAU-L-48-58-KG', 21900000, 27400000, 26435, '{"color": "Set 5 Cái (Mix màu)", "size": "L (48-58 kg)"}'),
  ('77777777-7777-7777-7777-000000000147', '66666666-6666-6666-6666-000000000025', '166235-1-CAI-M-38-48-KG', 6700000, 8400000, 26435, '{"color": "1 cái", "size": "M (38-48 kg)"}'),
  ('77777777-7777-7777-7777-000000000148', '66666666-6666-6666-6666-000000000025', '166235-SET-5-CAI-MIX-MAU-XL-59-70-KG', 21900000, NULL, 26434, '{"color": "Set 5 Cái (Mix màu)", "size": "XL (59-70 kg)"}'),
  ('77777777-7777-7777-7777-000000000149', '66666666-6666-6666-6666-000000000025', '166235-1-CAI-L-48-58-KG', 6700000, 8400000, 26423, '{"color": "1 cái", "size": "L (48-58 kg)"}'),
  ('77777777-7777-7777-7777-000000000150', '66666666-6666-6666-6666-000000000025', '166235-1-CAI-XL-59-70-KG', 6700000, 8400000, 26432, '{"color": "1 cái", "size": "XL (59-70 kg)"}'),
  ('77777777-7777-7777-7777-000000000151', '66666666-6666-6666-6666-000000000025', '166235-SET-5-CAI-MIX-MAU-M-38-48-KG', 21900000, NULL, 26435, '{"color": "Set 5 Cái (Mix màu)", "size": "M (38-48 kg)"}'),
  ('77777777-7777-7777-7777-000000000152', '66666666-6666-6666-6666-000000000026', '166238-DEN-XL-60-70-KG', 9700000, 12100000, 34503, '{"color": "Đen", "size": "XL (60-70 kg)"}'),
  ('77777777-7777-7777-7777-000000000153', '66666666-6666-6666-6666-000000000026', '166238-DA-M-40-50-KG', 9700000, 12100000, 34489, '{"color": "Da", "size": "M (40-50 kg)"}'),
  ('77777777-7777-7777-7777-000000000154', '66666666-6666-6666-6666-000000000026', '166238-DA-L-50-60KG', 9700000, NULL, 34476, '{"color": "Da", "size": "L(50-60kg)"}'),
  ('77777777-7777-7777-7777-000000000155', '66666666-6666-6666-6666-000000000026', '166238-DA-XL-60-70-KG', 9700000, 12100000, 34500, '{"color": "Da", "size": "XL (60-70 kg)"}'),
  ('77777777-7777-7777-7777-000000000156', '66666666-6666-6666-6666-000000000026', '166238-DEN-M-40-50-KG', 9700000, 12100000, 34490, '{"color": "Đen", "size": "M (40-50 kg)"}'),
  ('77777777-7777-7777-7777-000000000157', '66666666-6666-6666-6666-000000000026', '166238-DEN-L-50-60KG', 9700000, NULL, 34502, '{"color": "Đen", "size": "L(50-60kg)"}'),
  ('77777777-7777-7777-7777-000000000158', '66666666-6666-6666-6666-000000000027', '166228-QUAN-COOKIE', 19900000, 24900000, 0, '{"size": "Quần cookie"}'),
  ('77777777-7777-7777-7777-000000000159', '66666666-6666-6666-6666-000000000028', '166230-SET-3-CAI-MIX-MAU', 11900000, 14900000, 26431, '{"size": "Set 3 cái(mix màu)"}'),
  ('77777777-7777-7777-7777-000000000160', '66666666-6666-6666-6666-000000000028', '166230-SET-6-CAI-MIX-MAU', 22900000, 28600000, 26420, '{"size": "Set 6 Cái (mix màu)"}'),
  ('77777777-7777-7777-7777-000000000161', '66666666-6666-6666-6666-000000000028', '166230-1CAI-MAU-NGAU-NHIEN', 5900000, NULL, 26408, '{"size": "1cái màu ngẫu nhiên"}'),
  ('77777777-7777-7777-7777-000000000162', '66666666-6666-6666-6666-000000000029', 'SET3QU-01', 8900000, 11100000, 3225, '{"size": "Free size"}');

-- images (public/images/products — serve trực tiếp)
INSERT INTO product_images (id, product_id, url, alt, position) VALUES
  ('88888888-8888-8888-8888-000000000001', '66666666-6666-6666-6666-000000000001', '/images/products/ao-khoac-the-thao-1.jpg', 'Áo khoác thể thao zip — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000002', '66666666-6666-6666-6666-000000000001', '/images/products/ao-khoac-the-thao-2.jpg', 'Áo khoác thể thao zip — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000003', '66666666-6666-6666-6666-000000000002', '/images/products/ao-the-thao-hanabi-1.jpg', 'Áo thể thao Hanabi — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000004', '66666666-6666-6666-6666-000000000002', '/images/products/ao-the-thao-hanabi-2.jpg', 'Áo thể thao Hanabi — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000005', '66666666-6666-6666-6666-000000000003', '/images/products/ao-croptop-chong-nang-1.jpg', 'Áo croptop chống nắng cánh dơi — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000006', '66666666-6666-6666-6666-000000000003', '/images/products/ao-croptop-chong-nang-2.jpg', 'Áo croptop chống nắng cánh dơi — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000007', '66666666-6666-6666-6666-000000000004', '/images/products/quan-don-mong-cap-cao-1.jpg', 'Quần độn mỏng cạp cao chất su mịn — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000008', '66666666-6666-6666-6666-000000000004', '/images/products/quan-don-mong-cap-cao-2.jpg', 'Quần độn mỏng cạp cao chất su mịn — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000009', '66666666-6666-6666-6666-000000000005', '/images/products/set-tat-hanabi-5-doi-1.jpg', 'Set 5 đôi tất Hanabi — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000010', '66666666-6666-6666-6666-000000000005', '/images/products/set-tat-hanabi-5-doi-2.jpg', 'Set 5 đôi tất Hanabi — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000011', '66666666-6666-6666-6666-000000000006', '/images/products/khau-trang-chong-nang-uv-1.jpg', 'Khẩu trang chống nắng UV UPF50 — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000012', '66666666-6666-6666-6666-000000000006', '/images/products/khau-trang-chong-nang-uv-2.jpg', 'Khẩu trang chống nắng UV UPF50 — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000013', '66666666-6666-6666-6666-000000000007', '/images/products/khau-trang-vanh-che-3d-1.jpg', 'Khẩu trang vành che nắng 3D kháng khuẩn — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000014', '66666666-6666-6666-6666-000000000007', '/images/products/khau-trang-vanh-che-3d-2.jpg', 'Khẩu trang vành che nắng 3D kháng khuẩn — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000015', '66666666-6666-6666-6666-000000000008', '/images/products/dep-da-xo-ngon-1.jpg', 'Dép da xỏ ngón — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000016', '66666666-6666-6666-6666-000000000008', '/images/products/dep-da-xo-ngon-2.jpg', 'Dép da xỏ ngón — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000017', '66666666-6666-6666-6666-000000000009', '/images/products/tat-gau-co-ngan-tui-rut-1.jpg', 'Tất gấu cổ ngắn kèm túi rút — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000018', '66666666-6666-6666-6666-000000000009', '/images/products/tat-gau-co-ngan-tui-rut-2.jpg', 'Tất gấu cổ ngắn kèm túi rút — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000019', '66666666-6666-6666-6666-000000000010', '/images/products/dan-nguc-silicon-5-doi-1.jpg', 'Hộp 5 đôi dán ngực silicon hoa — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000020', '66666666-6666-6666-6666-000000000010', '/images/products/dan-nguc-silicon-5-doi-2.jpg', 'Hộp 5 đôi dán ngực silicon hoa — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000021', '66666666-6666-6666-6666-000000000011', '/images/products/dan-ti-silicone-hanabi-1.jpg', 'Miếng dán ti silicone tai thỏ Hanabi — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000022', '66666666-6666-6666-6666-000000000011', '/images/products/dan-ti-silicone-hanabi-2.jpg', 'Miếng dán ti silicone tai thỏ Hanabi — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000023', '66666666-6666-6666-6666-000000000012', '/images/products/ao-lot-su-duc-khong-gong-1.jpg', 'Áo lót su đúc không gọng đệm mỏng — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000024', '66666666-6666-6666-6666-000000000012', '/images/products/ao-lot-su-duc-khong-gong-2.jpg', 'Áo lót su đúc không gọng đệm mỏng — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000025', '66666666-6666-6666-6666-000000000013', '/images/products/ao-nguc-su-duc-nang-1.jpg', 'Áo ngực su đúc không gọng đệm 3cm — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000026', '66666666-6666-6666-6666-000000000013', '/images/products/ao-nguc-su-duc-nang-2.jpg', 'Áo ngực su đúc không gọng đệm 3cm — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000027', '66666666-6666-6666-6666-000000000014', '/images/products/dai-nit-bung-thong-hoi-1.jpg', 'Đai nịt bụng thông hơi chống cuộn — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000028', '66666666-6666-6666-6666-000000000014', '/images/products/dai-nit-bung-thong-hoi-2.jpg', 'Đai nịt bụng thông hơi chống cuộn — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000029', '66666666-6666-6666-6666-000000000015', '/images/products/day-ao-nguc-trong-suot-1.jpg', 'Dây áo ngực trong suốt móc sắt — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000030', '66666666-6666-6666-6666-000000000015', '/images/products/day-ao-nguc-trong-suot-2.jpg', 'Dây áo ngực trong suốt móc sắt — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000031', '66666666-6666-6666-6666-000000000016', '/images/products/gen-nit-bung-latex-1.jpg', 'Gen nịt bụng latex định hình eo — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000032', '66666666-6666-6666-6666-000000000016', '/images/products/gen-nit-bung-latex-2.jpg', 'Gen nịt bụng latex định hình eo — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000033', '66666666-6666-6666-6666-000000000017', '/images/products/quan-gen-nit-bung-moc-cai-1.jpg', 'Quần gen nịt bụng đúc su móc cài — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000034', '66666666-6666-6666-6666-000000000017', '/images/products/quan-gen-nit-bung-moc-cai-2.jpg', 'Quần gen nịt bụng đúc su móc cài — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000035', '66666666-6666-6666-6666-000000000018', '/images/products/quan-nano-sinh-nhiet-tan-mo-1.jpg', 'Quần nano sinh nhiệt tan mỡ bụng — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000036', '66666666-6666-6666-6666-000000000018', '/images/products/quan-nano-sinh-nhiet-tan-mo-2.jpg', 'Quần nano sinh nhiệt tan mỡ bụng — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000037', '66666666-6666-6666-6666-000000000019', '/images/products/quan-lot-cotton-khong-duong-may-1.jpg', 'Quần lót cotton không đường may — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000038', '66666666-6666-6666-6666-000000000019', '/images/products/quan-lot-cotton-khong-duong-may-2.jpg', 'Quần lót cotton không đường may — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000039', '66666666-6666-6666-6666-000000000020', '/images/products/quan-lot-mac-trong-vay-1.jpg', 'Quần lót mặc trong váy chống lộ — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000040', '66666666-6666-6666-6666-000000000020', '/images/products/quan-lot-mac-trong-vay-2.jpg', 'Quần lót mặc trong váy chống lộ — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000041', '66666666-6666-6666-6666-000000000021', '/images/products/quan-lot-air-tang-hinh-1.jpg', 'Quần lót Air tăng hình lai băng siêu nhẹ — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000042', '66666666-6666-6666-6666-000000000021', '/images/products/quan-lot-air-tang-hinh-2.jpg', 'Quần lót Air tăng hình lai băng siêu nhẹ — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000043', '66666666-6666-6666-6666-000000000022', '/images/products/quan-lot-cotton-khang-khuan-1.jpg', 'Quần lót cotton kháng khuẩn — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000044', '66666666-6666-6666-6666-000000000022', '/images/products/quan-lot-cotton-khang-khuan-2.jpg', 'Quần lót cotton kháng khuẩn — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000045', '66666666-6666-6666-6666-000000000023', '/images/products/quan-lot-duc-su-chong-lo-1.jpg', 'Quần lót đúc su tăng hình chống lộ vi — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000046', '66666666-6666-6666-6666-000000000023', '/images/products/quan-lot-duc-su-chong-lo-2.jpg', 'Quần lót đúc su tăng hình chống lộ vi — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000047', '66666666-6666-6666-6666-000000000024', '/images/products/quan-lot-hanabi-su-lua-1.jpg', 'Quần lót Hanabi su lụa cao cấp — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000048', '66666666-6666-6666-6666-000000000024', '/images/products/quan-lot-hanabi-su-lua-2.jpg', 'Quần lót Hanabi su lụa cao cấp — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000049', '66666666-6666-6666-6666-000000000025', '/images/products/quan-lot-duc-su-tim-1.jpg', 'Quần lót đúc su tím thun lụa — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000050', '66666666-6666-6666-6666-000000000025', '/images/products/quan-lot-duc-su-tim-2.jpg', 'Quần lót đúc su tím thun lụa — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000051', '66666666-6666-6666-6666-000000000026', '/images/products/quan-lot-su-cap-cao-1.jpg', 'Quần lót su cạp cao năng mỏng gen — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000052', '66666666-6666-6666-6666-000000000026', '/images/products/quan-lot-su-cap-cao-2.jpg', 'Quần lót su cạp cao năng mỏng gen — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000053', '66666666-6666-6666-6666-000000000027', '/images/products/set-4-quan-lot-hop-qua-1.jpg', 'Set 4 quần lót su full hộp quà gấu Cookie — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000054', '66666666-6666-6666-6666-000000000027', '/images/products/set-4-quan-lot-hop-qua-2.jpg', 'Set 4 quần lót su full hộp quà gấu Cookie — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000055', '66666666-6666-6666-6666-000000000028', '/images/products/set-6-quan-chip-1.jpg', 'Set 6 quần chip su thạch tan — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000056', '66666666-6666-6666-6666-000000000028', '/images/products/set-6-quan-chip-2.jpg', 'Set 6 quần chip su thạch tan — ảnh 2', 1),
  ('88888888-8888-8888-8888-000000000057', '66666666-6666-6666-6666-000000000029', '/images/products/set-3-quan-lot-mat-lanh-1.jpg', 'Set túi 3 quần lót su đúc mặt lạnh — ảnh 1', 0),
  ('88888888-8888-8888-8888-000000000058', '66666666-6666-6666-6666-000000000029', '/images/products/set-3-quan-lot-mat-lanh-2.jpg', 'Set túi 3 quần lót su đúc mặt lạnh — ảnh 2', 1);

-- coupons
INSERT INTO coupons (id, code, type, value, min_order_cents, expires_at, active) VALUES
  ('55555555-5555-5555-5555-555555555501', 'WELCOME10', 'PERCENT', 10, 0, NULL, true),
  ('55555555-5555-5555-5555-555555555502', 'GIAM50K', 'FIXED', 5000000, 30000000, NULL, true),
  ('55555555-5555-5555-5555-555555555503', 'TUANLE20', 'PERCENT', 20, 100000000, now() + interval '30 days', true);

-- cross-sell: mỗi sản phẩm link 2 sản phẩm kế tiếp trong cùng category (vòng tròn)
INSERT INTO related_products (product_id, related_product_id, type) VALUES
  ('66666666-6666-6666-6666-000000000001', '66666666-6666-6666-6666-000000000002', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000001', '66666666-6666-6666-6666-000000000003', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000002', '66666666-6666-6666-6666-000000000003', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000002', '66666666-6666-6666-6666-000000000004', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000003', '66666666-6666-6666-6666-000000000004', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000003', '66666666-6666-6666-6666-000000000001', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000004', '66666666-6666-6666-6666-000000000001', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000004', '66666666-6666-6666-6666-000000000002', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000005', '66666666-6666-6666-6666-000000000006', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000005', '66666666-6666-6666-6666-000000000007', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000006', '66666666-6666-6666-6666-000000000007', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000006', '66666666-6666-6666-6666-000000000008', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000007', '66666666-6666-6666-6666-000000000008', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000007', '66666666-6666-6666-6666-000000000009', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000008', '66666666-6666-6666-6666-000000000009', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000008', '66666666-6666-6666-6666-000000000011', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000009', '66666666-6666-6666-6666-000000000011', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000009', '66666666-6666-6666-6666-000000000005', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000011', '66666666-6666-6666-6666-000000000005', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000011', '66666666-6666-6666-6666-000000000006', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000010', '66666666-6666-6666-6666-000000000012', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000010', '66666666-6666-6666-6666-000000000013', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000012', '66666666-6666-6666-6666-000000000013', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000012', '66666666-6666-6666-6666-000000000014', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000013', '66666666-6666-6666-6666-000000000014', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000013', '66666666-6666-6666-6666-000000000015', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000014', '66666666-6666-6666-6666-000000000015', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000014', '66666666-6666-6666-6666-000000000016', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000015', '66666666-6666-6666-6666-000000000016', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000015', '66666666-6666-6666-6666-000000000017', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000016', '66666666-6666-6666-6666-000000000017', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000016', '66666666-6666-6666-6666-000000000018', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000017', '66666666-6666-6666-6666-000000000018', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000017', '66666666-6666-6666-6666-000000000019', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000018', '66666666-6666-6666-6666-000000000019', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000018', '66666666-6666-6666-6666-000000000020', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000019', '66666666-6666-6666-6666-000000000020', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000019', '66666666-6666-6666-6666-000000000021', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000020', '66666666-6666-6666-6666-000000000021', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000020', '66666666-6666-6666-6666-000000000022', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000021', '66666666-6666-6666-6666-000000000022', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000021', '66666666-6666-6666-6666-000000000023', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000022', '66666666-6666-6666-6666-000000000023', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000022', '66666666-6666-6666-6666-000000000024', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000023', '66666666-6666-6666-6666-000000000024', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000023', '66666666-6666-6666-6666-000000000025', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000024', '66666666-6666-6666-6666-000000000025', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000024', '66666666-6666-6666-6666-000000000026', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000025', '66666666-6666-6666-6666-000000000026', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000025', '66666666-6666-6666-6666-000000000027', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000026', '66666666-6666-6666-6666-000000000027', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000026', '66666666-6666-6666-6666-000000000028', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000027', '66666666-6666-6666-6666-000000000028', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000027', '66666666-6666-6666-6666-000000000029', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000028', '66666666-6666-6666-6666-000000000029', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000028', '66666666-6666-6666-6666-000000000010', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000029', '66666666-6666-6666-6666-000000000010', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-000000000029', '66666666-6666-6666-6666-000000000012', 'CROSS_SELL');

-- Demo blog posts for content marketing and SEO (ADR 0006)
INSERT INTO posts (id, title, slug, summary, content, featured_image, author, status, seo_title, seo_description, view_count, published_at) VALUES
  ('88888888-8888-8888-8888-000000000001',
   'Bí Quyết Chọn Đồ Lót Thoáng Khí & Êm Ái Cho Cả Ngày Dài',
   'bi-quyet-chon-do-lot-thoang-khi-em-ai',
   'Lựa chọn chất liệu đồ lót phù hợp không chỉ mang lại sự thoải mái tối đa mà còn bảo vệ sức khỏe làn da của bạn. Cùng myshop khám phá cẩm nang chọn đồ lót chuẩn boutique.',
   '<h2>1. Tầm quan trọng của chất liệu thoáng mát</h2><p>Đồ lót là lớp trang phục tiếp xúc trực tiếp nhất với cơ thể suốt ngày dài hoạt động. Khi thời tiết oi bức hoặc vận động nhiều, các chất liệu bí bách có thể gây khó chịu và kích ứng da.</p><p>Các dòng vải cotton tự nhiên và su lạnh cao cấp được xem là tiêu chuẩn vàng nhờ khả năng thấm hút mồ hôi và bề mặt mượt mà, thân thiện với làn da nhạy cảm.</p><h2>2. Ưu điểm vượt trội của đồ lót không đường may (Seamless)</h2><p>Thiết kế đúc su không đường viền giúp loại bỏ hoàn toàn cảm giác cộm ngứa hay để lại vết hằn khi mặc cùng trang phục bó sát như váy lụa hay quần âu.</p><blockquote>"Sự tự tin của một bộ trang phục bắt đầu từ lớp lót vừa vặn và êm ái bên trong."</blockquote><h2>3. Cách bảo quản để đồ lót luôn bền đẹp</h2><p>Giặt tay với nước ấm nhẹ hoặc dùng túi giặt chuyên dụng khi giặt máy là cách tốt nhất để giữ form dáng và độ đàn hồi của sợi vải.</p>',
   '/images/hero/lookbook-1.jpg',
   'myshop Editorial',
   'PUBLISHED',
   'Bí Quyết Chọn Đồ Lót Thoáng Khí & Êm Ái Cho Cả Ngày Dài | myshop Blog',
   'Cẩm nang chọn đồ lót chất liệu su lạnh, cotton kháng khuẩn thoáng mát, êm ái cho phái đẹp.',
   128,
   now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO post_related_products (post_id, product_id, position) VALUES
  ('88888888-8888-8888-8888-000000000001', '66666666-6666-6666-6666-000000000001', 0),
  ('88888888-8888-8888-8888-000000000001', '66666666-6666-6666-6666-000000000004', 1)
ON CONFLICT (post_id, product_id) DO NOTHING;

INSERT INTO posts (id, title, slug, summary, content, featured_image, author, status, seo_title, seo_description, view_count, published_at) VALUES
  ('88888888-8888-8888-8888-000000000002',
   'Xu Hướng Thời Trang Tối Giản (Minimalism) Năm 2026',
   'xu-huong-thoi-trang-toi-gian-minimalism-2026',
   'Phong cách tối giản không đơn thuần là sự giản lược chi tiết, mà là nghệ thuật tôn vinh chất liệu và đường cắt tinh xảo. Tìm hiểu cách xây dựng tủ đồ con nhộng (capsule wardrobe) cùng myshop.',
   '<h2>Nghệ thuật của sự giản lược</h2><p>Bước sang năm 2026, xu hướng thời trang hướng mạnh mẽ về sự bền vững và tính ứng dụng cao. Thay vì chạy theo những mốt ngắn hạn, người tiêu dùng hiện đại ưu tiên những món đồ có thể phối hợp linh hoạt cho nhiều dịp khác nhau.</p><h2>Cách xây dựng Capsule Wardrobe chuẩn gu</h2><ul><li><strong>Gam màu trung tính:</strong> Đen, trắng, kem, xám và be là nền tảng dễ kết hợp nhất.</li><li><strong>Đầu tư vào phom dáng:</strong> Một chiếc áo khoác hay áo croptop có đường may tỉ mỉ sẽ nâng tầm toàn bộ outfit.</li><li><strong>Phụ kiện tối giản:</strong> Những chi tiết nhỏ như khẩu trang chống nắng UV phom 3D hay nón trơn màu vừa bảo vệ vừa tạo điểm nhấn phong cách.</li></ul>',
   '/images/hero/lookbook-2.jpg',
   'Stylist Lan Anh',
   'PUBLISHED',
   'Xu Hướng Thời Trang Tối Giản 2026: Xây Dựng Tủ Đồ Capsule Wardrobe',
   'Khám phá xu hướng thời trang Minimalism 2026 và cách chọn trang phục tinh tế cho ngày thường.',
   95,
   now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO post_related_products (post_id, product_id, position) VALUES
  ('88888888-8888-8888-8888-000000000002', '66666666-6666-6666-6666-000000000027', 0),
  ('88888888-8888-8888-8888-000000000002', '66666666-6666-6666-6666-000000000023', 1)
ON CONFLICT (post_id, product_id) DO NOTHING;

COMMIT;