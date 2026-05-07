# 键映射器 (KeyMapper) — 从零到 APK 编译指南

> 适用场景：一台**全新的 Linux 机器**，需要从零搭建 Android 编译环境并打出 APK。
> 目标 APK 路径：`app/build/outputs/apk/debug/app-debug.apk`

---

## 目录

1. [环境要求](#1-环境要求)
2. [一键安装脚本（推荐）](#2-一键安装脚本推荐)
3. [分步安装说明](#3-分步安装说明)
4. [编译 APK](#4-编译-apk)
5. [常见问题排查](#5-常见问题排查)
6. [项目结构说明](#6-项目结构说明)

---

## 1. 环境要求

| 组件 | 要求 | 说明 |
|------|------|------|
| 操作系统 | Linux / macOS / Windows (WSL) | 本文以 Linux 为例 |
| Java | **JDK 17**（必须 17） | 不能是 8、11 或 21 |
| Android SDK | platform `android-34` + build-tools `34.0.0` | 需要 `sdkmanager` 安装 |
| Gradle | **8.5** | 项目自带 wrapper，自动下载 |
| 磁盘空间 | 至少 10GB 空闲 | 主要是 SDK 和 Gradle 缓存 |

---

## 2. 一键安装脚本（推荐）

把以下脚本**按顺序逐条执行**（不要一起复制粘贴跑，因为有些步骤需要等待）。

### 2.1 安装 Java 17

```bash
# Debian/Ubuntu
apt update && apt install -y openjdk-17-jdk

# 验证
java -version
# 输出必须是: openjdk version "17.x.x"
```

### 2.2 安装 Android SDK

```bash
# 创建 SDK 目录
export ANDROID_HOME=/opt/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools

# 下载 cmdline-tools（约 150MB）
cd /tmp
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest

# 配置 PATH
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# 安装 platform 34 和 build-tools（约 1.2GB，需要几分钟）
yes | sdkmanager "platforms;android-34" "build-tools;34.0.0"

# 验证安装
ls $ANDROID_HOME/platforms/    # 应该看到 android-34
ls $ANDROID_HOME/build-tools/  # 应该看到 34.0.0
```

### 2.3 配置项目 SDK 路径

进入 KeyMapper 项目目录，创建 `local.properties`：

```bash
cd /path/to/KeyMapper
echo "sdk.dir=$ANDROID_HOME" > local.properties
# 如果 ANDROID_HOME 是 /opt/android-sdk，则文件内容为:
# sdk.dir=/opt/android-sdk
```

### 2.4 编译 APK

```bash
cd /path/to/KeyMapper
chmod +x gradlew

# 清理旧构建产物
./gradlew clean

# 编译 debug APK（首次会下载 Gradle 8.5 和 Maven 依赖）
./gradlew assembleDebug
```

**最终 APK 路径：**
```
/path/to/KeyMapper/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. 分步安装说明

如果一键脚本出了问题，以下是每个步骤的详细说明。

### 3.1 安装 Java 17

**检查当前 Java 版本：**
```bash
java -version 2>&1
```

**如果版本不对或未安装：**

Debian/Ubuntu:
```bash
apt update
apt install -y openjdk-17-jdk
```

CentOS/RHEL/Fedora:
```bash
yum install -y java-17-openjdk-devel
```

macOS (Homebrew):
```bash
brew install openjdk@17
```

**设置 JAVA_HOME（可选但推荐）：**
```bash
# Debian/Ubuntu
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# 或者自动查找
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
```

### 3.2 安装 Android SDK

#### 3.2.1 下载 cmdline-tools

```bash
# Linux
export ANDROID_HOME=/opt/android-sdk
mkdir -p $ANDROID_HOME

cd /tmp
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
mkdir -p $ANDROID_HOME/cmdline-tools
mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest
```

#### 3.2.2 安装 Platform 和 Build-Tools

```bash
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# 列出可用的 SDK 包
sdkmanager --list

# 安装需要的组件
sdkmanager "platforms;android-34" "build-tools;34.0.0"

# 可选：接受所有 license
yes | sdkmanager --licenses
```

#### 3.2.3 验证 SDK 安装

```bash
ls $ANDROID_HOME/platforms/
# 输出: android-34

ls $ANDROID_HOME/build-tools/
# 输出: 34.0.0
```

### 3.3 配置 local.properties

**为什么要做：** Gradle 通过 `local.properties` 知道 Android SDK 在哪里。

```bash
cd /path/to/KeyMapper
echo "sdk.dir=/opt/android-sdk" > local.properties

# 查看确认
cat local.properties
# 输出: sdk.dir=/opt/android-sdk
```

> **注意**：`sdk.dir` 的路径要和上面的 `$ANDROID_HOME` 一致。不要写成 `~` 或者 `$HOME`，必须写**绝对路径**。

---

## 4. 编译 APK

### 4.1 标准编译

```bash
cd /path/to/KeyMapper
chmod +x gradlew

# 清理 + 编译
./gradlew clean assembleDebug
```

### 4.2 编译流程说明

执行 `./gradlew assembleDebug` 时，Gradle 会按顺序做以下事情：

1. **下载 Gradle 8.5**（仅首次，约 130MB，从 `services.gradle.org`）
2. **下载 Maven 依赖**（仅首次，包括 AndroidX、Material 等，约 50MB）
3. **编译 Kotlin 源码**（`src/main/java/com/keymapper/` 下所有 `.kt` 文件）
4. **打包资源**（布局、图片、AndroidManifest 等）
5. **生成 APK**

> **注意**：第 1 步下载 Gradle 可能需要几分钟，网络慢的话可能卡住。如果卡住了，看[5.2 节](#52-gradle-wrapper-卡住不动)。

### 4.3 编译可用的命令

```bash
# 完整编译（推荐）
./gradlew assembleDebug

# 仅编译 release（需要签名才能安装，debug 不需要）
./gradlew assembleRelease

# 只检查代码能否编译通过，不生成 APK
./gradlew compileDebugKotlin

# 安装到已连接设备（需要 adb）
./gradlew installDebug
```

### 4.4 获取 APK

编译成功后 APK 在以下路径：

```
debug (可安装):
  app/build/outputs/apk/debug/app-debug.apk

release (未签名，不可直接安装):
  app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 5. 常见问题排查

### 5.1 `SDK location not found` 或 `sdk.dir` 错误

```
* What went wrong:
A problem occurred configuring project ':app'.
> SDK location not found. Define location with sdk.dir in the local.properties file
```

**解决：** 确保 `local.properties` 存在且路径正确：
```bash
cat local.properties
# 必须输出类似: sdk.dir=/opt/android-sdk

# 检查该路径下是否有 platforms 目录
ls /opt/android-sdk/platforms/
```

### 5.2 Gradle wrapper 卡住不动

**现象：** 执行 `./gradlew` 后长时间没有输出，或者停在：
```
Downloading https://services.gradle.org/distributions/gradle-8.5-bin.zip
```

**原因：** 从 `services.gradle.org` 下载 130MB 的 Gradle 分发包，网络慢或不通时会卡住。

**解决方法 A — 手动下载然后跳过下载步骤：**
```bash
# 1. 手动下载（或用其他机器下载后传过来）
wget https://services.gradle.org/distributions/gradle-8.5-bin.zip -O /tmp/gradle-8.5-bin.zip

# 2. 把文件放到 Gradle 缓存目录
mkdir -p ~/.gradle/wrapper/dists/gradle-8.5-bin/随机字符串/
cp /tmp/gradle-8.5-bin.zip ~/.gradle/wrapper/dists/gradle-8.5-bin/随机字符串/

# 3. 重新运行
./gradlew assembleDebug
```

**解决方法 B — 用系统已安装的 Gradle（如果装了的话）：**
```bash
# 检查系统是否有 Gradle
gradle --version

# 直接用系统 Gradle 编译（不用 wrapper）
gradle assembleDebug --no-daemon
```

### 5.3 `Java 17 required` 或 Java 版本错误

```
Unsupported class file major version 65
或
Java 17 or later is required to run Gradle 8.5
```

**解决：** 安装或切换到 Java 17：
```bash
# 检查版本
java -version

# Debian/Ubuntu 安装
apt install -y openjdk-17-jdk

# 切换默认版本
update-alternatives --config java
```

### 5.4 Maven 依赖下载失败

```
Could not resolve all files for configuration ':app:debugCompileClasspath'.
Could not find androidx.core:core-ktx:1.12.0.
```

**原因：** 无法访问 Google 或 Maven Central 仓库。

**解决：**
1. 检查网络是否能访问 `https://dl.google.com` 和 `https://repo1.maven.org`
2. 如果是国内网络，考虑在 `build.gradle.kts` 中添加阿里云镜像：

```kotlin
// 在 settings.gradle.kts 的 repositories 中添加
maven { url = uri("https://maven.aliyun.com/repository/public") }
maven { url = uri("https://maven.aliyun.com/repository/google") }
```

### 5.5 编译时注解或语法错误

```
e: /path/to/KeyMapper/app/src/main/java/com/keymapper/xxx.kt: (行, 列): Unresolved reference: xxx
```

**解决：** 先检查 Kotlin 语法：
```bash
# 只运行 Kotlin 编译阶段，错误信息更清晰
./gradlew compileDebugKotlin
```

### 5.6 Shizuku 相关错误

```
Could not find shizuku-api-12.1.0.aar
```

**解决：** 检查 `app/libs_v12/` 目录是否存在，且包含以下文件：
```bash
ls -la KeyMapper/app/libs_v12/
# 必须有:
#   shizuku-api-12.1.0.aar
#   shizuku-provider-12.1.0.aar
```

这些 AAR 文件是**本地依赖**，不需要联网下载。如果丢失了，从项目的 git 历史或备份中恢复。

---

## 6. 项目结构说明

```
KeyMapper/
├── settings.gradle.kts           # 项目设置（仓库地址、模块）
├── build.gradle.kts               # 根构建文件（插件版本声明）
├── gradle.properties              # Gradle 全局属性
├── local.properties               # 本地 SDK 路径（需手动创建 ⚠️）
├── gradlew                        # Gradle wrapper 脚本（Unix）
├── gradlew.bat                    # Gradle wrapper 脚本（Windows）
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties  # Gradle 版本配置（8.5）
└── app/
    ├── build.gradle.kts           # 模块构建配置（核心 ⚠️）
    ├── libs_v12/                  # Shizuku 本地 AAR 依赖（⚠️ 必须存在）
    │   ├── shizuku-api-12.1.0.aar
    │   └── shizuku-provider-12.1.0.aar
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/keymapper/    # Kotlin 源码
        └── res/                   # 资源文件
```

### 关键文件说明

| 文件 | 作用 | 是否需要修改 |
|------|------|-------------|
| `local.properties` | 指向 Android SDK 路径 | **必须创建**，每台机器不同 |
| `app/build.gradle.kts` | 项目依赖和编译配置 | 一般不用改 |
| `gradle/wrapper/gradle-wrapper.properties` | 指定 Gradle 版本 | 一般不用改 |
| `app/libs_v12/*.aar` | Shizuku 本地依赖 | **必须存在**，不能删 |

---

## 附录

### A. 验证环境的完整命令序列

以下是在一台**全新的空机器**上从零到 APK 的标准流程：

```bash
# ===== 1. Java =====
apt update && apt install -y openjdk-17-jdk wget unzip
java -version

# ===== 2. Android SDK =====
export ANDROID_HOME=/opt/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools
cd /tmp
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
yes | sdkmanager "platforms;android-34" "build-tools;34.0.0"

# ===== 3. 项目配置 =====
cd /path/to/KeyMapper
echo "sdk.dir=$ANDROID_HOME" > local.properties

# ===== 4. 编译 =====
chmod +x gradlew
./gradlew clean assembleDebug

# ===== 5. 验证 APK =====
ls -la app/build/outputs/apk/debug/app-debug.apk
```

### B. 部署到手机

```bash
# 需要 adb 工具
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### C. Shizuku AAR 文件哈希（验证完整性）

| 文件 | 大小 | SHA256 |
|------|------|--------|
| shizuku-api-12.1.0.aar | 21,441 bytes | `50d8c4db7bb4f4b46e76399bde44e4cede6ad0ae7b2af59a500914d87410a884` |
| shizuku-provider-12.1.0.aar | 6,731 bytes | `ef9af99ee47d50d4caaddd28308a5ccec2b6024e9eb33fc1a2e620e7dd7f5388` |
