# 识牌流水线状态(上下文压缩后续跑用)

## 项目
C:\Users\13506\.zcode\workspace\draft-9b6b145c-180e-45fd-a57a-907387def70d
GitHub: github.com/jiannnnii/shipai-brandpedia (已登录 gh CLI,账号 jiannnnii)

## 应用现状(v1.3 已装用户手机)
- 503 品牌 / 2639 产品 / 10 品类,507 品牌细分(sub)全覆盖
- Wikidata 体检完成:一致 189 / 差异 192 / 未找到 122(data/review-report.json)
- Simple Icons 主色 91 个(data/brandcolors.json);logo 496 个本地
- 产品图:汽车品类 338 张已审(约 200 ok + 错图已删回落字块)

## ⚠️ 2026-11-01 会话中断点(图像审查被平台故障卡住)
**故障(全天观察)**:子代理带图请求大部分时段秒失败("Model returned no text, no tool calls, no usage"),纯文本子代理正常。当天多次出现"可用窗口"(13:00-14:30 前后可用),窗口内实测规律:新开代理 ≤2 图成功率高、≥10 图大多失败;**一旦某代理成功建立,用 SendMessage 连续喂 5-8 条/批最稳**(其上下文涨到 ~15 万 token 后开始失败,换新代理)。
**已验证可用的续跑配方**:
1. 先发 1-2 图小探针;失败等 5-10 分钟再探,直到成功
2. 成功后立刻发 ≤5 条的小批量审查(条目内联进提示词,格式:id | 品牌 产品名(类型) | 描述 | data\img\xx.jpg;回复"id | ok/logo/mismatch/lowq | 中文理由")
3. 对该代理 SendMessage 持续喂 5-8 条/批直到它开始失败,再开新代理重复
4. 主会话把判定解析落盘到 data/audit/verdicts/w5-done.json(腕表重抓复审进度)

### watchjewel(156 项,复审已完成 2026-11-19)
- 重抓复审全部完成:data/audit/verdicts/w5-done.json → **ok 6 / mismatch 107 / logo 5 / lowq 1**(含此前 57 条)
- 4 张平台黏性拦截图(无法审查,最终删图回落字块):chowsangsang-promessa、gp-cats-eye、oris-bigcrown、tasaki-balance

### fashion(复审已完成 2026-11-19)
- 旧图残余 45 张:f6-fold.json → **全部 mismatch**(44 判定 + 1 毒图 burberry-scarf)
- 重抓 193 张:f6-fnew.json → **ok 12 / mismatch 164 / logo 13 / lowq 1**(190 判定 + 3 毒图 moncler-longdown、stellamccartney-falabella、longchamp-readytowear)
- fashion 毒图共 4 张(含 burberry-scarf)

### beauty / sports(首审已完成 2026-11-19)
- beauty 159 张全审完:b6-beauty.json → **ok 4 / mismatch 151 / logo 2 / lowq 1**(158 判定 + 1 毒图 kose-softymo)
- sports 199 张全审完:b6-sports.json → **ok 6 / mismatch 174 / logo 16**(196 判定 + 3 毒图 361-training-shoes、converse-weapon、montbell-tent)
- 两类中 beauty 60 张、sports 56 张无图文件,属正常(无图=回落字块),不用管

### 全量毒图(平台内容过滤黏性标记,无法审查,收尾时删图回落字块,共 14 张)
chowsangsang-promessa、gp-cats-eye、oris-bigcrown、tasaki-balance、sw-lowland、burberry-scarf、canadagoose-knitwear、longchamp-readytowear、moncler-longdown、stellamccartney-falabella、kose-softymo、361-training-shoes、converse-weapon、montbell-tent
(明细清单:draft-e8a326e6 工作区 shipai-resume/sticky.txt)

## ⚠️ 2026-11-19 续跑记录(主会话直接驱动,已验证配方)
- 图像通道当日恢复。真正规律:**个别图片被平台内容过滤"黏性"标记**(任何提示词含其路径的请求必失败,还会永久污染该代理上下文——废泵必须弃用换新,不能续命)。毒图清单见 shipai-resume/sticky.txt(另一会话工作区 draft-e8a326e6)。
- 已验证高效配方:全新 Explore 代理 + 批量 5 条内联提示词 + note 限 2-6 字 + 回复交判定主会话落盘;双泵并行可行;失败批次按 2/3 二分定位毒图后单测确认。
- 落盘文件:w5-done.json(watchjewel 复审)、f6-fold.json / f6-fnew.json(fashion 复审)。
- beauty/sports 审查用同配方,判定落盘 data/audit/verdicts/b6-beauty.json、b6-sports.json(目标文件,新建)。

