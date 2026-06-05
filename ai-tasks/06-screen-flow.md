# 06 — Screen Flow (quan hệ giữa các màn hình mock)

> 📖 **File tham chiếu** — bản đồ điều hướng giữa 27 màn trong [`mocks/mobile/`](../mocks/mobile/).
> Dùng để: dựng `navigation` (MOB-0.5), biết màn nào push màn nào, và hiểu workflow PH↔GV.
> Sơ đồ **database** xem [`05-erd-and-ui-mapping.md`](./05-erd-and-ui-mapping.md). Đọc từ
> `phone-tabbar` + các nút/`chevron`/`onclick` trong từng file mock.

Ký hiệu: **▭ tab** (bottom tab) · **▢ pushed** (đẩy stack) · **◇ modal/form** · đường nét
đứt = deep-link từ notification.

---

## 1. Luồng khởi động & xác thực (chung)

```mermaid
flowchart LR
  M0[M0 Splash<br/>gọi /auth/me] -->|chưa đăng nhập| M1[M1 Login]
  M0 -->|đã đăng nhập, role=PARENT| PH[Parent App]
  M0 -->|đã đăng nhập, role=TEACHER/NURSE| TH[Teacher App]
  M1 -->|Đăng ký| M2[M2 Register]
  M1 -->|Quên mật khẩu| FP[(Forgot — web/email)]
  M2 -->|tạo xong| M1
  M1 -->|login PARENT| PH
  M1 -->|login TEACHER/NURSE| TH
```

---

## 2. App Phụ huynh (PARENT) — 5 tab + màn đẩy

```mermaid
flowchart TD
  subgraph TABS["▭ Bottom tabs (Phụ huynh)"]
    direction LR
    T1[M3a Trang chủ]
    T2[M4 Con tôi]
    T3[Tin nhắn]
    T4[M14/M17 Thông báo]
    T5[M16 Hồ sơ]
  end

  %% Home
  T1 -->|card 'hóa đơn chưa TT'| INV[M13 Học phí]
  T1 -->|thông báo gần đây| ANN[M14 Bảng tin]
  T1 -->|card con| DET[M5 Hồ sơ bé]

  %% Con tôi
  T2 -->|chọn bé| DET
  DET -->|chip Điểm danh| HIS[M7 Lịch sử điểm danh]
  DET -->|chip Báo cáo| FEED[M9 Feed báo cáo]
  DET -->|chip Sức khỏe| MED[M10 Yêu cầu thuốc]
  DET -->|chip Học phí| INV
  DET -->|chip Hình ảnh| PHO[(Album ảnh)]

  %% Thuốc
  MED -->|nút +| MEDC[M11 Tạo y/c thuốc]
  MED -->|chọn item| MEDD[M12 Chi tiết + timeline]

  %% Tài chính
  INV -->|nút thanh toán| PAY[P13 Thanh toán online]

  %% Tính năng phụ huynh khác
  T2 -.->|menu/đa năng| MENU[P14 Thực đơn tuần]
  DET -.->|hành động| LEAVE[P15 Xin nghỉ học]

  %% Tin nhắn
  T3 -->|chọn cô| THREAD[P16 Chat với cô]

  %% Thông báo
  T4 --> ANN
  T4 --> NOTIF[M17 Thông báo đẩy]

  %% Hồ sơ
  T5 -->|đổi mật khẩu / ngôn ngữ / logout| T5
```

> Ghi chú điều hướng PH:
> - `Thực đơn` (P14) và `Xin nghỉ` (P15) là tính năng PH nhưng mock đặt tab thứ 3 không
>   nhất quán (xem ⚪ trong [04-mobile-tasks §MOB-0.5](./04-mobile-tasks.md)). Đề xuất:
>   đặt **lối vào P14/P15 trong M5 (Hồ sơ bé)** hoặc một menu "Tiện ích" ở Home.
> - `M17` (push) khác `M14` (bảng tin announcement): M17 là feed thông báo cá nhân, bấm
>   vào sẽ **deep-link** sang màn nguồn (xem §4).

---

## 3. App Giáo viên / Y tá (TEACHER / NURSE) — 5 tab + màn đẩy

