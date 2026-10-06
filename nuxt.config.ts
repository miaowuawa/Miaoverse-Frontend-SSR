// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@ant-design-vue/nuxt',
  ],
  css: [
    '~/assets/css/main.css',
    '@fortawesome/fontawesome-free/css/all.min.css',
  ],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  app: {
    head: {
      title: 'Miaoverse',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  // 将 /api/** 请求代理到后端服务，浏览器与 SSR 均同源访问，
  // 避免跨域问题，且 session cookie（mwu_sess_id）自动随请求携带。
  // 后端已绑定 127.0.0.1:9800，仅本机可访问。
  runtimeConfig: {
    apiProxyTarget: process.env.API_PROXY_TARGET || 'http://127.0.0.1:9800/api',
  },
  routeRules: {
    '/api/**': {
      proxy: process.env.API_PROXY_TARGET || 'http://127.0.0.1:9800/api/**',
    },
  },
})