## 待办队列(2026-11-19 深夜更新)
1. ✅ watchjewel 重抓复审 —— 完成(w5-done.json)
2. ✅ fashion 残余 + 重抓复审 —— 完成(f6-fold.json + f6-fnew.json)
3. ✅ beauty 首审 —— 完成(b6-beauty.json)
4. ✅ sports 首审 —— 完成(b6-sports.json)
5. ⏳ 决策点:是否对 beauty/sports 的 mismatch(约 325 张)再跑一轮 fix-imgs 重抓+复审(此前 fashion 重抓 193 张仅 12 张 ok,产出比极低);或直接进收尾
6. ⏳ 收尾:合并全量判定 → 删除所有"非 ok"图与 14 张毒图(宁缺毋滥回落字块)→ shrink → build-data → build-apk → adb 无线装机 → git push
7. ⏳ auto13 挑图落地复核(上一会话遗留)

## 图片审查管线(工具都在 tools/)
1. 清单:`node tools/gen-audit-manifest.mjs <品类>` → data/audit/manifest-<cat>.json
2. 审查代理(50张/个,并发2,崩溃就重发或拆半):Read 每张图 → verdict "ok|logo|mismatch|lowq" → data/audit/verdict<批次>.json
3. 错图重抓:`node tools/fix-imgs.mjs data/audit/verdictX.json`(英文词优先+候选轮换+哈希去重)
4. 复审 fixed → 全 ok 后进入下一步
5. 压缩:`powershell tools/shrink-imgs.ps1`
6. 合并+图链:`node tools/build-data.mjs`(自动挂 data/img/{pid}.jpg 为 image 字段)
7. 打包:`node tools/build-apk.mjs`(= copy-web + cap sync + gradle assembleRelease;**必须 cap sync 否则打包旧前端**)
8. 装机:`adb -s 192.168.137.75:5555 install -r android/app/build/outputs/apk/release/app-release.apk`(无线 adb,手机重启会失效)
9. 推送:`git push origin master`

## 已知坑
- 审查/挑图代理偶发"无文本无工具"静默崩(~4分钟时):重发即可,或拆半
- 2026-11-01 新坑:平台图像通道故障,子代理带图请求秒失败(见顶部中断点记录);纯文本请求不受影响
- 代理并发上限 2
- 审查代理必须每 10 张把 verdict 数组覆盖落盘,防崩溃丢进度(本次靠这个救回 30 条)
- Bing 图片搜索限流:脚本已带 1.2-3.4s 随机延迟+限流退避+内容哈希去重(data/img/.hashes.json)
- QLever(qlever.dev)是 Wikidata 唯一可达端点;官方 wikidata.org 被墙
- 手机网络:raw.githubusercontent/jsdelivr 都被 VPN 分流拦截;产品图必须打包进 APK
- shell 是 Git Bash(2026-10-30 起);之前 cmd 语法失败的历史坑已过时

## 用户偏好
中文界面;杂志画册风;错图宁缺毋滥(回落字块);App 图标=金吊牌图形;不要动 android/ 源码和 Capacitor 版本;所有改动推 GitHub。

## 审查代理提示词模板(恢复续跑直接复制,替换 {清单} {输出} {品类} {N})
你是产品图审查代理。项目根:C:\Users\13506\.zcode\workspace\draft-9b6b145c-180e-45fd-a57a-907387def70d
任务:审查 data\audit\{清单}.json 里列出的 N 个产品条目对应的图片是否正确。这是"{品类}"品类。清单每条含 id、brand、name、nameEn、type、desc、file。
对每一条:1) 用 Read 读取项目根下的 file 指向的图片(绝对路径);2) 对照 name/nameEn/desc 判断,verdict 四选一小写:"ok"=该产品实物照片主体正确可辨认 / "logo"=品牌logo文字标门店招牌 / "mismatch"=与该产品无关(含同品牌但不是该条目产品) / "lowq"=产品对但过小模糊大水印拼图;3) 中文 note 一句说清错图里实际是什么。
输出:JSON 数组写到 data\audit\{输出}.json,格式 [{"id":"...","verdict":"...","note":"..."},...]。每审完 10 张覆盖写入一次防崩溃。全部审完,完成后回复一行统计。
