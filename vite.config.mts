import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    root: "./src",
    base: "",
    plugins: [zaloMiniApp(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:10000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:10000',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://127.0.0.1:10000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/admin/, '/admin'),
        },
      }
    }
  });
};
