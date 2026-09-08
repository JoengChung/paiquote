# 拍报价 PaiQuote

义乌外贸跟单：手机拍货（地上手写价/装箱/体积）→ 识别 → 当晚导出带图 Excel。

## 运行

```bash
npm install
npm run dev
```

默认 http://localhost:8080 。识图需要 `XAI_API_KEY`；没有 key 可手工填。

数据在浏览器 IndexedDB（`paiquote`）。

## 用户需求

- 手机拍，一人，网络一般，一天约 500 SKU
- 客户只要 Excel，图片嵌单元格，中文 + 西班牙语
- Excel 列：店面 | 工厂货号 | 图片 | 中文描述 | 西班牙语描述 | 件数 | 装箱量 | 总数量 | 单价 | 总金额 | 立方 | 总立方
- 宋体 11、合并店面、红色合计
- 点「新建」必须马上开单；输入不能卡；退出识别不能丢数据

## 关键代码

- `src/routes/index.tsx` 首页
- `src/routes/sheet.$id.tsx` 报价单
- `src/lib/quote/store.ts` IndexedDB + 识别队列
- `src/lib/quote/excel.ts` 导出
- `src/lib/quote/extract.ts` 识图
