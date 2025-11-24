// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2024-11-01",
  css: ["~/assets/css/main.css"],
  // 配置为静态生成模式（用于后端服务静态文件）
  nitro: {
    preset: 'node-server',
    // 在生产环境中，静态文件会输出到 .output/public
  },
  // 或者使用 generate 模式生成完全静态的站点
  // ssr: false, // 如果只需要 SPA 模式
  app: {
    head: {
      title: "ReadCast - 智能英语学习平台",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "ReadCast - 智能英语学习平台，支持阅读、学习、播客生成",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || "/api",
    },
  },
  // 配置 Nitro 代理，将 /api 请求转发到后端服务器
  nitro: {
    devProxy: {
      "/api": {
        target: "http://localhost:3001/api",
        changeOrigin: true,
        prependPath: true,
      },
    },
  },
});
