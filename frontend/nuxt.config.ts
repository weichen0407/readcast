// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2024-11-01",
  css: ["~/assets/css/main.css"],
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
  // 配置 Nitro
  nitro: {
    preset: "node-server",
    // 开发环境代理配置
    devProxy: {
      "/api": {
        target: "http://localhost:3001/api",
        changeOrigin: true,
        prependPath: true,
      },
    },
  },
});
