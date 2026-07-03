export type Role = "parent" | "teacher";

export type AttendanceStatus = "Có mặt" | "Muộn" | "Vắng" | "Phép";

export type Student = {
  id: string;
  name: string;
  className: string;
  age: number;
  initials: string;
  image?: string;
  status: AttendanceStatus;
  note: string;
  health: string;
};

export type Invoice = {
  id: string;
  title: string;
  studentName: string;
  amount: number;
  dueDate: string;
  status: "Chưa thanh toán" | "Quá hạn" | "Đã thanh toán";
};

export const assets = {
  logo: "/logo-kimthanh.png",
  teacher: "/mock-ui/images/teacher.jpg",
  parent: "/mock-ui/images/parent.jpg",
  avatar1: "/mock-ui/images/avatar-1.jpg",
  avatar2: "/mock-ui/images/avatar-2.jpg",
  avatar3: "/mock-ui/images/avatar-3.jpg",
};

export const students: Student[] = [
  {
    id: "minh",
    name: "Nguyễn Minh",
    className: "Lớp Mầm A",
    age: 4,
    initials: "N",
    image: assets.avatar1,
    status: "Có mặt",
    note: "Ăn hết suất, ngủ 2h, thích hoạt động tô màu.",
    health: "Dị ứng nhẹ với tôm. Không sốt.",
  },
  {
    id: "an",
    name: "Nguyễn An",
    className: "Lớp Chồi B",
    age: 5,
    initials: "N",
    image: assets.avatar2,
    status: "Muộn",
    note: "Đến lớp 08:15. Tâm trạng vui vẻ.",
    health: "Đang theo dõi ho nhẹ.",
  },
  {
    id: "chau",
    name: "Lê Bảo Châu",
    className: "Lớp Lá C",
    age: 6,
    initials: "L",
    image: assets.avatar3,
    status: "Có mặt",
    note: "Tham gia đọc truyện nhóm.",
    health: "Bình thường.",
  },
  {
    id: "hung",
    name: "Trần Hùng",
    className: "Lớp Mầm A",
    age: 4,
    initials: "T",
    status: "Có mặt",
    note: "Ăn 1/2 suất.",
    health: "Bình thường.",
  },
  {
    id: "mai",
    name: "Lê Mai",
    className: "Lớp Mầm A",
    age: 4,
    initials: "L",
    status: "Vắng",
    note: "Phụ huynh báo bé sốt nhẹ.",
    health: "Sốt 37.8 độ theo phụ huynh.",
  },
];

export const announcements = [
  {
    id: "field-trip",
    scope: "Lớp Mầm A",
    title: "Chuẩn bị đồ cho buổi dã ngoại thứ Sáu",
    time: "2 giờ trước",
    body: "Phụ huynh chuẩn bị nón, bình nước cá nhân và áo khoác mỏng cho bé.",
  },
  {
    id: "holiday",
    scope: "Trường",
    title: "Lịch nghỉ lễ 30/4 - 1/5",
    time: "Hôm qua",
    body: "Trường nghỉ từ 30/04 đến 01/05, đón bé trở lại vào ngày làm việc tiếp theo.",
  },
  {
    id: "menu",
    scope: "Bếp",
    title: "Cập nhật thực đơn tuần mới",
    time: "Thứ Hai",
    body: "Thực đơn đã bổ sung sữa chua và trái cây theo mùa vào bữa xế.",
  },
];

export const reports = [
  {
    id: "r1",
    date: "Thứ Ba 26/05",
    mood: "😊",
    teacher: "Cô Hà · Lớp Mầm A",
    meals: "Ăn hết suất, không ăn rau",
    nap: "Ngủ ngon 2h",
    activities: "Tô màu, hát, vận động ngoài trời",
  },
  {
    id: "r2",
    date: "Thứ Hai 25/05",
    mood: "😐",
    teacher: "Cô Hà · Lớp Mầm A",
    meals: "Ăn 1/2 phần",
    nap: "Khó ngủ",
    activities: "Vận động ngoài trời",
  },
];

export const medicines = [
  {
    id: "prospan",
    name: "Siro ho Prospan",
    studentName: "Bé Minh",
    dose: "5ml x 2 lần/ngày",
    period: "24/05 -> 27/05",
    status: "Đã cho uống",
    note: "Uống sau ăn sáng và xế chiều.",
  },
  {
    id: "hapacol",
    name: "Hapacol 250",
    studentName: "Bé An",
    dose: "1 gói khi sốt",
    period: "26/05 -> 28/05",
    status: "Đã duyệt",
    note: "Chỉ dùng khi nhiệt độ trên 38 độ.",
  },
  {
    id: "vitamin",
    name: "Vitamin C",
    studentName: "Bé Minh",
    dose: "1 viên/ngày",
    period: "26/05 -> 02/06",
    status: "Chờ duyệt",
    note: "Phụ huynh gửi kèm ảnh toa thuốc.",
  },
];

export const invoices: Invoice[] = [
  {
    id: "inv-5-minh",
    title: "Học phí Tháng 5/2026",
    studentName: "Bé Minh",
    amount: 1500000,
    dueDate: "31/05/2026",
    status: "Chưa thanh toán",
  },
  {
    id: "inv-5-an",
    title: "Học phí Tháng 5/2026",
    studentName: "Bé An",
    amount: 1500000,
    dueDate: "31/05/2026",
    status: "Quá hạn",
  },
  {
    id: "inv-4-minh",
    title: "Học phí Tháng 4/2026",
    studentName: "Bé Minh",
    amount: 1500000,
    dueDate: "30/04/2026",
    status: "Đã thanh toán",
  },
];

export const menuWeek = [
  ["Thứ 2", "Cháo thịt bằm", "Cơm gà sốt nấm", "Sữa chua"],
  ["Thứ 3", "Bánh mì trứng", "Canh bí + thịt kho", "Chuối"],
  ["Thứ 4", "Phở bò", "Cá sốt cà + rau", "Sữa tươi"],
  ["Thứ 5", "Nui gà", "Cơm thịt viên", "Dưa hấu"],
  ["Thứ 6", "Xôi đậu xanh", "Mì Ý bò bằm", "Bánh flan"],
];

export const notifications = [
  "Cô Hà vừa gửi báo cáo ngày cho Bé Minh.",
  "Vitamin C đang chờ giáo viên duyệt.",
  "Học phí tháng 5 của Bé An đã quá hạn.",
];

export const money = new Intl.NumberFormat("vi-VN");
