const fs = require('node:fs');
const https = require('node:https');

async function saveFile (url, fileName) {
  return new Promise((resolve, reject) => { // 使用 reject 处理严重错误
    // 1. 安全链接升级
    if (url.startsWith('http:')) {
      url = url.replace('http:', 'https:');
    }

    // 2. 💡 关键：下载头像也必须带上 User-Agent 伪装，否则 B 站会返回 403 
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://bilibili.com' // 防盗链的核心：告诉 B 站我是从直播域名来拿图片的
      }
    };

    https.get(url, options, (res) => {
      // 3. 💡 防御性判断：如果 B 站拒绝了请求（如 403/404），立刻停掉，防止写入假文件
      if (res.statusCode !== 200) {
        console.error(`[头像下载失败] 服务器返回状态码: ${res.statusCode}`);
        resolve(); // 或者是 reject(new Error('Status Code ' + res.statusCode));
        return;
      }

      const file = fs.createWriteStream(fileName);
      res.pipe(file);

      // 4. 💡 健壮的流关闭顺序：等待文件完全关闭后才 resolve
      file.on('close', () => {
        resolve();
      });

      // 捕获写入期间的磁盘/文件系统错误
      file.on('error', (err) => {
        file.destroy();
        console.error("文件写入错误: ", err.message);
        resolve(); // 确保不卡死主进程
      });

    }).on("error", (err) => {
      // 5. 💡 关键修正：网络连接失败时也必须显式结束 Promise，防止 await 卡死
      console.error("头像下载网络错误: ", err.message);
      resolve(); 
    });
  });
}
