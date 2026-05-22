import { GoogleGenerativeAI } from '@google/generative-ai';

// Lấy API Key từ biến môi trường của Expo
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Lazy initialization: chỉ khởi tạo khi thực sự gọi API, kèm validation key
let _genAI = null;
const getGenAI = () => {
  if (!_genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error(
        '[PlantCareApp] Thiếu EXPO_PUBLIC_GEMINI_API_KEY trong file .env'
      );
    }
    _genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return _genAI;
};

/**
 * Phân tích hình ảnh cây trồng thông qua Gemini API
 * @param {string} base64Image - Chuỗi base64 của hình ảnh (không bao gồm tiền tố 'data:image/jpeg;base64,')
 */
export const analyzePlantImage = async (base64Image) => {
  try {
    const genAI = getGenAI();

    // Prompt yêu cầu AI trả về định dạng JSON nghiêm ngặt
    const prompt = `
      Bạn là một chuyên gia thực vật học và nông nghiệp.
      Hãy phân tích hình ảnh cây trồng này và trả về kết quả định dạng JSON chính xác.
      Không thêm bất kỳ văn bản nào bên ngoài JSON.
      Cấu trúc JSON bắt buộc:
      {
        "plantName": "Tên loại cây",
        "healthStatus": "Trạng thái sức khỏe (Khỏe mạnh / Cần chăm sóc / Đang bệnh)",
        "diseaseName": "Tên bệnh (nếu có, nếu không để null)",
        "solution": "Giải pháp hoặc cách chăm sóc cụ thể (tối đa 2-3 câu)",
        "waterIntervalDays": "Số ngày lý tưởng giữa các lần tưới nước (chỉ trả về số nguyên, ví dụ: 2, 3, 7, 15...)"
      }
    `;

    // Định dạng dữ liệu hình ảnh cho Gemini
    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg" // Mặc định là jpeg từ expo-image-picker
        }
      }
    ];

    // Gửi request với cơ chế fallback tự động để tránh lỗi 404 của model không tồn tại
    let result;
    try {
      console.log("Đang thử gọi Gemini 2.5 Flash qua API v1 ổn định...");
      // Tầng 1: Sử dụng model mới nhất và ổn định nhất gemini-2.5-flash qua v1 API
      const modelV1 = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1' });
      result = await modelV1.generateContent([prompt, ...imageParts]);
    } catch (errV1) {
      console.warn("Lỗi API v1 với gemini-2.5-flash, thử gemini-2.0-flash:", errV1);
      try {
        // Tầng 2: Sử dụng model thế hệ 2.0 gemini-2.0-flash (vô cùng phổ biến và hoạt động tốt)
        const modelV2 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        result = await modelV2.generateContent([prompt, ...imageParts]);
      } catch (errV2) {
        console.warn("Lỗi gemini-2.0-flash, thử gemini-2.5-flash qua v1beta:", errV2);
        // Tầng 3: Sử dụng gemini-2.5-flash qua v1beta
        const modelV3 = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        result = await modelV3.generateContent([prompt, ...imageParts]);
      }
    }

    const response = await result.response;
    const text = response.text();

    // Dọn dẹp chuỗi trả về để parse JSON an toàn (loại bỏ markdown block nếu có)
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Trích xuất JSON object đầu tiên bằng regex (an toàn hơn parse trực tiếp)
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("AI response không chứa JSON:", cleanedText);
      return { success: false, error: 'AI không trả về dữ liệu hợp lệ. Vui lòng thử lại với ảnh khác.' };
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return { success: true, data: parsedData };
    
  } catch (error) {
    console.error("Lỗi khi phân tích AI:", error);

    // Phân biệt lỗi khóa API bị rò rỉ (Leaked 403)
    if (error.message && (error.message.includes('leaked') || error.message.includes('API key was reported as leaked') || error.message.includes('403'))) {
      return {
        success: false,
        error: 'Khóa API Gemini hiện tại đã bị Google khóa do phát hiện rò rỉ (Leaked API Key - Lỗi 403).\n\n👉 Cách khắc phục rất đơn giản:\n1. Truy cập https://aistudio.google.com/ để tạo một API Key mới miễn phí.\n2. Mở file ".env" tại thư mục gốc dự án.\n3. Thay thế khóa cũ ở dòng "EXPO_PUBLIC_GEMINI_API_KEY" bằng khóa mới vừa tạo.\n4. Tắt Expo Server hiện tại và chạy lại bằng lệnh: "npx expo start --clear" để cập nhật cấu hình mới.'
      };
    }

    // Phân biệt lỗi cấu hình và lỗi mạng/API
    if (error.message && error.message.includes('GEMINI_API_KEY')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Chi tiết lỗi: ' + error.message };
  }
};
