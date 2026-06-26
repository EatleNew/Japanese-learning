# Japanese Learning

这是一个面向安卓手机的日语背单词 App，当前目标是背《标准日本语》初级上、初级下、中级上、中级下四本书的词汇。

项目使用 Expo React Native 开发，目标是先在荣耀安卓手机上跑起来，再打包成 APK 安装使用。

## 当前功能

- 按「初级 / 中级」「上册 / 下册」「课次」筛选单词。
- 浏览词库。
- 背卡片：显示日语、假名、中文、来源课次和声调位置。
- 选择题：看到日语，选择中文。
- 输入测验：看到中文，输入日语汉字或假名。
- 今日复习：根据答题结果做简单间隔复习。
- 本地保存进度：答对、答错、复习到期时间会保存在手机本地。

## 词库来源

当前词库来自本机目录：

```text
C:\Users\Lenovo\Downloads\japanese-main\json
```

已导入 4936 个词：

- 初级上：1060 个
- 初级下：1063 个
- 中级上：1731 个
- 中级下：1082 个

导入脚本是：

```bash
node scripts/import-vocabulary.js
```

如果以后你更新了 `japanese-main/json` 里的词库，重新运行上面的命令即可生成新的 `src/data/vocabulary.ts`。

## 本地运行

先确认 Node.js 版本是 `20.19.4` 或更高。你当前电脑之前检测到的是 `20.10.0`，建议升级。

在项目目录执行：

```bash
npm install
npm run start
```

然后在荣耀手机上安装 `Expo Go`，用手机扫终端里的二维码，就能先在手机上试用。

## 得到 APK

想得到一个可以直接安装到安卓手机的 APK，推荐用 EAS Build。

先登录 Expo：

```bash
npx eas login
```

然后构建 APK：

```bash
npx eas build -p android --profile preview
```

构建完成后，Expo 会给一个下载链接。把 APK 下载到荣耀手机上，允许安装未知来源应用后即可安装。

## GitHub 留痕方式

建议每个任务都走这个流程：

```bash
git checkout -b feature/任务名
git add .
git commit -m "说明这次做了什么"
git push origin feature/任务名
```

然后在 GitHub 上开 Pull Request。这样 issue、commit、PR、讨论和构建记录都会留在 GitHub 上。

## 常用命令

```bash
npm run import:vocabulary
npm run start
npx tsc --noEmit
npx eas build -p android --profile preview
```
