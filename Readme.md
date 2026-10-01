# B站直播开播提醒

这是一个 Node.js 脚本，通过 Bilibili 的 API 获取直播间状态，在主播开播时显示系统原生通知，并且点击通知可以在默认浏览器里打开直播间。

## 使用步骤


### 克隆代码

clone本仓库到本地

### 配置脚本

在`index.js`中的 `config` 里设置你要监控的直播间。

`room_id`中填写房间号，`name`中是可选的备注名（若留空则显示用户名）

在本地文件目录下新建一个```.env```文件，将自己B站直播时使用的Cookie配置为环境变量BILI_COOKIE的值，格式为```BILI_COOKIE="buvid3=XXX;SESSDATA=XXX; bili_jct=XXX; DedeUserID=XXX; LIVE_BUVID=XXX"```,注意一定要是在B站直播页面中打开浏览器开发者工具查看请求标头复制的Cookie值，其它界面可能不会成功。

### 安装 Nodejs

如果你没有安装 Node.js，请从[官网](https://nodejs.org/en/download
)下载安装包并安装。


### 安装依赖

导航到项目根目录，然后执行这个命令安装依赖：

```
cd ~/Bili_stream_notify
npm i
```

等待执行完成即可。

### 启动脚本
使用```node index.js```来启动运行脚本，注意index.js为实际脚本文件，可根据实际情况进行更改。

## 注意事项
- Windows电脑在专注状态或忽扰状态下可能不会出现右下角弹窗。
- Windows在消息中心点击提醒弹窗不会自动跳转浏览器页面。
- 开始运行脚本时会逐一通知所有直播间状态，如果只想通知已开播或轮播的状态，可以把index.js文件中的room_list中的status的值设为0。

## 鸣谢
本项目基于[bilibili-live-notify](https://github.com/xuejianxianzun/bilibili-live-notify.git)进行开发，在此感谢原作者。