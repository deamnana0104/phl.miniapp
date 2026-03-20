import appConfig from "../../app-config.json";

export function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    currencyDisplay: "code",
  }).format(price);
}

export function formatDistant(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)} km`;
}

/**
 * Hàm xử lý URL hình ảnh để đảm bảo hiển thị đúng trên Mini App.
 * Trong môi trường dev, ta ép dùng URL tuyệt đối trỏ về backend port 10000.
 */
export function getFinalImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url;

  // Chuẩn hóa url: đảm bảo bắt đầu bằng /
  const path = url.startsWith("/") ? url : `/${url}`;

  // Nếu là môi trường dev (chạy local), ép dùng port 10000 của backend
  // Sử dụng 127.0.0.1 để ổn định hơn localhost trên một số máy
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `http://127.0.0.1:10000${path}`;
  }

  // Trường hợp production: lấy origin từ apiUrl trong config
  const apiUrl = appConfig.template.apiUrl;
  if (apiUrl.startsWith("http")) {
    try {
      const urlObj = new URL(apiUrl);
      return `${urlObj.origin}${path}`;
    } catch (e) {
      return path;
    }
  }

  return path;
}
