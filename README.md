# 🎨 AI Drawing Game - Trò Chơi Vẽ AI

**Vẽ tranh và để AI đoán!** - Game nhận diện hình vẽ bằng AI (ONNX Runtime Web)

🎮 **[CHƠI NGAY](https://[username].github.io/ai-drawing-game/)** *(Thay username sau khi deploy)*

---

## ✨ Tính năng

- 🎨 Vẽ tay trên canvas với hiệu ứng đầy màu sắc
- 🤖 AI nhận diện real-time (20 đối tượng)
- 📱 Responsive - Chạy mượt trên điện thoại
- ⏱️ 25 giây mỗi lượt - Thử thách vui!

---

## 🚀 Deploy lên GitHub Pages

### **Bước 1:** Tạo repository
```
- Vào https://github.com/new
- Tên: ai-drawing-game
- Chọn Public → Create
```

### **Bước 2:** Upload files
```
Kéo thả 5 files vào:
✅ index.html
✅ style.css
✅ app.js  
✅ game_model_160.onnx (21MB - Không lo lag!)
✅ README.md (file này)
```

### **Bước 3:** Bật GitHub Pages
```
Settings → Pages
→ Branch: main → /root → Save
→ Chờ 2 phút → Lấy link!
```

---

## 📱 Trên điện thoại

Mở link game bằng Chrome/Safari → Hoạt động ngay!
- Touch để vẽ
- Giao diện tự động điều chỉnh
- Mượt mà, không lag

---

## 🎯 20 từ trong game

Máy bay • Đồng hồ • Xe cứu thương • Thiên thần • Kiến  
Ba lô • Giỏ • Ong • Xe đạp • Ống nhòm  
Não • Xe ủi • Xe buýt • Bướm • Xương rồng  
Máy tính • Máy ảnh • Lửa trại • Lâu đài • Đèn chùm

---

## ❓ GitHub có giới hạn file 21MB không?

### ✅ **KHÔNG LO!**

| Giới hạn | GitHub | File của bạn | OK? |
|----------|--------|--------------|-----|
| **File đơn** | 25 MB | 21 MB (onnx) | ✅ OK |
| **Repo** | 1 GB | ~22 MB | ✅ OK |
| **Bandwidth** | 100 GB/tháng | ~22 MB/lượt chơi | ✅ OK |

**Chi tiết:**
- ✅ File ONNX 21MB < 25MB → Upload bình thường
- ✅ Lần đầu load ~22MB (model + scripts)
- ✅ Lần sau chỉ vài KB (nhờ cache)
- ✅ 100GB/tháng = ~4500 lượt chơi mới/tháng
- ✅ Người chơi cũ: 0 bandwidth (cache)

**Có lag không?**
- ❌ KHÔNG! GitHub Pages có CDN toàn cầu
- ✅ Load lần đầu: 5-30s (tùy mạng)
- ✅ Lần sau: Tức thì (offline)
- ✅ Chạy mượt như máy tính

---

## 💻 Công nghệ

- HTML5 Canvas
- ONNX Runtime Web (AI)
- Responsive CSS
- Vanilla JavaScript

---

Made with ❤️ in Vietnam
