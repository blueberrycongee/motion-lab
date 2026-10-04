# motion-lab（暂定名）

同一朵毒蝇伞，一百种动效与 shader。每件作品是一个自包含的 HTML 文件，复制下来另存为 `.html` 就能打开。

## 运行

```sh
npm install
npm run dev      # 本地开发
npm run build    # 构建静态站点到 dist/
```

## 新增作品

在 `works/` 下新建 `编号-slug.html`，例如 `101-aurora.html`。编号决定画廊顺序，slug 决定地址 `#/w/aurora`，展签标题取自 `<title>`。

蘑菇的形状、配色和可直接复制的 GLSL / Canvas / SVG 代码见 [MUSHROOM.md](MUSHROOM.md)。

作品运行在仅允许脚本的沙箱 iframe 里：铺满视口，按视口尺寸构图，没人操作时也要自己动。

## 封面

画廊里的作品进入视口后自动播放，离开视口即释放画框。`posters/` 里的静帧用于加载前的封面。新增或修改作品后重新生成：

```sh
npx playwright install chromium   # 首次
npm run posters                   # 全部
npm run posters -- 101-aurora     # 指定作品
```