```mermaid
flowchart TD
  subgraph TABS2["▭ Bottom tabs (Giáo viên)"]
    direction LR
    G1[M3b Trang chủ]
    G2[Lớp]
    G3[M8 Báo cáo]
    G4[Thông báo]
    G5[M16 Hồ sơ]
  end

  %% Home quick actions
  G1 -->|Điểm danh| MARK[M6 Điểm danh lớp]
  G1 -->|Báo cáo| COMP[M8 Soạn báo cáo]
  G1 -->|Thông báo| ANNC[M15 Soạn thông báo]
  G1 -->|'N bé chưa điểm danh'| MARK
  G1 -->|'N báo cáo thiếu'| COMP

  %% Tab Lớp
  G2 --> ROST[T4 Sĩ số lớp]
  ROST -->|chọn bé| DET2[M5 Hồ sơ bé]
  G2 -->|giáo án| LP[T8 Giáo án tuần]
  G2 -->|duyệt thuốc| APPR[T9 Duyệt y/c thuốc]
  LP -->|+ Hoạt động| LPA[◇ Form hoạt động]
  MARK -->|Lưu thay đổi N| ROST

  %% Báo cáo
  G3 --> COMP
  COMP -->|Lưu báo cáo| G3

  %% Thông báo (GV cũng soạn)
  G4 -->|+ Soạn| ANNC
  G4 --> NOTIF2[M17 Thông báo đẩy]

  %% Tin nhắn (hộp thư GV)
  G2 -.->|hộp thư| INBOX[T12 Hộp thư phụ huynh]
  INBOX -->|chọn PH| THREAD2[P16 Chat]

  %% Y tá: duyệt + cho uống
  APPR -->|Duyệt/Từ chối| APPR
  APPR -->|xem chi tiết| MEDD2[M12 Chi tiết + cho uống]
```

> Ghi chú điều hướng GV:
> - `T12 Hộp thư` (inbox của cô) và `P16 Chat` dùng **chung component thread**; chỉ khác
>   điểm vào (cô vào từ inbox, PH vào thẳng cô của lớp con).
> - `T9 Duyệt thuốc` + `M12 Chi tiết` là màn dùng chung cho **NURSE**; route NURSE tái dùng
>   stack y tế (xem MOB-0.5).

---

## 4. Deep-link từ Thông báo đẩy (M17) → màn nguồn

```mermaid
flowchart LR
  N[M17 Notification] -->|type=ATTENDANCE| H7[M7 Lịch sử điểm danh]
  N -->|type=REPORT| F9[M9 Feed báo cáo]
  N -->|type=ANNOUNCEMENT| A14[M14 Bảng tin]
  N -->|type=INVOICE| I13[M13 Học phí]
  N -->|type=MEDICINE| M12d[M12 Chi tiết thuốc]
  N -->|type=MESSAGE| P16t[P16 Chat]
  N -->|type=LEAVE| P15l[P15 Xin nghỉ / kết quả duyệt]
```

> `Notification.entityType` + `entityId` (xem [01 §C5](./01-database-schema.md)) quyết định
> đẩy tới màn nào — mobile map trong handler push (MOB-4).

---

## 5. Workflow tương tác chéo PH ↔ GV/Y tá (màn nào nối màn nào qua DỮ LIỆU)

> Đây là "mối quan hệ giữa các màn hình" ở góc nghiệp vụ: 1 hành động ở màn vai trò này
> tạo dữ liệu hiện lên màn vai trò kia (+ 1 push M17).

```mermaid
sequenceDiagram
  participant PH as Phụ huynh
  participant GV as Giáo viên
  participant YT as Y tá

  Note over GV: M6 Điểm danh (markBulk)
  GV->>PH: M7 Lịch sử + push ATTENDANCE

  Note over GV: M8 Soạn báo cáo
  GV->>PH: M9 Feed báo cáo + push REPORT

  Note over GV: M15 Soạn thông báo
  GV->>PH: M14 Bảng tin + push ANNOUNCEMENT

  Note over PH: M11 Tạo y/c thuốc
  PH->>YT: T9 Duyệt → M12 cho uống
  YT->>PH: M12 timeline + push MEDICINE

  Note over PH: P15 Xin nghỉ
  PH->>GV: duyệt (review)
  GV->>PH: kết quả + push LEAVE

  Note over PH,GV: P16/T12 Chat 2 chiều (+ push MESSAGE)

  Note over PH: P13 Thanh toán hóa đơn
  PH->>PH: M13 cập nhật PAID + push INVOICE
```

---

## 6. Bảng tra nhanh: màn → đi tới đâu

| Màn | Đi tới (nút/tab/chip) |
|-----|----------------------|
| M0 Splash | M1 hoặc Home theo role |
| M1 Login | M2, Home, Forgot |
| M3a Home PH | M5, M13, M14 |
| M4 Con tôi | M5 |
| M5 Hồ sơ bé | M7, M9, M10, M13, Album, (P14, P15) |
| M10 Thuốc | M11, M12 |
| M13 Học phí | P13 |
| M14/M17 Thông báo | deep-link §4 |
| Tin nhắn (PH) | P16 |
| M3b Home GV | M6, M8, M15 |
| Lớp (GV) | T4, T8, T9, T12 |
| T4 Sĩ số | M5, M6 |
| T9 Duyệt thuốc | M12 |
| T12 Hộp thư | P16 |
| M16 Hồ sơ | (đổi mật khẩu/ngôn ngữ/logout) |
</content>
