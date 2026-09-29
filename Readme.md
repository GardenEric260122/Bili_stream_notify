# B站直播开播提醒

这是一个 Node.js 脚本，通过 Bilibili 的 API 获取直播间状态，在主播开播时显示系统原生通知，并且点击通知可以在浏览器里打开直播间。

# 使用步骤


## 克隆代码

clone本仓库到本地

## 配置脚本

在`index.js`中的 `config` 里设置你要监控的直播间。

`room_id`中填写房间号，`name`中是可选的备注名（若留空则显示用户名）

## 安装 Nodejs

如果你没有安装 Nodejs，请从![官网](https://nodejs.org/en/download
)下载安装包并安装。


## 安装依赖

导航到项目根目录，然后执行这个命令安装依赖：

```
cd ~/Bili_stream_notify
npm i
```

等待执行完成即可。如果可以正常安装，就可以可以跳到下面的“启动”步骤。

# 鸣谢
本项目基于[bilibili-live-notify](https://github.com/xuejianxianzun/bilibili-live-notify.git)进行开发，在此感谢原作者。