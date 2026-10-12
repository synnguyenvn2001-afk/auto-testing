const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, BorderStyle } = require('docx');

const imageDir = path.join(__dirname, 'assets', 'images');
const outputDir = path.join(__dirname, 'output');

function createImage(imageFileName, width = 580, height = 340) {
  const imgPath = path.join(imageDir, imageFileName);
  if (!fs.existsSync(imgPath)) {
    console.warn(`File not found: ${imgPath}`);
    return null;
  }
  const imgBuffer = fs.readFileSync(imgPath);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new ImageRun({
        data: imgBuffer,
        transformation: {
          width: width,
          height: height,
        },
      }),
    ],
  });
}

function createCaption(captionText) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 50, after: 250 },
    children: [
      new TextRun({
        text: captionText,
        italics: true,
        size: 20, // 10pt
        color: '555555',
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 350, after: 150 },
  });
}

function h2(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 250, after: 100 },
  });
}

function p(text, bold = false) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text: text,
        bold: bold,
        size: 24, // 12pt
      }),
    ],
  });
}

function bullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix, bold: true, size: 24 }));
  }
  children.push(new TextRun({ text: text, size: 24 }));

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 50, after: 50 },
    children: children,
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 150 },
          children: [
            new TextRun({
              text: 'TÀI LIỆU HƯỚNG DẪN SỬ DỤNG HỆ THỐNG LANDBASE',
              bold: true,
              size: 32, // 16pt
              color: '1A365D',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 50, after: 300 },
          children: [
            new TextRun({
              text: 'Website: https://landbase.vn | Quy trình chuẩn (Happy Case) kèm ảnh chụp minh họa',
              italics: true,
              size: 22,
              color: '4A5568',
            }),
          ],
        }),

        // 1. KHỞI ĐỘNG
        h1('1. KHỞI ĐỘNG & CẤP QUYỀN VỊ TRÍ BAN ĐẦU'),
        p('Khi người dùng lần đầu tiên truy cập vào hệ thống Landbase tại https://landbase.vn, trình duyệt web sẽ hiển thị hộp thoại xin cấp quyền truy cập vị trí địa lý:'),
        bullet(' Mở trình duyệt web và truy cập: https://landbase.vn', 'Bước 1:'),
        bullet(' Khi xuất hiện hộp thoại thông báo “landbase.vn muốn biết vị trí của bạn”, chọn “Cho phép khi sử dụng trang web” (hoặc Cho phép mỗi khi truy cập).', 'Bước 2:'),
        createImage('image1.png', 520, 260),
        createCaption('Hình 1: Cho phép LandBase truy cập vị trí để tự động định vị bản đồ tới khu vực của bạn'),

        // 2. TÀI KHOẢN
        h1('2. QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN'),
        h2('2.1. Đăng ký tài khoản mới'),
        bullet(' Tại góc trên bên phải màn hình, nhấp vào nút Đăng nhập.', 'Bước 1:'),
        bullet(' Trong cửa sổ đăng nhập hiện ra, nhấp vào dòng liên kết “Thiết lập hồ sơ mới”.', 'Bước 2:'),
        bullet(' Nhập Tên đăng nhập, Mật khẩu (tối thiểu 8 ký tự, gồm chữ hoa, thường, số, ký tự đặc biệt) và Nhập lại mật khẩu.', 'Bước 3:'),
        bullet(' Nhấn nút Tạo tài khoản để hoàn tất. (Có thể nhấn “Tiếp tục với Google” để liên kết tài khoản Gmail).', 'Bước 4:'),
        createImage('image2.png', 480, 400),
        createCaption('Hình 2: Cửa sổ Đăng nhập và chuyển sang Tạo tài khoản mới'),

        h2('2.2. Đăng nhập hệ thống'),
        bullet(' Nhấp nút Đăng nhập ở góc trên bên phải màn hình.', 'Bước 1:'),
        bullet(' Nhập Tên đăng nhập và Mật khẩu.', 'Bước 2:'),
        bullet(' Nhấn Đăng nhập để truy cập vào hệ thống.', 'Bước 3:'),

        h2('2.3. Cập nhật thông tin cá nhân & Ảnh đại diện'),
        bullet(' Nhấp vào Avatar góc trên bên phải -> Chọn Tổng quan tài khoản (hoặc /tong-quan-tai-khoan).', 'Bước 1:'),
        bullet(' Tại tab Thông tin cá nhân, cập nhật Họ tên, Số điện thoại (10 số), Giới thiệu.', 'Bước 2:'),
        bullet(' Nhấp nút máy ảnh trên khung tròn đại diện để chọn ảnh từ máy tính tải lên.', 'Bước 3:'),
        bullet(' Nhấn Lưu thay đổi.', 'Bước 4:'),
        createImage('13_tong_quan_tai_khoan.png', 580, 320),
        createCaption('Hình 3: Giao diện Quản lý tài khoản cá nhân'),

        h2('2.4. Đổi mật khẩu tài khoản'),
        bullet(' Tại trang Tổng quan tài khoản, chọn tab Đổi mật khẩu.', 'Bước 1:'),
        bullet(' Nhập Mật khẩu hiện tại, Mật khẩu mới và Nhập lại mật khẩu mới.', 'Bước 2:'),
        bullet(' Nhấn nút Đổi mật khẩu để hoàn tất.', 'Bước 3:'),

        // 3. BẢN ĐỒ
        h1('3. BẢN ĐỒ QUY HOẠCH & BẤT ĐỘNG SẢN (BĐS360 MAP)'),
        p('Bản đồ quy hoạch là tính năng cốt lõi giúp tra cứu địa chính, thông tin quy hoạch sử dụng đất và dự án.'),
        createImage('03_ban_do_tong_quan.png', 580, 320),
        createCaption('Hình 4: Giao diện tổng quan Bản đồ BĐS360 Map và thanh tìm kiếm'),

        h2('3.1. Tìm kiếm theo Địa chỉ hoặc Tên khu vực'),
        bullet(' Nhấp vào ô tìm kiếm: “Tìm kiếm khu vực, địa chỉ hoặc toạ độ...”.', 'Bước 1:'),
        bullet(' Nhập tên đường, quận/huyện, địa danh hoặc tòa nhà (VD: Cầu Giấy, Hà Nội).', 'Bước 2:'),
        bullet(' Nhấp chọn gợi ý từ danh sách hoặc nhấn Enter để bản đồ phóng to vào vị trí.', 'Bước 3:'),

        h2('3.2. Tra cứu theo Đơn vị hành chính (Tỉnh/TP -> Phường/Xã)'),
        bullet(' Tại thanh tìm kiếm bản đồ, chọn tab Địa chỉ/Tọa độ.', 'Bước 1:'),
        bullet(' Nhấp chọn Tỉnh/thành phố trong danh sách (VD: Hà Nội).', 'Bước 2:'),
        bullet(' Nhấp chọn Phường/xã trực thuộc.', 'Bước 3:'),
        bullet(' Bản đồ tự động chuyển tâm và làm nổi bật ranh giới hành chính được chọn.', 'Bước 4:'),

        h2('3.3. Tra cứu theo Số tờ / Số thửa bản đồ địa chính'),
        bullet(' Chuyển sang tab Số tờ/Số thửa trên khung tìm kiếm.', 'Bước 1:'),
        bullet(' Chọn lần lượt Tỉnh/Thành phố, Quận/Huyện, Phường/Xã.', 'Bước 2:'),
        bullet(' Nhập Số tờ bản đồ và Số thửa đất (theo sổ đỏ/hồng).', 'Bước 3:'),
        bullet(' Nhấn nút Tìm kiếm để định vị chính xác vị trí ranh giới thửa đất.', 'Bước 4:'),
        createImage('04_ban_do_tra_cuu_thua.png', 580, 320),
        createCaption('Hình 5: Tab Tra cứu quy hoạch theo Số tờ / Số thửa'),

        h2('3.4. Bật/Tắt các Lớp bản đồ quy hoạch'),
        bullet(' Nhấp vào nút công cụ Lớp bản đồ trên màn hình bản đồ.', 'Bước 1:'),
        bullet(' Tùy chọn bật/tắt các lớp: Hiện trạng, QHSDD 2030, QH Chung 2030, QH Dự án.', 'Bước 2:'),
        bullet(' Kéo thanh trượt Opacity để điều chỉnh độ trong suốt của lớp quy hoạch.', 'Bước 3:'),
        createImage('05_ban_do_lop_quy_hoach.png', 580, 320),
        createCaption('Hình 6: Bảng chọn Lớp bản đồ quy hoạch'),

        h2('3.5. Sử dụng công cụ Đo vẽ trên bản đồ'),
        bullet(' Nhấn vào biểu tượng Cây bút / Thước đo trên thanh công cụ bản đồ.', 'Bước 1:'),
        bullet(' Chọn công cụ: Vẽ đường (đo khoảng cách), Vẽ đa giác (tính diện tích m² và chu vi) hoặc Vẽ tự do.', 'Bước 2:'),
        bullet(' Chọn màu sắc nét vẽ trên bảng màu.', 'Bước 3:'),
        bullet(' Nhấn Lưu bản vẽ, nhập tên và lưu vào Sổ tay cá nhân.', 'Bước 4:'),
        createImage('06_ban_do_cong_cu_ve.png', 580, 320),
        createCaption('Hình 7: Thanh công cụ Đo vẽ và khoanh vùng diện tích trên bản đồ'),

        // 4. SỔ TAY & SO SÁNH
        h1('4. SỔ TAY BẤT ĐỘNG SẢN & BẢNG SO SÁNH'),
        h2('4.1. Tạo Bảng so sánh bất động sản mới'),
        bullet(' Nhấp vào ảnh đại diện góc trên bên phải -> Chọn Danh sách bất động sản.', 'Bước 1:'),
        createImage('image3.png', 580, 320),
        createCaption('Hình 8: Menu truy cập Bảng so sánh bất động sản'),
        bullet(' Nhấn nút Thêm bảng ở góc trên bên phải.', 'Bước 2:'),
        createImage('image4.png', 580, 300),
        createCaption('Hình 9: Nhấn nút Thêm bảng'),
        bullet(' Nhập tên bảng muốn tạo (VD: So sánh nhà phố quận Đống Đa).', 'Bước 3:'),
        bullet(' Nhấn nút Tạo bảng để hoàn tất.', 'Bước 4:'),
        createImage('image5.png', 520, 240),
        createCaption('Hình 10: Nhập tên bảng và nhấn Tạo bảng'),

        h2('4.2. Đổi tên và Xóa bảng so sánh'),
        bullet(' Đổi tên: Chọn bảng -> Nhấn Sửa bảng -> Nhập tên mới -> Nhấn Lưu.', 'Thao tác:'),
        createImage('image6.png', 500, 220),
        createCaption('Hình 11: Nhấn Sửa bảng'),
        createImage('image7.png', 500, 220),
        createCaption('Hình 12: Nhập tên mới và xác nhận sửa bảng'),
        bullet(' Xóa bảng: Chọn bảng -> Nhấn Xóa bảng -> Nhấn Xác nhận trên hộp thoại cảnh báo.', 'Thao tác:'),
        createImage('image8.png', 520, 240),
        createCaption('Hình 13: Nhấn Xóa bảng'),
        createImage('image9.png', 520, 220),
        createCaption('Hình 14: Xác nhận xóa bảng so sánh'),

        // 5. TIN RAO VẶT
        h1('5. TIN RAO VẶT BẤT ĐỘNG SẢN'),
        h2('5.1. Xem danh sách và Lọc tìm kiếm tin rao'),
        bullet(' Truy cập mục Tin rao vặt trên menu (/tin-rao-vat).', 'Bước 1:'),
        bullet(' Dùng bộ lọc chọn: Nhu cầu (Bán/Cho thuê), Loại BĐS, Khu vực, Khoảng giá, Diện tích, Sắp xếp.', 'Bước 2:'),
        bullet(' Nhấn Áp dụng để cập nhật danh sách bài đăng.', 'Bước 3:'),
        createImage('07_tin_rao_vat_danh_sach.png', 580, 320),
        createCaption('Hình 15: Danh sách Tin rao vặt và thanh bộ lọc thông minh'),

        h2('5.2. Xem chi tiết thông tin Bất động sản'),
        bullet(' Nhấp chuột vào thẻ tin rao bất kỳ trong danh sách.', 'Bước 1:'),
        bullet(' Xem chi tiết: hình ảnh, giá, diện tích, pháp lý (sổ đỏ/hồng), SĐT người bán, tiện ích xung quanh, BĐS tương tự.', 'Bước 2:'),
        bullet(' Có thể nhấn Lưu để bookmark tin hoặc nhấn Chia sẻ (Facebook, Zalo, Copy link).', 'Bước 3:'),
        createImage('08_tin_rao_vat_chi_tiet.png', 580, 340),
        createCaption('Hình 16: Màn hình Chi tiết tin rao bất động sản toàn diện'),

        // 6. TIN TỨC
        h1('6. TIN TỨC THỊ TRƯỜNG & PHÁP LÝ'),
        h2('6.1. Xem tin tức theo Chuyên mục'),
        bullet(' Truy cập Tin tức thị trường (/tin-tuc-thi-truong).', 'Bước 1:'),
        bullet(' Chọn chuyên mục: Tin nổi bật, Tin địa phương, Tin vĩ mô, Tin đấu giá, Tin quy hoạch, Tin khởi công.', 'Bước 2:'),
        createImage('09_tin_tuc_thi_truong.png', 580, 320),
        createCaption('Hình 17: Giao diện Tin tức thị trường và phân loại chuyên mục'),

        h2('6.2. Tìm kiếm tin tức & Lưu bộ lọc'),
        bullet(' Nhập từ khóa tìm kiếm, chọn Danh mục và Khoảng thời gian.', 'Bước 1:'),
        bullet(' Nhấn Tìm kiếm (kính lúp tím).', 'Bước 2:'),
        bullet(' Nhấn Lưu bộ lọc, đặt tên bộ lọc và bật Nhận thông báo để lưu lại tra cứu nhanh lần sau.', 'Bước 3:'),
        createImage('10_tin_tuc_tim_kiem_bo_loc.png', 580, 320),
        createCaption('Hình 18: Giao diện Tìm kiếm tin tức và Quản lý bộ lọc đã lưu'),

        // 7. CÔNG CỤ TÀI CHÍNH
        h1('7. CÔNG CỤ TIỆN ÍCH TÀI CHÍNH'),
        h2('7.1. Công cụ Tính lãi vay'),
        bullet(' Chọn công cụ Tính lãi vay trên giao diện.', 'Bước 1:'),
        bullet(' Nhập Số tiền vay (VNĐ), Lãi suất (%/năm), Thời hạn vay (tháng).', 'Bước 2:'),
        bullet(' Nhấn Ước tính khoản vay để xem kết quả phân tích dòng tiền gốc và lãi trả hàng tháng.', 'Bước 3:'),
        createImage('11_cong_cu_tinh_lai_vay.png', 500, 320),
        createCaption('Hình 19: Cửa sổ Công cụ Tính lãi vay mua nhà'),
        createImage('11_ket_qua_tinh_lai_vay.png', 520, 320),
        createCaption('Hình 20: Bảng kết quả dự toán chi tiết kỳ trả nợ lãi vay'),

        h2('7.2. Công cụ Ước tính chi phí xây nhà'),
        bullet(' Nhấp chọn Ước tính chi phí xây nhà.', 'Bước 1:'),
        bullet(' Nhập Diện tích sàn (m²), Số tầng xây dựng, Chiều dài tường bao (m).', 'Bước 2:'),
        bullet(' Nhấn Tính toán để nhận bảng dự toán chi phí thi công tham khảo.', 'Bước 3:'),
        createImage('12_cong_cu_chi_phi_xay_dung.png', 500, 320),
        createCaption('Hình 21: Cửa sổ Công cụ Dự toán chi phí xây nhà'),

        // 8. CẨM NANG
        h1('8. CẨM NANG & TÀI LIỆU CHUYÊN GIA'),
        bullet(' Truy cập mục Cẩm nang (/cam-nang) hoặc Tài liệu (/tai-lieu).', 'Bước 1:'),
        bullet(' Nhập từ khóa tìm kiếm bài viết cẩm nang pháp lý, kinh nghiệm đầu tư.', 'Bước 2:'),
        bullet(' Tải tài liệu phân tích thị trường, mẫu hợp đồng nhà đất chuẩn về máy tính.', 'Bước 3:'),
        createImage('14_cam_nang_bds.png', 580, 320),
        createCaption('Hình 22: Màn hình Cẩm nang kiến thức và Tài liệu chuyên gia'),

        // 9. TRỢ LÝ AI
        h1('9. TRỢ LÝ AI (DASHBOARD AI)'),
        p('Hỗ trợ thẩm định và đánh giá nhanh tiềm năng bất động sản bằng trí tuệ nhân tạo:'),
        bullet(' Đăng nhập và truy cập Dashboard AI (hoặc biểu tượng chat AI).', 'Bước 1:'),
        bullet(' Nhập câu hỏi kèm địa chỉ cụ thể: “Phân tích cho tôi về khu vực 69 Nguyễn Hy Quang, Đống Đa, Hà Nội”.', 'Bước 2:'),
        bullet(' Nhấn Gửi câu hỏi để AI tổng hợp thông tin quy hoạch, lịch sử giá và đưa ra báo cáo phân tích ưu/nhược điểm.', 'Bước 3:'),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'HDSD_LandBase.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Tạo file Word thành công tại: ${outputPath}`);
});
