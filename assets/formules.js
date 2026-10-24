// =====================================================================
// NHÓM MÓN và COMBO (FORMULES)
// Dùng chung cho trang khách (assets/order.js), trang tiệm và máy chủ (worker/index.js).
// Sửa bằng Notepad: giữ nguyên dấu ngoặc kép, dấu phẩy. Không dùng dấu ngoặc nhọn trong ghi chú này.
//
// groups   : thứ tự và cách xếp nhóm khi hiện đơn.
//            cats = mã danh mục trong menu.js, items = mã món thêm vào nhóm, exclude = mã món loại ra
// drinks   : các món nước ĐƯỢC giảm theo combo (bia không có trong danh sách nên không giảm)
// auto_drink : món nước tự thêm khi khách có combo mà chưa chọn nước
//            (chỉ áp cho combo có auto không phải false; combo bánh mì: auto false, khách tự gọi nước 1 €)
// formules : starter + main → nước giá drink_cents (0 = tặng, 100 = 1 €).
//            Áp theo thứ tự: combo món chính (tặng nước) trước, combo bánh mì (nước 1 €) sau.
// =====================================================================
window.FORMULES = {
  "groups": [
    {"key": "entree", "cats": ["rouleaux", "nems"]},
    {"key": "plat", "cats": ["speciaux", "pho", "bobun", "mixao", "comrang", "phoxao"], "exclude": ["banh-gio-nouveau"]},
    {"key": "banhmi", "cats": ["banhmi"], "items": ["banh-gio-nouveau"]},
    {"key": "dessert", "cats": ["desserts"]},
    {"key": "boisson", "cats": ["boissons"]}
  ],
  "drinks": ["canette-33-cl", "the-jasmin-chaud", "cafe-expresso"],
  "auto_drink": "canette-33-cl",
  "formules": [
    {"id": "formule-plat", "starter": "entree", "main": "plat", "drink_cents": 0},
    {"id": "formule-banh-mi", "starter": "entree", "main": "banhmi", "drink_cents": 100, "auto": false}
  ]
};
