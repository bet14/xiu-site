// =====================================================================
// GIỜ MỞ CỬA — nguồn duy nhất cho: trang web (trạng thái Đang mở/Đã đóng,
// bảng giờ ở trang Infos, dòng giờ ở chân trang) và máy chủ đặt món
// (chế độ « Theo giờ mở cửa » ở trang /quan-ly).
// Sửa bằng trang quản trị (tab « Giờ mở cửa ») hoặc bằng Notepad.
//   days   : 0 = Chủ nhật … 6 = Thứ Bảy; mỗi khung giờ ["mở", "đóng"] dạng "HH:MM"
//            danh sách rỗng = ngày đó nghỉ
//   early  : nhận đơn sớm hơn giờ mở cửa bao nhiêu phút
//   before : ngừng nhận đơn trước giờ đóng bao nhiêu phút
// =====================================================================
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HORAIRES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    "days": {
      "0": [],
      "1": [["11:00", "15:00"], ["18:00", "21:00"]],
      "2": [["11:00", "15:00"], ["18:00", "21:00"]],
      "3": [["11:00", "15:00"], ["18:00", "21:00"]],
      "4": [["11:00", "15:00"], ["18:00", "21:00"]],
      "5": [["11:00", "21:00"]],
      "6": [["11:00", "21:00"]]
    },
    "early": 15,
    "before": 10
  };
});
