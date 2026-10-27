# 识牌 BrandPedia · 个人品牌百科

只属于一个人的品牌与产品百科。安卓 APK + 网页版双形态,内置 500+ 品牌、2600+ 产品的完整数据(含介绍、品牌故事、产品线与参考价格)。

**仓库**:https://github.com/jiannnnii/shipai-brandpedia
**在线数据**:应用已预置远端地址,启动时自动拉取最新数据(内置数据兜底)。

## 功能

- **四大 Tab**:首页(今日识牌/分类逛/足迹)、探索(瀑布流+🎲随便逛逛)、搜索(品牌/产品/国家/关键词)、我的(收藏/足迹/已看/设置)
- **收藏 · 足迹 · 已看标记 · 个人笔记**,全部本地存储,支持导出/导入 JSON 备份
- **分类页**按档次/国家双维筛选;**品牌页**按产品类型筛选;**产品页**含价格区间、亮点标签、同品牌推荐横滑
- **外链自查**:维基百科 / 品牌官网 / 京东 / 天猫 / 必应一键跳转
- **AI 联网核实**(可选):在「我的 → 设置」填入 API Key(OpenAI 兼容格式),详情页即可一键核实产品信息
- **在线数据更新**(可选):数据托管在 GitHub 仓库后,把 raw 地址填入设置,应用启动/点「检查更新」即拉取最新数据
- **深浅色主题**跟随系统,杂志画册风设计
- **品牌 logo 本地化**:450+ 品牌图标内置,断网也有完整体验;失败时自动走在线源,再失败则显示品牌色字块

## 开发

```bash
npm install          # 安装依赖(Capacitor)
npm run data         # 合并 data/src/*.json → data/index.json(含校验)
npm run serve        # 本地预览 http://localhost:8177
npm run www          # 复制 Web 资源到 www/
npm run sync         # www + cap sync android
```

数据源文件在 `data/src/`,格式规范见 `data/SCHEMA.md`,品牌分配计划见 `data/PLAN.md`。

## 打 APK

前提:JDK 21、Android SDK(platforms;android-35, build-tools;35.0.0)。

```bash
cd android
gradlew assembleDebug      # 调试包
gradlew assembleRelease    # 签名包(密钥: android/shipai.keystore / keystore.properties)
```

产物在 `android/app/build/outputs/apk/`。安装:手机允许「未知来源应用」后直接装。

## 手机访问网页版

电脑运行 `npm run serve`,手机连同一 WiFi,浏览器打开 `http://<电脑IP>:8177`(如 `http://192.168.1.5:8177`)。Windows 首次需在防火墙放行 Node.js。

## 数据更新流程

1. 改 `data/src/` 下的 JSON → `npm run data`
2. 提交并推送到 GitHub 仓库
3. 应用端「检查更新」或在设置里确认 raw 地址,自动拉取
