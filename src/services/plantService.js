import { supabase } from './supabaseClient';

// Bộ giải mã Base64 sang ArrayBuffer thuần JS, đảm bảo hoạt động 100% ổn định trên cả Web và Mobile Native (không phụ thuộc polyfill)
const base64ToArrayBuffer = (base64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  // Xử lý các ký tự padding '='
  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);
  
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }
  
  return arrayBuffer;
};

/**
 * Upload hình ảnh lên Supabase Storage và trả về URL
 */
export const uploadPlantImage = async (base64Data, userId) => {
  try {
    const filename = `${userId}/${Date.now()}.jpg`;
    const arrayBuffer = base64ToArrayBuffer(base64Data);

    const { data, error } = await supabase.storage
      .from('plants')
      .upload(filename, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('plants')
      .getPublicUrl(filename);

    return { success: true, url: publicUrl, storagePath: filename };
  } catch (error) {
    console.error("Lỗi upload ảnh Supabase:", error);
    return { success: false, error: 'Không thể tải ảnh lên hệ thống.' };
  }
};

/**
 * Thêm một cây mới vào Supabase
 */
export const addPlant = async (plantData) => {
  try {
    const { data, error } = await supabase
      .from('plants')
      .insert([
        {
          user_id: plantData.userId,
          name: plantData.name || plantData.plantName,
          plant_name: plantData.plantName,
          health_status: plantData.healthStatus,
          disease_name: plantData.diseaseName || null,
          solution: plantData.solution || null,
          water_interval_days: parseInt(plantData.waterIntervalDays) || 2,
          image_url: plantData.imageUrl || '',
          storage_path: plantData.storagePath || null,
          location: plantData.location || 'Chưa phân loại',
          last_watered: plantData.lastWatered || new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, id: data[0].id };
  } catch (error) {
    console.error("Lỗi thêm cây Supabase:", error);
    return { success: false, error: 'Không thể lưu thông tin cây.' };
  }
};

/**
 * Lấy danh sách cây trồng của một người dùng
 */
export const getPlantsByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Ánh xạ ngược dữ liệu từ snake_case của Postgres về camelCase cho UI cũ
    const mappedPlants = data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      plantName: item.plant_name || item.name,
      healthStatus: item.health_status,
      diseaseName: item.disease_name,
      solution: item.solution,
      waterIntervalDays: item.water_interval_days,
      imageUrl: item.image_url,
      storagePath: item.storage_path,
      location: item.location,
      lastWatered: item.last_watered,
      createdAt: item.created_at
    }));

    return { success: true, data: mappedPlants };
  } catch (error) {
    console.error("Lỗi tải danh sách cây:", error);
    return { success: false, error: 'Không thể tải danh sách cây trồng.' };
  }
};

/**
 * Xóa một cây trồng khỏi hệ thống
 */
export const deletePlant = async (plantId) => {
  try {
    // 1. Lấy thông tin cây để tìm storagePath của ảnh
    const { data: plant, error: getError } = await supabase
      .from('plants')
      .select('storage_path')
      .eq('id', plantId)
      .single();

    if (!getError && plant && plant.storage_path) {
      try {
        // Xóa hình ảnh trên Supabase Storage
        await supabase.storage
          .from('plants')
          .remove([plant.storage_path]);
      } catch (storageError) {
        console.warn("Không thể xóa ảnh trên Storage:", storageError);
      }
    }

    // 2. Xóa dữ liệu cây trên bảng
    const { error: deleteError } = await supabase
      .from('plants')
      .delete()
      .eq('id', plantId);

    if (deleteError) throw deleteError;
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa cây Supabase:", error);
    return { success: false, error: 'Không thể xóa cây trồng này.' };
  }
};

/**
 * Thêm một bản ghi nhật ký mới cho cây
 */
export const addPlantLog = async (logData, base64Image = null) => {
  try {
    let imageUrl = null;
    let storagePath = null;

    if (base64Image) {
      const filename = `logs/${logData.userId}/${logData.plantId}_${Date.now()}.jpg`;
      const arrayBuffer = base64ToArrayBuffer(base64Image);

      const { error: uploadError } = await supabase.storage
        .from('plants')
        .upload(filename, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('plants')
          .getPublicUrl(filename);
        imageUrl = publicUrl;
        storagePath = filename;
      }
    }

    const { data, error } = await supabase
      .from('plant_logs')
      .insert([
        {
          plant_id: logData.plantId,
          user_id: logData.userId,
          note: logData.note,
          image_url: imageUrl,
          storage_path: storagePath,
          date: logData.date || new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, id: data[0].id };
  } catch (error) {
    console.error("Lỗi thêm nhật ký:", error);
    return { success: false, error: 'Không thể lưu nhật ký cây.' };
  }
};

/**
 * Lấy danh sách nhật ký của một cây
 */
export const getPlantLogs = async (plantId) => {
  try {
    const { data, error } = await supabase
      .from('plant_logs')
      .select('*')
      .eq('plant_id', plantId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Ánh xạ dữ liệu sang camelCase
    const mappedLogs = data.map((item) => ({
      id: item.id,
      plantId: item.plant_id,
      userId: item.user_id,
      note: item.note,
      imageUrl: item.image_url,
      storagePath: item.storage_path,
      date: item.date,
      createdAt: item.created_at
    }));

    return { success: true, data: mappedLogs };
  } catch (error) {
    console.error("Lỗi tải nhật ký:", error);
    return { success: false, error: 'Không thể tải nhật ký cây trồng.' };
  }
};

/**
 * Xóa một bản ghi nhật ký
 */
export const deletePlantLog = async (logId) => {
  try {
    // 1. Lấy thông tin log để tìm storagePath
    const { data: log, error: getError } = await supabase
      .from('plant_logs')
      .select('storage_path')
      .eq('id', logId)
      .single();

    if (!getError && log && log.storage_path) {
      try {
        await supabase.storage
          .from('plants')
          .remove([log.storage_path]);
      } catch (storageError) {
        console.warn("Không thể xóa ảnh nhật ký trên Storage:", storageError);
      }
    }

    // 2. Xóa record log
    const { error: deleteError } = await supabase
      .from('plant_logs')
      .delete()
      .eq('id', logId);

    if (deleteError) throw deleteError;
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa nhật ký Supabase:", error);
    return { success: false, error: 'Không thể xóa bản ghi nhật ký này.' };
  }
};

/**
 * Cập nhật thông tin cây trồng
 */
export const updatePlant = async (plantId, updateData) => {
  try {
    const mappedData = {};
    if (updateData.name !== undefined) mappedData.name = updateData.name;
    if (updateData.plantName !== undefined) mappedData.plant_name = updateData.plantName;
    if (updateData.location !== undefined) mappedData.location = updateData.location;
    if (updateData.imageUrl !== undefined) mappedData.image_url = updateData.imageUrl;
    if (updateData.healthStatus !== undefined) mappedData.health_status = updateData.healthStatus;
    if (updateData.lastWatered !== undefined) mappedData.last_watered = updateData.lastWatered;

    const { error } = await supabase
      .from('plants')
      .update(mappedData)
      .eq('id', plantId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật cây Supabase:", error);
    return { success: false, error: 'Không thể cập nhật thông tin cây.' };
  }
};


