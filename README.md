# hr-interview-web

AI 面试初筛 MVP 前端，使用 Vue3 + Vite。

## 页面

- `/`：HR 工作台，包含岗位、候选人、面试管理
- `/interview/:token`：候选人公开面试页

## 本地启动

```bash
npm install
npm run dev
```

默认代理后端：

```text
http://localhost:8080
```

## 接口约定

前端所有业务请求统一使用 `POST`，与后端接口规范保持一致。
