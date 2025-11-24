export const useApi = () => {
  const config = useRuntimeConfig();
  // 使用相对路径，通过 Nitro 代理转发到后端
  const apiBase = config.public.apiBase || '/api';

  const fetchApi = async (endpoint: string, options: RequestInit = {}, returnBlob: boolean = false) => {
    // 确保 endpoint 以 / 开头
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // 构建 URL（相对路径或完整 URL）
    const url = `${apiBase}${normalizedEndpoint}`;
    
    // 自动添加token（如果存在）
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP error! status: ${response.status}` };
        }
        
        // 创建一个包含更多信息的错误对象
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
        (error as any).status = response.status;
        (error as any).suggestion = errorData.suggestion;
        throw error;
      }

      if (returnBlob) {
        return response;
      }
      return response.json();
    } catch (fetchError: any) {
      // 处理网络错误
      if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
        const error = new Error('无法连接到服务器，请确保后端服务正在运行（端口3001）');
        (error as any).status = 0;
        (error as any).suggestion = '请检查后端服务是否在 http://localhost:3001 运行';
        throw error;
      }
      // 重新抛出其他错误
      throw fetchError;
    }
  };

  return { fetchApi, apiBase };
};

