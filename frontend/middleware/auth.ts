export default defineNuxtRouteMiddleware((to, from) => {
  // 允许访问的公开路由
  const publicRoutes = ['/login', '/register', '/my'];
  
  // 如果访问的是公开路由，允许通过
  if (publicRoutes.includes(to.path)) {
    return;
  }
  
  // 检查是否已登录
  if (process.client) {
    const token = localStorage.getItem('token');
    if (!token) {
      // 未登录，重定向到"我的"页面
      return navigateTo('/my');
    }
  }
});

