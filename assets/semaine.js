// =====================================================================
// MÓN CỦA TUẦN — sửa file này mỗi tuần (mở bằng Notepad).
//   special : món đặc biệt thứ Sáu – thứ Bảy tuần này
//             (ảnh: assets/img/special.webp — đổi bằng công cụ doi-anh.html)
//   next    : món dự kiến tuần sau (để "" nếu chưa biết, ô sẽ ẩn)
//   past    : các món đã bán mấy tuần trước (thêm/bớt tuỳ ý)
// Mỗi ngôn ngữ một dòng; ngôn ngữ nào để "" thì dùng tiếng Pháp.
// =====================================================================
window.SEMAINE = {
  special: {
    name: { fr:"Bánh canh bò viên", en:"Bánh canh bò viên", vi:"Bánh canh bò viên", zh:"越南粗米面牛肉丸汤", ko:"반깐 보비엔" },
    desc: {
      fr:"Grosses nouilles faites maison, boulettes de bœuf maison, bouillon mijoté avec os et jarret.",
      en:"Thick homemade noodles, homemade beef balls, broth slow-cooked with bones and shank.",
      vi:"Sợi bánh canh tự làm, bò viên tự làm, nước dùng hầm xương và thịt bắp.",
      zh:"自制粗米面、自制牛肉丸，骨头和腱子肉慢炖的汤底。",
      ko:"직접 만든 굵은 면과 소고기 완자, 뼈와 사태로 오래 끓인 육수."
    }
  },
  next: { fr:"", en:"", vi:"", zh:"", ko:"" },
  past: ["Bún riêu cua", "Bánh canh hải sản", "Bò lá lốt bánh hỏi", "Bánh cuốn"]
};
