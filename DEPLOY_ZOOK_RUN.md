# zook.run 前端部署说明

前端使用 Vue3 + Vite，生产环境请求使用同域相对路径：

- `/api` 走后端接口
- `/ws` 走实时语音 WebSocket

所以部署到 `https://zook.run` 时，不需要额外修改接口地址。

## 构建

```bash
npm install
npm run build
```

构建产物目录：

```text
dist
```

## 放到 Nginx html

```bash
rm -rf /usr/share/nginx/html/*
cp -r dist/* /usr/share/nginx/html/
```

如果服务器 Nginx 的 html 目录不是 `/usr/share/nginx/html`，替换成实际目录。

## Nginx 要求

Nginx 需要：

- `location /` 支持 Vue history 路由回退到 `index.html`
- `location /api/` 代理到后端 `8080`
- `location /ws/` 代理到后端 `8080`，并开启 WebSocket Upgrade
- 域名必须使用 HTTPS，手机端实时语音才可以访问麦克风

后端仓库里有参考配置：

```text
deploy/nginx-zook.run.conf
```
