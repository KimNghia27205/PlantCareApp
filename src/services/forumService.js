import { supabase } from './supabaseClient';

/**
 * Lấy danh sách bài viết trên diễn đàn
 */
export const getPosts = async () => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          display_name,
          photo_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Ánh xạ ngược dữ liệu Postgres (snake_case) sang camelCase để tương thích 100% với Forum UI cũ
    const mappedPosts = data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      content: item.content,
      imageUrl: item.image_url,
      storagePath: item.storage_path,
      likes: item.likes || 0,
      likedBy: item.liked_by || [], // Mảng danh sách User ID thích bài viết
      comments: item.comments_count || 0, // Map comments_count sang comments cho UI
      createdAt: item.created_at,
      author: item.users?.display_name || 'Người dùng ẩn danh',
      authorAvatar: item.users?.photo_url || null
    }));

    return { success: true, data: mappedPosts };
  } catch (error) {
    console.error("Lỗi tải bài viết Supabase:", error);
    return { success: false, error: 'Không thể tải danh sách bài viết.' };
  }
};

/**
 * Đăng bài viết mới
 */
export const createPost = async (postData) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: postData.userId || postData.authorId,
          title: postData.title,
          content: postData.content,
          image_url: postData.imageUrl || '',
          storage_path: postData.storagePath || null,
          likes: 0,
          liked_by: [],
          comments_count: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, id: data[0].id };
  } catch (error) {
    console.error("Lỗi đăng bài Supabase:", error);
    return { success: false, error: 'Không thể đăng bài viết.' };
  }
};

/**
 * Thả tim / Hủy thả tim bài viết (Ràng buộc: 1 tym per acc)
 */
export const toggleLikePost = async (postId, userId) => {
  if (!userId) return { success: false, error: 'Bạn cần đăng nhập để thực hiện tác vụ này.' };
  try {
    // 1. Lấy thông tin liked_by và likes hiện tại của bài viết
    const { data: post, error: getError } = await supabase
      .from('posts')
      .select('liked_by, likes')
      .eq('id', postId)
      .single();

    if (getError || !post) throw new Error('Bài viết không tồn tại.');

    const likedBy = post.liked_by || [];
    const index = likedBy.indexOf(userId);
    let newLikedBy = [...likedBy];
    let newLikes = post.likes || 0;
    let liked = false;

    if (index > -1) {
      // Đã thích -> Hủy thích (Xóa userId khỏi mảng liked_by, giảm likes đi 1)
      newLikedBy.splice(index, 1);
      newLikes = Math.max(0, newLikes - 1);
    } else {
      // Chưa thích -> Thích bài (Thêm userId vào liked_by, tăng likes lên 1)
      newLikedBy.push(userId);
      newLikes += 1;
      liked = true;
    }

    // 2. Cập nhật lại lên database
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        liked_by: newLikedBy,
        likes: newLikes
      })
      .eq('id', postId);

    if (updateError) throw updateError;
    return { success: true, liked };
  } catch (error) {
    console.error("Lỗi like bài viết Supabase:", error);
    return { success: false, error: 'Không thể cập nhật trạng thái thả tim.' };
  }
};

/**
 * Lấy danh sách bình luận của bài viết
 */
export const getComments = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users (
          display_name,
          photo_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Ánh xạ sang camelCase cho UI (hỗ trợ cả userName/text lẫn author/content tương thích ngược)
    const mappedComments = data.map((item) => ({
      id: item.id,
      postId: item.post_id,
      userId: item.user_id,
      userName: item.users?.display_name || item.user_name || 'Người dùng ẩn danh',
      author: item.users?.display_name || item.user_name || 'Người dùng ẩn danh',
      userAvatar: item.users?.photo_url || item.user_avatar || null,
      text: item.text,
      content: item.text,
      createdAt: item.created_at
    }));

    return { success: true, data: mappedComments };
  } catch (error) {
    console.error("Lỗi tải bình luận Supabase:", error);
    return { success: false, error: 'Không thể tải danh sách bình luận.' };
  }
};

/**
 * Thêm bình luận mới cho bài viết
 */
export const addComment = async (postId, commentData) => {
  try {
    // 1. Thêm bản ghi bình luận vào bảng 'comments'
    const { data, error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: commentData.userId || commentData.authorId,
          user_name: commentData.userName || commentData.author,
          user_avatar: commentData.userAvatar || '',
          text: commentData.text || commentData.content,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) throw insertError;

    // 2. Lấy số lượng bình luận hiện tại để tăng lên 1
    const { data: post, error: getError } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', postId)
      .single();

    const currentCount = getError ? 0 : (post?.comments_count || 0);

    // 3. Cập nhật lại số lượng comments_count của posts
    await supabase
      .from('posts')
      .update({
        comments_count: currentCount + 1
      })
      .eq('id', postId);

    return { success: true, id: data[0].id };
  } catch (error) {
    console.error("Lỗi thêm bình luận Supabase:", error);
    return { success: false, error: 'Không thể gửi bình luận.' };
  }
};

