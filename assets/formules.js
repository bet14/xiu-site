// =====================================================================
// COMBO (FORMULES) — dùng chung cho trang khách (assets/order.js) và máy chủ (worker/index.js)
//   id          : mã món combo trong menu.js (lấy tên combo để hiển thị)
//   starters    : các danh mục tính là món khai vị (entrée)
//   mains       : các danh mục tính là món chính của combo này
//   exclude     : mã món KHÔNG tính vào combo (nếu có)
//   drink       : mã món nước được thêm tự động
//   drink_cents : giá nước theo combo, tính bằng cent (0 = tặng, 100 = 1 €)
// Combo được áp theo thứ tự trong danh sách: mỗi món khai vị chỉ dùng cho một combo.
// Sửa bằng Notepad, giữ nguyên dấu ngoặc kép và dấu phẩy.
// =====================================================================
window.FORMULES = [
  {"id": "formule-plat", "starters": ["rouleaux", "nems"], "mains": ["speciaux", "pho", "bobun", "mixao", "comrang", "phoxao"], "exclude": [], "drink": "canette-33-cl", "drink_cents": 0},
  {"id": "formule-banh-mi", "starters": ["rouleaux", "nems"], "mains": ["banhmi"], "exclude": [], "drink": "canette-33-cl", "drink_cents": 100}
];
